"""
API endpoints для аутентификации
Слой Features - функциональность
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Response, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import validate_telegram_init_data
from ...shared.auth.jwt_auth import create_token_response, get_current_user
from ...shared.config.env_loader import config

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signin")
async def signin(
    response: Response,
    x_init_data: str = Header(..., alias="X-Init-Data"),
    user_agent: str = Header(..., alias="User-Agent"),
    session: AsyncSession = Depends(get_session)
):
    """
    Аутентификация пользователя через Telegram initData

    Headers:
        X-Init-Data: initData от Telegram WebApp
        User-Agent: User-Agent браузера

    Returns:
        Устанавливает токены в http-only cookies и возвращает успех
    """
    # Определяем платформу
    is_mobile = any(keyword in user_agent.lower() for keyword in [
        'android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos', 'blackberry'
    ])
    platform = "📱 Mobile" if is_mobile else "💻 Desktop"

    logging.info(f"{platform} 🔐 Запрос аутентификации")

    try:
        # Валидируем initData с помощью bot token
        user_data = validate_telegram_init_data(x_init_data, config.bot_token)
        logging.info(f"{platform} ✅ initData валидирован: @{user_data.get('username', 'unknown')} (ID: {user_data.get('id', 'unknown')})")

        # Аутентифицируем/создаем пользователя в БД
        from ...shared.auth.telegram_auth import authenticate_user
        user = await authenticate_user(user_data, session)
        logging.info(f"{platform} ✅ Пользователь аутентифицирован: {user.get('username', 'unknown')} (ID: {user.get('id', 'unknown')})")

        # Создаем токены
        token_response = create_token_response(user)
        logging.info(f"{platform} ✅ Созданы токены для пользователя {user.get('username', 'unknown')}")

        # Опции для установки cookies
        # Telegram WebApp загружается в iframe, поэтому нужен samesite=none
        secure_flag = True  # Обязательно для samesite=none
        same_site = "none"  # Разрешаем cookies в iframe (Telegram WebApp)

        cookies_options = {
            "httponly": True,  # Доступно только через HTTP (JS не может прочитать)
            "secure": secure_flag,  # Обязательно для samesite=none
            "samesite": same_site,  # Разрешаем cookies в cross-site iframe
            "path": "/",  # Доступно во всем домене
        }

        # Устанавливаем токены в cookies
        response.set_cookie(
            key="access_token",
            value=token_response["access_token"],
            max_age=config.jwt_access_token_expire_minutes * 60,  # в секундах
            **cookies_options
        )
        
        logging.info(f"{platform} 🍪 Установка access_token cookie:")
        logging.info(f"   - httponly: {cookies_options['httponly']}")
        logging.info(f"   - secure: {cookies_options['secure']}")
        logging.info(f"   - samesite: {cookies_options['samesite']}")
        logging.info(f"   - path: {cookies_options['path']}")
        logging.info(f"   - max_age: {config.jwt_access_token_expire_minutes * 60}s")

        response.set_cookie(
            key="refresh_token",
            value=token_response["refresh_token"],
            max_age=30 * 24 * 60 * 60,  # 30 дней в секундах
            **cookies_options
        )

        logging.info(f"{platform} 🍪 Установлены http-only cookies для пользователя {user.get('username', 'unknown')}")

        # Возвращаем токены в ответе для поддержки localStorage (Safari блокирует cookies в iframe)
        return {
            "access_token": token_response["access_token"],
            "refresh_token": token_response["refresh_token"],
            "token_type": "bearer"
        }

    except HTTPException as e:
        logging.error(f"{platform} ❌ Ошибка аутентификации: {e.detail}")
        raise e
    except Exception as e:
        logging.error(f"{platform} ❌ Критическая ошибка аутентификации: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка сервера при аутентификации")

@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновление access токена с помощью refresh токена

    Cookies:
        refresh_token: Refresh токен

    Returns:
        Новые токены в http-only cookies
    """
    logging.info("🔄 Запрос обновления токена")

    try:
        from ...shared.auth.jwt_auth import jwt_auth

        # Валидируем refresh токен
        payload = jwt_auth.decode_token(refresh_token)

        if not jwt_auth.verify_token_type(payload, "refresh"):
            raise HTTPException(status_code=401, detail="Неверный тип токена")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Неверный refresh токен")

        # Получаем пользователя из БД
        from ...shared.database.models import User
        result = await session.execute(
            User.__table__.select().where(User.id == int(user_id))
        )
        user_row = result.first()

        if not user_row:
            raise HTTPException(status_code=401, detail="Пользователь не найден")

        # Преобразуем в словарь
        user = dict(user_row)

        # Создаем новые токены
        token_response = create_token_response(user)

        # Устанавливаем новые cookies с теми же настройками что и при signin
        secure_flag = True
        same_site = "none"  # Для Telegram WebApp iframe

        response.set_cookie(
            key="access_token",
            value=token_response["access_token"],
            httponly=True,
            secure=secure_flag,
            samesite=same_site,
            max_age=config.jwt_access_token_expire_minutes * 60,
            path="/"
        )

        response.set_cookie(
            key="refresh_token",
            value=token_response["refresh_token"],
            httponly=True,
            secure=secure_flag,
            samesite=same_site,
            max_age=30 * 24 * 60 * 60,
            path="/"
        )

        logging.info(f"✅ Токены обновлены для пользователя {user.get('username', 'unknown')}")

        return {
            "message": "Токены обновлены",
            "user": user
        }

    except HTTPException as e:
        logging.error(f"❌ Ошибка обновления токена: {e.detail}")
        raise e
    except Exception as e:
        logging.error(f"❌ Критическая ошибка обновления токена: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка сервера при обновлении токена")

@router.post("/logout")
async def logout(response: Response):
    """
    Выход из системы - очистка cookies с токенами
    """
    logging.info("👋 Запрос выхода из системы")

    # Очищаем cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

    logging.info("✅ Cookies очищены, пользователь вышел из системы")

    return {"message": "Выход выполнен успешно"}

@router.get("/protected")
async def protected(
    current_user: dict = Depends(get_current_user)
):
    """
    Эндпоинт для проверки авторизации

    Returns:
        True если пользователь авторизован
    """
    logging.info(f"🔒 Проверка авторизации для пользователя {current_user.get('username', 'unknown')}")

    # Если мы дошли до этого места, значит пользователь авторизован
    # (зависимость get_current_user уже проверила токены)
    return True

@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Получение информации о текущем аутентифицированном пользователе

    Returns:
        Данные текущего пользователя
    """
    logging.info(f"👤 Запрос информации о пользователе {current_user.get('username', 'unknown')}")

    return {
        "user": current_user,
        "is_authenticated": True
    }

@router.get("/status")
async def auth_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Проверка статуса аутентификации

    Returns:
        Статус аутентификации и данные пользователя
    """
    return {
        "is_authenticated": True,
        "user": current_user,
        "token_source": current_user.get("token_source", "unknown")
    }

# Экспорт роутеров
__all__ = ["router"]
