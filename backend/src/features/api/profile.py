"""
API endpoints для профиля пользователя
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, validator
import logging
import re

from ...shared.database.models import User
from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import get_telegram_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    """Схема для обновления профиля с валидацией"""
    phone: str | None = Field(None, max_length=50, description="Номер телефона")
    business_name: str | None = Field(None, max_length=255, description="Название бизнеса")
    address: str | None = Field(None, max_length=500, description="Адрес")
    
    @validator('phone')
    def validate_phone(cls, v):
        """Валидация номера телефона"""
        if v is None or v == '':
            return v
        
        # Удаляем пробелы
        v = v.strip()
        
        # Проверяем на пустую строку после trim
        if not v:
            return None
        
        # Базовая проверка формата (цифры, +, пробелы, дефисы, скобки)
        if not re.match(r'^\+?[\d\s\-()]{10,20}$', v):
            raise ValueError('Неверный формат номера телефона. Используйте формат: +7 999 123-45-67')
        
        return v
    
    @validator('business_name', 'address')
    def validate_string_fields(cls, v):
        """Валидация текстовых полей"""
        if v is None or v == '':
            return v
        
        # Удаляем лишние пробелы
        v = v.strip()
        
        # Проверяем на пустую строку после trim
        if not v:
            return None
        
        return v

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
    
    logging.info(f"📡 Запрос профиля для пользователя {telegram_id}")
    
    # Ищем пользователя в БД
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    # Если пользователя нет - создаем
    if not user:
        logging.info(f"✨ Создание нового пользователя {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name'),
            username=telegram_user.get('username')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    
    logging.info(f"✅ Профиль получен для пользователя {telegram_id}")
    return user.to_dict()

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
    
    logging.info(f"📝 Обновление профиля для пользователя {telegram_id}")
    
    # Ищем пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Создаем пользователя, если не существует
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name'),
            username=telegram_user.get('username')
        )
        session.add(user)
    
    # Обновляем поля
    if data.phone is not None:
        user.phone = data.phone
    if data.business_name is not None:
        user.business_name = data.business_name
    if data.address is not None:
        user.address = data.address
    
    await session.commit()
    await session.refresh(user)
    
    logging.info(f"✅ Профиль обновлен для пользователя {telegram_id}")
    return user.to_dict()

