"""
API endpoints для публичного бронирования
Доступны без авторизации для клиентов
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, date
import logging
import secrets
import string

from ...shared.database.models import User, Service, Client, Appointment, WorkingHours, WorkingDay, AppointmentStatus
from ...shared.database.connection import get_session
from ...shared.utils.appointment_utils import validate_appointment_time

router = APIRouter(prefix="/booking", tags=["public-booking"])


class PublicProfileResponse(BaseModel):
    """Публичный профиль мастера"""
    business_name: Optional[str]
    first_name: str
    last_name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    avatar_url: Optional[str]
    booking_slug: str


class PublicServiceResponse(BaseModel):
    """Публичная информация об услуге"""
    id: int
    name: str
    description: Optional[str]
    price: float
    duration_minutes: int
    color: str


class PublicBookingCreate(BaseModel):
    """Создание записи от клиента"""
    service_id: int
    client_first_name: str = Field(..., min_length=2, max_length=255)
    client_last_name: Optional[str] = Field(None, max_length=255)
    client_phone: str = Field(..., min_length=10, max_length=50)
    client_email: Optional[EmailStr] = None
    appointment_date: datetime
    client_notes: Optional[str] = None


def generate_booking_slug(length: int = 8) -> str:
    """Генерация уникального slug для бронирования"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


@router.get("/{booking_slug}/profile")
async def get_public_profile(
    booking_slug: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Получить публичный профиль мастера по booking_slug
    
    Доступно без авторизации
    """
    logging.info(f"📡 GET /api/booking/{booking_slug}/profile - публичный профиль")
    
    # Находим пользователя по booking_slug
    result = await session.execute(
        select(User).where(
            User.booking_slug == booking_slug,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    
    return {
        "business_name": user.business_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "address": user.address,
        "avatar_url": user.avatar_url,
        "booking_slug": user.booking_slug
    }


@router.get("/{booking_slug}/services")
async def get_public_services(
    booking_slug: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Получить список активных услуг мастера
    
    Доступно без авторизации
    """
    logging.info(f"📡 GET /api/booking/{booking_slug}/services - публичные услуги")
    
    # Находим пользователя
    result = await session.execute(
        select(User).where(
            User.booking_slug == booking_slug,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    
    # Получаем активные услуги
    result = await session.execute(
        select(Service).where(
            Service.user_id == user.id,
            Service.is_active == True
        ).order_by(Service.name)
    )
    services = result.scalars().all()
    
    return {
        "services": [service.to_dict() for service in services]
    }


@router.get("/{booking_slug}/availability")
async def get_public_availability(
    booking_slug: str,
    date: date,
    session: AsyncSession = Depends(get_session)
):
    """
    Получить доступные временные слоты на дату
    
    Доступно без авторизации
    """
    logging.info(f"📡 GET /api/booking/{booking_slug}/availability?date={date}")
    
    # Находим пользователя
    result = await session.execute(
        select(User).where(
            User.booking_slug == booking_slug,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    
    # Получаем рабочие часы для этого дня
    day_of_week = date.weekday()  # 0 = Monday
    
    # Проверяем переопределение для конкретной даты
    result = await session.execute(
        select(WorkingDay).where(
            WorkingDay.user_id == user.id,
            WorkingDay.date == date
        )
    )
    working_day = result.scalar_one_or_none()
    
    if working_day:
        # Используем переопределение
        is_working = working_day.is_working_day
        start_time = working_day.start_time
        end_time = working_day.end_time
        break_start = working_day.break_start
        break_end = working_day.break_end
    else:
        # Используем шаблон недели
        result = await session.execute(
            select(WorkingHours).where(
                WorkingHours.user_id == user.id,
                WorkingHours.day_of_week == day_of_week
            )
        )
        working_hours = result.scalar_one_or_none()
        
        if not working_hours:
            return {
                "date": date.isoformat(),
                "is_working_day": False,
                "message": "Выходной день"
            }
        
        is_working = working_hours.is_working_day
        start_time = working_hours.start_time
        end_time = working_hours.end_time
        break_start = working_hours.break_start
        break_end = working_hours.break_end
    
    if not is_working:
        return {
            "date": date.isoformat(),
            "is_working_day": False,
            "message": "Выходной день"
        }
    
    # Получаем занятые слоты
    result = await session.execute(
        select(Appointment).where(
            Appointment.user_id == user.id,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
            Appointment.appointment_date >= datetime.combine(date, start_time),
            Appointment.appointment_date < datetime.combine(date, end_time)
        )
    )
    appointments = result.scalars().all()
    
    booked_slots = []
    for apt in appointments:
        booked_slots.append({
            "start": apt.appointment_date.isoformat(),
            "duration_minutes": apt.duration_minutes
        })
    
    return {
        "date": date.isoformat(),
        "is_working_day": True,
        "working_hours": {
            "start": start_time.isoformat() if start_time else None,
            "end": end_time.isoformat() if end_time else None
        },
        "break": {
            "start": break_start.isoformat() if break_start else None,
            "end": break_end.isoformat() if break_end else None
        } if break_start and break_end else None,
        "booked_slots": booked_slots
    }


@router.post("/{booking_slug}/book")
async def create_public_booking(
    booking_slug: str,
    booking_data: PublicBookingCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Создать запись от клиента (публичное бронирование)
    
    Доступно без авторизации
    """
    logging.info(f"📝 POST /api/booking/{booking_slug}/book - публичное бронирование")
    
    # Находим пользователя
    result = await session.execute(
        select(User).where(
            User.booking_slug == booking_slug,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    
    # Проверяем существование услуги
    result = await session.execute(
        select(Service).where(
            Service.id == booking_data.service_id,
            Service.user_id == user.id,
            Service.is_active == True
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    
    # Проверяем доступность времени
    is_valid, error_message = await validate_appointment_time(
        session=session,
        user_id=user.id,
        appointment_date=booking_data.appointment_date,
        duration_minutes=service.duration_minutes
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Ищем или создаем клиента
    result = await session.execute(
        select(Client).where(
            Client.user_id == user.id,
            Client.phone == booking_data.client_phone
        )
    )
    client = result.scalar_one_or_none()
    
    if not client:
        # Создаем нового клиента
        client = Client(
            user_id=user.id,
            first_name=booking_data.client_first_name,
            last_name=booking_data.client_last_name,
            phone=booking_data.client_phone,
            email=booking_data.client_email
        )
        session.add(client)
        await session.flush()
        logging.info(f"✨ Создан новый клиент: {client.first_name} {client.phone}")
    
    # Создаем запись
    appointment = Appointment(
        user_id=user.id,
        service_id=service.id,
        client_id=client.id,
        appointment_date=booking_data.appointment_date,
        duration_minutes=service.duration_minutes,
        price=service.price,
        client_notes=booking_data.client_notes,
        status=AppointmentStatus.PENDING  # Требует подтверждения мастером
    )
    
    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)
    
    logging.info(f"✅ Публичная запись создана: {appointment.id}")
    
    return {
        "message": "Запись успешно создана! Ожидайте подтверждения от мастера.",
        "appointment": {
            "id": appointment.id,
            "service_name": service.name,
            "appointment_date": appointment.appointment_date.isoformat(),
            "duration_minutes": appointment.duration_minutes,
            "price": appointment.price,
            "status": appointment.status.value
        }
    }


# Экспорт роутера
__all__ = ["router"]
