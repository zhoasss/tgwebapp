"""
API endpoints для управления профилями пользователей
Слой Features - функциональность
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional

from ...shared.database.models import User
from ...shared.database.connection import get_session
from ...shared.auth.jwt_auth import get_current_user

router = APIRouter(tags=["profiles"])

class ProfileUpdate(BaseModel):
    """Схема для обновления профиля"""
    phone: Optional[str] = Field(None, max_length=50, description="Номер телефона")
    business_name: Optional[str] = Field(None, max_length=255, description="Название бизнеса")
    address: Optional[str] = Field(None, description="Адрес")
    timezone: Optional[str] = Field(None, description="Часовой пояс")
    currency: Optional[str] = Field(None, max_length=10, description="Валюта")

@router.get("/")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить профиль пользователя

    Returns:
        Данные профиля пользователя
    """
    user_id = current_user['id']
    username = current_user.get('username', 'unknown')

    logging.info(f"📡 GET /profiles/ - запрос профиля для @{username} (ID: {user_id})")

    try:
        # Ищем пользователя в БД (он уже должен существовать после аутентификации)
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            logging.error(f"❌ Пользователь {user_id} не найден в БД")
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        profile_data = user.to_dict()
        logging.info(f"📤 Отправка профиля: {profile_data.get('first_name')} {profile_data.get('last_name')}")

        return profile_data

    except Exception as e:
        logging.error(f"❌ Ошибка в get_profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка получения профиля")

@router.get("/check-token")
async def check_token(
    x_init_data: str = Header(..., alias="X-Init-Data")
):
    """
    Проверка токена авторизации (упрощенная версия)

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        Информация о токене
    """
    logging.info("🔍 Запрос проверки токена")

    try:
        # Простая проверка наличия токена
        if not x_init_data or len(x_init_data) < 10:
            return {
                "status": "invalid",
                "message": "Токен отсутствует или слишком короткий",
                "token_length": len(x_init_data) if x_init_data else 0
            }

        # Пытаемся распарсить user данные
        from urllib.parse import unquote, parse_qs
        import json

        decoded_token = unquote(x_init_data)
        params = parse_qs(decoded_token)
        user_raw = params.get('user', [None])[0]

        if user_raw:
            if '%' in user_raw:
                user_raw = unquote(user_raw)
            user_data = json.loads(user_raw)

            return {
                "status": "valid",
                "message": "Токен успешно обработан",
                "user": {
                    "id": user_data.get('id'),
                    "username": user_data.get('username'),
                    "first_name": user_data.get('first_name'),
                    "last_name": user_data.get('last_name')
                },
                "token_info": {
                    "length": len(x_init_data),
                    "has_user": True,
                    "has_hash": 'hash=' in x_init_data
                }
            }
        else:
            return {
                "status": "invalid",
                "message": "Токен не содержит данные пользователя",
                "token_length": len(x_init_data)
            }

    except Exception as e:
        logging.error(f"❌ Ошибка обработки токена: {e}")
        return {
            "status": "error",
            "message": f"Ошибка обработки токена: {str(e)}",
            "token_length": len(x_init_data) if x_init_data else 0
        }

@router.get("/validate-token")
async def validate_token_only(
    x_init_data: str = Header(..., alias="X-Init-Data")
):
    """
    Только валидация токена без работы с БД

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        Результат валидации
    """
    logging.info("🔍 Запрос валидации токена (без БД)")
    logging.info(f"📋 Получен токен для анализа: {x_init_data[:200]}..." if len(x_init_data) > 200 else f"📋 Получен токен: {x_init_data}")

    try:
        # Импортируем функцию валидации
        from ...shared.auth.telegram_auth import validate_telegram_init_data
        from ...shared.config.env_loader import config

        user_data = validate_telegram_init_data(x_init_data, config.bot_token)

        return {
            "status": "valid",
            "message": "Токен успешно валидирован",
            "user": user_data
        }

    except Exception as e:
        logging.error(f"❌ Ошибка валидации токена: {e}")
        return {
            "status": "invalid",
            "message": str(e),
            "error_type": type(e).__name__,
            "token_length": len(x_init_data),
            "token_preview": x_init_data[:100] + "..." if len(x_init_data) > 100 else x_init_data
        }

@router.get("/debug-token")
async def debug_token(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    user_agent: str = Header(..., alias="User-Agent")
):
    """
    Отладка токена - показывает полную информацию без валидации

    Headers:
        X-Init-Data: initData от Telegram WebApp
        User-Agent: User-Agent браузера

    Returns:
        Полная информация о токене для отладки
    """
    # Определяем платформу
    is_mobile = any(keyword in user_agent.lower() for keyword in [
        'android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos', 'blackberry'
    ])
    platform = "📱 Mobile" if is_mobile else "💻 Desktop"

    logging.info(f"🐛 {platform} Запрос отладки токена")

    return {
        "platform": platform,
        "user_agent": user_agent[:200],
        "token_length": len(x_init_data),
        "token_preview": x_init_data[:200] + "..." if len(x_init_data) > 200 else x_init_data,
        "has_user": 'user=' in x_init_data,
        "has_hash": 'hash=' in x_init_data,
        "has_query_id": 'query_id=' in x_init_data,
        "contains_percent": '%' in x_init_data
    }

@router.put("/")
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить профиль пользователя

    Body:
        ProfileUpdate: Данные для обновления

    Returns:
        Обновленные данные профиля
    """
    user_id = current_user['id']
    username = current_user.get('username', 'unknown')

    logging.info(f"📝 PUT /profiles/ - обновление профиля @{username} (ID: {user_id})")
    logging.info(f"📊 Данные для обновления: phone={data.phone}, business={data.business_name}, address={data.address}")

    try:
        # Ищем пользователя (он должен существовать)
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            logging.error(f"❌ Пользователь {user_id} не найден в БД")
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        # Отслеживаем изменения
        changes = []
        
        if data.phone is not None:
            old_phone = user.phone
            user.phone = data.phone
            changes.append(f"phone: {old_phone} → {data.phone}")
            
        if data.business_name is not None:
            old_business = user.business_name
            user.business_name = data.business_name
            changes.append(f"business: {old_business} → {data.business_name}")
            
        if data.address is not None:
            old_address = user.address
            user.address = data.address
            changes.append(f"address: {old_address} → {data.address}")
            
        if data.timezone is not None:
            old_tz = getattr(user, 'timezone', None)
            if hasattr(user, 'timezone'):
                user.timezone = data.timezone
                changes.append(f"timezone: {old_tz} → {data.timezone}")
                
        if data.currency is not None:
            old_currency = getattr(user, 'currency', None)
            if hasattr(user, 'currency'):
                user.currency = data.currency
                changes.append(f"currency: {old_currency} → {data.currency}")

        await session.commit()
        await session.refresh(user)

        if changes:
            logging.info(f"✅ Профиль @{username} обновлен: {', '.join(changes)}")
        else:
            logging.info(f"ℹ️ Профиль @{username} без изменений")

        return user.to_dict()

    except Exception as e:
        logging.error(f"❌ Ошибка обновления профиля: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка обновления профиля")

@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить информацию о текущем аутентифицированном пользователе

    Returns:
        Данные текущего пользователя
    """
    user_id = current_user['id']
    logging.info(f"👤 Запрос информации о пользователе {user_id}")

    try:
        # Пользователь уже найден через JWT, просто возвращаем данные
        return {
            "user": current_user,
            "is_authenticated": True
        }

    except Exception as e:
        logging.error(f"❌ Ошибка получения информации о пользователе: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка получения информации о пользователе")

@router.post("/generate-booking-link")
async def generate_booking_link(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Генерировать уникальную ссылку для публичного бронирования
    
    Returns:
        Данные профиля с новым booking_slug
    """
    import secrets
    import string
    
    user_id = current_user['id']
    logging.info(f"🔗 POST /profiles/generate-booking-link - генерация ссылки для пользователя {user_id}")
    
    try:
        # Находим пользователя
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Генерируем уникальный slug
        max_attempts = 10
        for attempt in range(max_attempts):
            # Генерируем случайный slug (8 символов)
            chars = string.ascii_lowercase + string.digits
            new_slug = ''.join(secrets.choice(chars) for _ in range(8))
            
            # Проверяем уникальность
            result = await session.execute(
                select(User).where(User.booking_slug == new_slug)
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                # Slug уникален, используем его
                user.booking_slug = new_slug
                await session.commit()
                await session.refresh(user)
                
                logging.info(f"✅ Сгенерирован booking_slug: {new_slug}")
                
                return {
                    "message": "Ссылка для бронирования создана",
                    "booking_slug": new_slug,
                    "booking_url": f"https://booking-cab.ru/booking/{new_slug}",
                    "profile": user.to_dict()
                }
        
        # Не удалось сгенерировать уникальный slug за 10 попыток
        raise HTTPException(status_code=500, detail="Не удалось сгенерировать уникальную ссылку")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Ошибка генерации booking_slug: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка генерации ссылки")

@router.delete("/booking-link")
async def delete_booking_link(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Удалить ссылку для публичного бронирования
    
    Returns:
        Подтверждение удаления
    """
    user_id = current_user['id']
    logging.info(f"🗑️ DELETE /profiles/booking-link - удаление ссылки для пользователя {user_id}")
    
    try:
        # Находим пользователя
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Удаляем booking_slug
        user.booking_slug = None
        await session.commit()
        
        logging.info(f"✅ Booking_slug удален для пользователя {user_id}")
        
        return {
            "message": "Ссылка для бронирования удалена",
            "booking_slug": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Ошибка удаления booking_slug: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка удаления ссылки")

@router.get("/debug")
async def debug_profile():
    """
    Временный endpoint для тестирования API без авторизации
    """
    return {
        "status": "ok",
        "message": "API работает корректно",
        "timestamp": "2025-01-01T12:00:00Z",
        "debug_info": {
            "endpoint": "/api/debug",
            "auth_required": False
        }
    }

# Экспорт роутеров
__all__ = ["router"]