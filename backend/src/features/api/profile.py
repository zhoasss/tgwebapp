"""
API endpoints для профиля пользователя
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import logging

from ...shared.database.models import User
from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import get_telegram_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    """Схема для обновления профиля"""
    phone: str | None = None
    business_name: str | None = None
    address: str | None = None

@router.get("/")
async def get_profile(
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить профиль пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        Данные профиля пользователя
    """
    telegram_id = telegram_user['id']
    username = telegram_user.get('username', 'unknown')

    logging.info(f"📡 GET /api/profile/ - запрос профиля для @{username} (ID: {telegram_id})")

    # Ищем пользователя в БД
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем
    if not user:
        logging.info(f"✨ Создание нового профиля для @{username} (ID: {telegram_id})")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name'),
            username=username
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый профиль создан для @{username}")
    else:
        logging.info(f"📋 Найден существующий профиль @{username}")

    profile_data = user.to_dict()
    logging.info(f"📤 Отправка профиля: {profile_data.get('first_name')} {profile_data.get('last_name')}")
    return profile_data

@router.put("/")
async def update_profile(
    data: ProfileUpdate,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить профиль пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Body:
        ProfileUpdate: Данные для обновления

    Returns:
        Обновленные данные профиля
    """
    telegram_id = telegram_user['id']
    username = telegram_user.get('username', 'unknown')

    logging.info(f"📝 PUT /api/profile/ - обновление профиля @{username} (ID: {telegram_id})")
    logging.info(f"📊 Данные для обновления: phone={data.phone}, business={data.business_name}, address={data.address}")

    # Ищем пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Создаем пользователя, если не существует
        logging.warning(f"⚠️ Пользователь @{username} не найден, создаем новый")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name'),
            username=username
        )
        session.add(user)

    # Обновляем поля
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

    await session.commit()
    await session.refresh(user)

    if changes:
        logging.info(f"✅ Профиль @{username} обновлен: {', '.join(changes)}")
    else:
        logging.info(f"ℹ️ Профиль @{username} без изменений")

    return user.to_dict()

# Экспорт роутеров
__all__ = ["router"]