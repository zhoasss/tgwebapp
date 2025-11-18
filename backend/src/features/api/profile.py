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
from ...shared.auth.telegram_auth import get_telegram_user, get_current_user
from pydantic import BaseModel
from fastapi import HTTPException, status
import hashlib
import secrets

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    """Схема для регистрации пользователя"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)

class LoginRequest(BaseModel):
    """Схема для входа пользователя"""
    username: str
    password: str

class AuthResponse(BaseModel):
    """Ответ при успешной аутентификации"""
    user_id: int
    username: str
    token: str

@auth_router.post("/register", response_model=AuthResponse)
async def register_user(request: RegisterRequest, session: AsyncSession = Depends(get_session)):
    """Регистрация нового пользователя"""
    logging.info(f"📝 Регистрация пользователя: {request.username}")

    # Проверяем, существует ли пользователь
    result = await session.execute(
        select(User).where(User.username == request.username)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )

    # Создаем нового пользователя
    hashed_password = hashlib.sha256(request.password.encode()).hexdigest()
    token = secrets.token_hex(32)

    user = User(
        username=request.username,
        password_hash=hashed_password,
        token=token,
        first_name=request.username,
        last_name="",
        telegram_id=None  # Для обычных пользователей telegram_id = None
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    logging.info(f"✅ Пользователь зарегистрирован: {request.username} (ID: {user.id})")

    return AuthResponse(
        user_id=user.id,
        username=user.username,
        token=user.token
    )

@auth_router.post("/login", response_model=AuthResponse)
async def login_user(request: LoginRequest, session: AsyncSession = Depends(get_session)):
    """Вход пользователя"""
    logging.info(f"🔐 Попытка входа: {request.username}")

    # Ищем пользователя
    result = await session.execute(
        select(User).where(User.username == request.username)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль"
        )

    # Проверяем пароль
    hashed_password = hashlib.sha256(request.password.encode()).hexdigest()
    if user.password_hash != hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль"
        )

    # Генерируем новый токен при каждом входе
    user.token = secrets.token_hex(32)
    await session.commit()

    logging.info(f"✅ Успешный вход: {request.username} (ID: {user.id})")

    return AuthResponse(
        user_id=user.id,
        username=user.username,
        token=user.token
    )

# Profile роутер
profile_router = APIRouter(prefix="/api/profile", tags=["profile"])

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

@profile_router.get("/")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить профиль пользователя

    Headers:
        Authorization: Bearer token

    Returns:
        Данные профиля пользователя
    """
    user_id = current_user['id']

    logging.info(f"📡 Запрос профиля для пользователя {user_id}")

    # Ищем пользователя в БД по id
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logging.error(f"❌ Пользователь {user_id} не найден")
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    logging.info(f"✅ Профиль получен для пользователя {user_id}")
    return user.to_dict()

@profile_router.put("/")
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить профиль пользователя

    Headers:
        Authorization: Bearer token

    Body:
        ProfileUpdate: Данные для обновления

    Returns:
        Обновленные данные профиля
    """
    user_id = current_user['id']

    logging.info(f"📝 Обновление профиля для пользователя {user_id}")

    # Ищем пользователя по id
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logging.error(f"❌ Пользователь {user_id} не найден")
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Обновляем поля
    if data.phone is not None:
        user.phone = data.phone
    if data.business_name is not None:
        user.business_name = data.business_name
    if data.address is not None:
        user.address = data.address

    await session.commit()
    await session.refresh(user)

    logging.info(f"✅ Профиль обновлен для пользователя {user_id}")
    return user.to_dict()

