"""
API endpoints для управления записями/бронированиями
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, time
import logging

from ...shared.database.models import Appointment, User, Service, Client, AppointmentStatus
from ...shared.database.connection import get_session
from ...shared.auth.jwt_auth import get_current_user
from ...shared.utils.appointment_utils import validate_appointment_time, check_appointment_overlap

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentCreate(BaseModel):
    """Схема создания записи"""
    service_id: int = Field(..., description="ID услуги")
    client_id: int = Field(..., description="ID клиента")
    appointment_date: datetime = Field(..., description="Дата и время записи")
    duration_minutes: Optional[int] = Field(None, gt=0, le=1440, description="Продолжительность в минутах")
    notes: Optional[str] = Field(None, description="Заметки к записи")
    client_notes: Optional[str] = Field(None, description="Заметки клиента")
    price: Optional[float] = Field(None, gt=0, description="Цена (если отличается от базовой)")

class AppointmentUpdate(BaseModel):
    """Схема обновления записи"""
    service_id: Optional[int] = Field(None, description="ID услуги")
    client_id: Optional[int] = Field(None, description="ID клиента")
    appointment_date: Optional[datetime] = Field(None, description="Дата и время записи")
    duration_minutes: Optional[int] = Field(None, gt=0, le=1440, description="Продолжительность в минутах")
    status: Optional[str] = Field(None, description="Статус записи")
    notes: Optional[str] = Field(None, description="Заметки к записи")
    client_notes: Optional[str] = Field(None, description="Заметки клиента")
    price: Optional[float] = Field(None, gt=0, description="Цена (если отличается от базовой)")

@router.get("/")
async def get_appointments(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Получить список записей пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Query Parameters:
        status: Фильтр по статусу (pending, confirmed, cancelled, completed)
        date_from: Дата начала (YYYY-MM-DD)
        date_to: Дата окончания (YYYY-MM-DD)
        limit: Максимальное количество результатов
        offset: Смещение для пагинации

    Returns:
        Список записей пользователя
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📡 GET /api/appointments/ - запрос записей для пользователя {telegram_id}")

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
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Строим запрос с eager loading для связанных объектов
    from sqlalchemy.orm import joinedload
    
    query = select(Appointment).options(
        joinedload(Appointment.service),
        joinedload(Appointment.client)
    ).where(Appointment.user_id == user.id)

    # Добавляем фильтры
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.where(Appointment.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный статус записи")

    if date_from:
        query = query.where(func.date(Appointment.appointment_date) >= date_from)
    if date_to:
        query = query.where(func.date(Appointment.appointment_date) <= date_to)

    # Добавляем сортировку и пагинацию
    query = query.order_by(Appointment.appointment_date.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    appointments = result.scalars().unique().all()

    # Получаем общее количество
    count_query = select(func.count(Appointment.id)).where(Appointment.user_id == user.id)
    if status:
        count_query = count_query.where(Appointment.status == status_enum)
    if date_from:
        count_query = count_query.where(func.date(Appointment.appointment_date) >= date_from)
    if date_to:
        count_query = count_query.where(func.date(Appointment.appointment_date) <= date_to)

    total_result = await session.execute(count_query)
    total = total_result.scalar()

    return {
        "appointments": [appointment.to_dict() for appointment in appointments],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("/")
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Создать новую запись

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Body:
        AppointmentCreate: Данные новой записи

    Returns:
        Созданная запись
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📝 POST /api/appointments/ - создание записи для пользователя {telegram_id}")

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
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Проверяем существование услуги
    result = await session.execute(
        select(Service).where(
            Service.id == appointment_data.service_id,
            Service.user_id == user.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    # Проверяем существование клиента
    result = await session.execute(
        select(Client).where(
            Client.id == appointment_data.client_id,
            Client.user_id == user.id
        )
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Определяем продолжительность и цену
    duration = appointment_data.duration_minutes or service.duration_minutes
    price = appointment_data.price or service.price

    # Проверяем доступность времени и пересечения
    is_valid, error_message = await validate_appointment_time(
        session=session,
        user_id=user.id,
        appointment_date=appointment_data.appointment_date,
        duration_minutes=duration
    )
    
    if not is_valid:
        logging.warning(f"⚠️ Ошибка валидации времени: {error_message}")
        raise HTTPException(status_code=400, detail=error_message)

    # Создаем запись

    appointment = Appointment(
        user_id=user.id,
        service_id=appointment_data.service_id,
        client_id=appointment_data.client_id,
        appointment_date=appointment_data.appointment_date,
        duration_minutes=duration,
        notes=appointment_data.notes,
        client_notes=appointment_data.client_notes,
        price=price
    )

    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)

    logging.info(f"✅ Запись создана на {appointment.appointment_date}")
    return appointment.to_dict()

@router.get("/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить конкретную запись

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        appointment_id: ID записи

    Returns:
        Данные записи
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📡 GET /api/appointments/{appointment_id} - запрос записи {appointment_id}")

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
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим запись с eager loading
    from sqlalchemy.orm import joinedload
    
    result = await session.execute(
        select(Appointment).options(
            joinedload(Appointment.service),
            joinedload(Appointment.client)
        ).where(
            Appointment.id == appointment_id,
            Appointment.user_id == user.id
        )
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    return appointment.to_dict()

@router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить запись

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        appointment_id: ID записи

    Body:
        AppointmentUpdate: Данные для обновления

    Returns:
        Обновленная запись
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📝 PUT /api/appointments/{appointment_id} - обновление записи {appointment_id}")

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
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим запись с eager loading
    from sqlalchemy.orm import joinedload
    
    result = await session.execute(
        select(Appointment).options(
            joinedload(Appointment.service),
            joinedload(Appointment.client)
        ).where(
            Appointment.id == appointment_id,
            Appointment.user_id == user.id
        )
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    # Обновляем поля
    update_data = appointment_data.dict(exclude_unset=True)

    # Проверяем статус
    if 'status' in update_data:
        try:
            update_data['status'] = AppointmentStatus(update_data['status'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный статус записи")

    # Проверяем связанные объекты, если они обновляются
    if 'service_id' in update_data:
        result = await session.execute(
            select(Service).where(
                Service.id == update_data['service_id'],
                Service.user_id == user.id
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Услуга не найдена")

    if 'client_id' in update_data:
        result = await session.execute(
            select(Client).where(
                Client.id == update_data['client_id'],
                Client.user_id == user.id
            )
        )
        client = result.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")

    # Проверяем пересечения, если изменяется время или продолжительность
    if 'appointment_date' in update_data or 'duration_minutes' in update_data:
        new_date = update_data.get('appointment_date', appointment.appointment_date)
        new_duration = update_data.get('duration_minutes', appointment.duration_minutes)
        
        is_valid, error_message = await validate_appointment_time(
            session=session,
            user_id=user.id,
            appointment_date=new_date,
            duration_minutes=new_duration,
            exclude_appointment_id=appointment_id
        )
        
        if not is_valid:
            logging.warning(f"⚠️ Ошибка валидации времени при обновлении: {error_message}")
            raise HTTPException(status_code=400, detail=error_message)

    for field, value in update_data.items():
        setattr(appointment, field, value)

    await session.commit()
    await session.refresh(appointment)

    logging.info(f"✅ Запись {appointment_id} обновлена")
    return appointment.to_dict()

@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Удалить запись

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        appointment_id: ID записи

    Returns:
        Сообщение об успешном удалении
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"🗑️ DELETE /api/appointments/{appointment_id} - удаление записи {appointment_id}")

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
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим запись
    result = await session.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == user.id
        )
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    await session.delete(appointment)
    await session.commit()

    logging.info(f"✅ Запись {appointment_id} удалена")
    return {"message": "Запись успешно удалена"}

# Экспорт роутеров
__all__ = ["router"]
