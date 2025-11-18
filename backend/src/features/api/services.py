"""
API endpoints для управления услугами
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from ...shared.database.models import Service, User
from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import get_telegram_user

router = APIRouter(prefix="/services", tags=["services"])

class ServiceCreate(BaseModel):
    """Схема создания услуги"""
    name: str = Field(..., min_length=1, max_length=255, description="Название услуги")
    description: Optional[str] = Field(None, description="Описание услуги")
    price: float = Field(..., gt=0, description="Цена услуги")
    duration_minutes: int = Field(..., gt=0, le=1440, description="Продолжительность в минутах")
    color: str = Field("#4CAF50", pattern=r'^#[0-9A-Fa-f]{6}$', description="Цвет для UI (hex)")

class ServiceUpdate(BaseModel):
    """Схема обновления услуги"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Название услуги")
    description: Optional[str] = Field(None, description="Описание услуги")
    price: Optional[float] = Field(None, gt=0, description="Цена услуги")
    duration_minutes: Optional[int] = Field(None, gt=0, le=1440, description="Продолжительность в минутах")
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Цвет для UI (hex)")
    is_active: Optional[bool] = Field(None, description="Активна ли услуга")

@router.get("/")
async def get_services(
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить список услуг пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        Список услуг пользователя
    """
    telegram_id = telegram_user['id']
    logging.info(f"📡 GET /api/services/ - запрос услуг для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Получаем услуги пользователя
    result = await session.execute(
        select(Service).where(Service.user_id == user.id).order_by(Service.created_at.desc())
    )
    services = result.scalars().all()

    return {
        "services": [service.to_dict() for service in services],
        "total": len(services)
    }

@router.post("/")
async def create_service(
    service_data: ServiceCreate,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Создать новую услугу

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Body:
        ServiceCreate: Данные новой услуги

    Returns:
        Созданная услуга
    """
    telegram_id = telegram_user['id']
    logging.info(f"📝 POST /api/services/ - создание услуги для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Создаем услугу
    service = Service(
        user_id=user.id,
        name=service_data.name,
        description=service_data.description,
        price=service_data.price,
        duration_minutes=service_data.duration_minutes,
        color=service_data.color
    )

    session.add(service)
    await session.commit()
    await session.refresh(service)

    logging.info(f"✅ Услуга '{service.name}' создана для пользователя {telegram_id}")
    return service.to_dict()

@router.get("/{service_id}")
async def get_service(
    service_id: int,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить конкретную услугу

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        service_id: ID услуги

    Returns:
        Данные услуги
    """
    telegram_id = telegram_user['id']
    logging.info(f"📡 GET /api/services/{service_id} - запрос услуги {service_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим услугу
    result = await session.execute(
        select(Service).where(
            Service.id == service_id,
            Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    return service.to_dict()

@router.put("/{service_id}")
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить услугу

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        service_id: ID услуги

    Body:
        ServiceUpdate: Данные для обновления

    Returns:
        Обновленная услуга
    """
    telegram_id = telegram_user['id']
    logging.info(f"📝 PUT /api/services/{service_id} - обновление услуги {service_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим услугу
    result = await session.execute(
        select(Service).where(
            Service.id == service_id,
            Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    # Обновляем поля
    update_data = service_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    await session.commit()
    await session.refresh(service)

    logging.info(f"✅ Услуга '{service.name}' обновлена")
    return service.to_dict()

@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Удалить услугу

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        service_id: ID услуги

    Returns:
        Сообщение об успешном удалении
    """
    telegram_id = telegram_user['id']
    logging.info(f"🗑️ DELETE /api/services/{service_id} - удаление услуги {service_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим услугу
    result = await session.execute(
        select(Service).where(
            Service.id == service_id,
            Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    # Проверяем, есть ли активные записи на эту услугу
    result = await session.execute(
        select(Service).where(
            Service.id == service_id,
            Service.user_id == user.id
        )
    )
    # TODO: Добавить проверку активных записей перед удалением

    await session.delete(service)
    await session.commit()

    logging.info(f"✅ Услуга '{service.name}' удалена")
    return {"message": "Услуга успешно удалена"}

# Экспорт роутеров
__all__ = ["router"]
