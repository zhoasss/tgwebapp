"""
API endpoints для аутентификации
Слой Features - функциональность
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import validate_telegram_init_data
from ...shared.auth.jwt_auth import create_token_response, get_current_user
from ...shared.config.env_loader import config

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(
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
        Данные пользователя и устанавливает токены в http-only cookies
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

        # Устанавливаем http-only secure cookies
        secure_flag = not config.is_development  # В разработке без secure для localhost
        same_site = "strict" if config.is_production else "lax"

        response.set_cookie(
            key="access_token",
            value=token_response["access_token"],
            httponly=True,
            secure=secure_flag,
            samesite=same_site,
            max_age=config.jwt_access_token_expire_minutes * 60,  # в секундах
            path="/"
        )

        response.set_cookie(
            key="refresh_token",
            value=token_response["refresh_token"],
            httponly=True,
            secure=secure_flag,
            samesite=same_site,
            max_age=30 * 24 * 60 * 60,  # 30 дней в секундах
            path="/"
        )

        logging.info(f"{platform} 🍪 Установлены http-only cookies для пользователя {user.get('username', 'unknown')}")

        # Возвращаем данные пользователя (без токенов в JSON)
        return {
            "user": token_response["user"],
            "message": "Аутентификация успешна",
            "platform": platform.replace("📱 ", "").replace("💻 ", "")
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

        # Устанавливаем новые cookies
        secure_flag = not config.is_development
        same_site = "strict" if config.is_production else "lax"

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
