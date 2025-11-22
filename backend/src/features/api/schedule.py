"""
API endpoints для управления графиком работы
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import time, datetime, timedelta
import datetime as dt
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from ...shared.database.models import WorkingHours, User, WorkingDay
from ...shared.database.connection import get_session
from ...shared.auth.jwt_auth import get_current_user

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

@router.get("")
async def get_working_hours(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить график работы пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Returns:
        График работы по дням недели
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📡 GET /api/schedule/ - запрос графика для пользователя {telegram_id}")

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

    # Получаем график работы
    result = await session.execute(
        select(WorkingHours).where(WorkingHours.user_id == user.id).order_by(WorkingHours.day_of_week)
    )
    working_hours = result.scalars().all()

    # Получаем конкретные рабочие дни
    result = await session.execute(
        select(WorkingDay).where(WorkingDay.user_id == user.id)
    )
    working_days = result.scalars().all()

    # Если график не настроен, возвращаем пустой
    if not working_hours and not working_days:
        return {"working_hours": [], "working_days": []}

    return {
        "working_hours": [wh.to_dict() for wh in working_hours],
        "working_days": [wd.to_dict() for wd in working_days]
    }

@router.put("")
async def update_working_hours_bulk(
    schedule_data: WorkingHoursBulkUpdate,
    current_user: dict = Depends(get_current_user),
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
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📝 PUT /api/schedule/ - обновление графика для пользователя {telegram_id}")

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

class WorkingDayUpdate(BaseModel):
    """Схема обновления конкретного дня"""
    date: dt.date = Field(..., description="Дата")
    start_time: Optional[time] = Field(None, description="Время начала")
    end_time: Optional[time] = Field(None, description="Время окончания")
    is_working_day: bool = Field(True, description="Рабочий ли день")
    break_start: Optional[time] = Field(None, description="Начало перерыва")
    break_end: Optional[time] = Field(None, description="Конец перерыва")

class WorkingDaysBulkUpdate(BaseModel):
    """Схема массового обновления конкретных дней"""
    working_days: List[WorkingDayUpdate] = Field(..., description="Список дней")

@router.put("/days")
async def update_working_days_bulk(
    schedule_data: WorkingDaysBulkUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Массово обновить конкретные рабочие дни (исключения)
    """
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📝 PUT /api/schedule/days - обновление дней для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # Создаем пользователя если нет (хотя по идее должен быть)
        user = User(telegram_id=telegram_id, first_name=current_user.get('first_name', 'User'))
        session.add(user)
        await session.commit()
        await session.refresh(user)

    updated_days = []
    
    for day_data in schedule_data.working_days:
        # Проверяем, есть ли уже запись на этот день
        result = await session.execute(
            select(WorkingDay).where(
                WorkingDay.user_id == user.id,
                WorkingDay.date == day_data.date
            )
        )
        existing_day = result.scalar_one_or_none()

        if existing_day:
            # Обновляем
            existing_day.is_working_day = day_data.is_working_day
            existing_day.start_time = day_data.start_time
            existing_day.end_time = day_data.end_time
            existing_day.break_start = day_data.break_start
            existing_day.break_end = day_data.break_end
            updated_days.append(existing_day)
        else:
            # Создаем новый
            new_day = WorkingDay(
                user_id=user.id,
                date=day_data.date,
                is_working_day=day_data.is_working_day,
                start_time=day_data.start_time,
                end_time=day_data.end_time,
                break_start=day_data.break_start,
                break_end=day_data.break_end
            )
            session.add(new_day)
            updated_days.append(new_day)

    await session.commit()
    
    return {
        "working_days": [d.to_dict() for d in updated_days],
        "message": "Дни успешно обновлены"
    }

@router.get("/availability")
async def get_availability(
    date: str,
    current_user: dict = Depends(get_current_user),
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
    user_id = current_user['id']
    telegram_id = current_user['telegram_id']
    logging.info(f"📡 GET /api/schedule/availability - запрос доступности на {date}")

    try:
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
