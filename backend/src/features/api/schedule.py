"""
API endpoints для управления графиком работы
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import time
import logging

from ...shared.database.models import WorkingHours, User
from ...shared.database.connection import get_session
from ...shared.auth.telegram_auth import get_telegram_user

router = APIRouter(prefix="/schedule", tags=["schedule"])

class WorkingHoursUpdate(BaseModel):
    """Схема обновления рабочего графика"""
    day_of_week: int = Field(..., ge=0, le=6, description="День недели (0=понедельник, 6=воскресенье)")
    start_time: time = Field(..., description="Время начала работы")
    end_time: time = Field(..., description="Время окончания работы")
    is_working_day: bool = Field(True, description="Рабочий ли день")
    break_start: Optional[time] = Field(None, description="Начало перерыва")
    break_end: Optional[time] = Field(None, description="Конец перерыва")

class WorkingHoursBulkUpdate(BaseModel):
    """Схема массового обновления рабочего графика"""
    working_hours: List[WorkingHoursUpdate] = Field(..., description="Список рабочих дней")

@router.get("/")
async def get_working_hours(
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить график работы пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        График работы по дням недели
    """
    telegram_id = telegram_user['id']
    logging.info(f"📡 GET /api/schedule/ - запрос графика для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Получаем график работы
    result = await session.execute(
        select(WorkingHours).where(WorkingHours.user_id == user.id).order_by(WorkingHours.day_of_week)
    )
    working_hours = result.scalars().all()

    # Если график не настроен, возвращаем пустой
    if not working_hours:
        return {"working_hours": []}

    return {
        "working_hours": [wh.to_dict() for wh in working_hours]
    }

@router.put("/")
async def update_working_hours_bulk(
    schedule_data: WorkingHoursBulkUpdate,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Массово обновить график работы

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Body:
        WorkingHoursBulkUpdate: Новый график работы

    Returns:
        Обновленный график работы
    """
    telegram_id = telegram_user['id']
    logging.info(f"📝 PUT /api/schedule/ - обновление графика для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Удаляем существующий график
    await session.execute(
        WorkingHours.__table__.delete().where(WorkingHours.user_id == user.id)
    )

    # Создаем новый график
    working_hours_objects = []
    for wh_data in schedule_data.working_hours:
        # Валидируем время
        if wh_data.start_time >= wh_data.end_time:
            raise HTTPException(
                status_code=400,
                detail=f"Время начала должно быть раньше времени окончания для дня {wh_data.day_of_week}"
            )

        if wh_data.break_start and wh_data.break_end:
            if wh_data.break_start >= wh_data.break_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"Время начала перерыва должно быть раньше времени окончания для дня {wh_data.day_of_week}"
                )
            if not (wh_data.start_time <= wh_data.break_start <= wh_data.end_time):
                raise HTTPException(
                    status_code=400,
                    detail=f"Перерыв должен быть в рамках рабочего времени для дня {wh_data.day_of_week}"
                )
            if not (wh_data.start_time <= wh_data.break_end <= wh_data.end_time):
                raise HTTPException(
                    status_code=400,
                    detail=f"Перерыв должен быть в рамках рабочего времени для дня {wh_data.day_of_week}"
                )

        working_hour = WorkingHours(
            user_id=user.id,
            day_of_week=wh_data.day_of_week,
            start_time=wh_data.start_time,
            end_time=wh_data.end_time,
            is_working_day=wh_data.is_working_day,
            break_start=wh_data.break_start,
            break_end=wh_data.break_end
        )
        working_hours_objects.append(working_hour)
        session.add(working_hour)

    await session.commit()

    # Обновляем объекты для возврата
    for wh in working_hours_objects:
        await session.refresh(wh)

    logging.info(f"✅ График работы обновлен для пользователя {telegram_id}")
    return {
        "working_hours": [wh.to_dict() for wh in working_hours_objects],
        "message": "График работы успешно обновлен"
    }

@router.get("/availability")
async def get_availability(
    date: str,
    telegram_user: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить доступные временные слоты на указанную дату

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Query Parameters:
        date: Дата в формате YYYY-MM-DD

    Returns:
        Доступные временные слоты
    """
    telegram_id = telegram_user['id']
    logging.info(f"📡 GET /api/schedule/availability - запрос доступности на {date}")

    try:
        from datetime import datetime, timedelta
        check_date = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")

    # Определяем день недели (0=понедельник, 6=воскресенье)
    day_of_week = check_date.weekday()

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Получаем настройки рабочего дня
    result = await session.execute(
        select(WorkingHours).where(
            WorkingHours.user_id == user.id,
            WorkingHours.day_of_week == day_of_week
        )
    )
    working_hours = result.scalar_one_or_none()

    if not working_hours or not working_hours.is_working_day:
        return {
            "date": date,
            "is_working_day": False,
            "available_slots": []
        }

    # Получаем существующие записи на эту дату
    from sqlalchemy import func
    result = await session.execute(
        select(Appointment).where(
            Appointment.user_id == user.id,
            func.date(Appointment.appointment_date) == check_date,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
        ).order_by(Appointment.appointment_date)
    )
    appointments = result.scalars().all()

    # Генерируем доступные слоты (упрощенная версия - каждый час)
    # TODO: Учитывать продолжительность услуг и перерывы
    available_slots = []
    current_time = working_hours.start_time

    while current_time < working_hours.end_time:
        slot_datetime = datetime.combine(check_date, current_time)

        # Проверяем, не попадает ли слот в перерыв
        is_in_break = False
        if working_hours.break_start and working_hours.break_end:
            if working_hours.break_start <= current_time < working_hours.break_end:
                is_in_break = True

        # Проверяем, не пересекается ли слот с существующими записями
        is_conflicting = False
        for appointment in appointments:
            appointment_end = appointment.appointment_date + timedelta(minutes=appointment.duration_minutes)
            slot_end = slot_datetime + timedelta(hours=1)  # Предполагаем 1-часовые слоты

            if (appointment.appointment_date <= slot_datetime < appointment_end) or \
               (slot_datetime <= appointment.appointment_date < slot_end):
                is_conflicting = True
                break

        if not is_in_break and not is_conflicting:
            available_slots.append({
                "start_time": current_time.isoformat(),
                "end_time": (slot_datetime + timedelta(hours=1)).time().isoformat()
            })

        current_time = (slot_datetime + timedelta(hours=1)).time()

    return {
        "date": date,
        "is_working_day": True,
        "working_hours": working_hours.to_dict(),
        "available_slots": available_slots,
        "existing_appointments": len(appointments)
    }

# Экспорт роутеров
__all__ = ["router"]
