"""
Утилиты для работы с записями
Проверка пересечений, валидация времени и т.д.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import Appointment, AppointmentStatus


async def check_appointment_overlap(
    session: AsyncSession,
    user_id: int,
    appointment_date: datetime,
    duration_minutes: int,
    exclude_appointment_id: Optional[int] = None
) -> Optional[Appointment]:
    """
    Проверяет, не пересекается ли новая запись с существующими
    
    Args:
        session: Сессия БД
        user_id: ID пользователя
        appointment_date: Дата и время начала записи
        duration_minutes: Продолжительность в минутах
        exclude_appointment_id: ID записи, которую нужно исключить из проверки (для редактирования)
    
    Returns:
        Appointment: Пересекающаяся запись, если найдена
        None: Если пересечений нет
    """
    # Вычисляем время окончания новой записи
    end_time = appointment_date + timedelta(minutes=duration_minutes)
    
    # Строим запрос для поиска пересечений
    # Запись пересекается, если:
    # 1. Новая запись начинается во время существующей
    # 2. Новая запись заканчивается во время существующей
    # 3. Новая запись полностью охватывает существующую
    # 4. Существующая запись полностью охватывает новую
    
    query = select(Appointment).where(
        Appointment.user_id == user_id,
        # Учитываем только активные записи (не отмененные и не завершенные)
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
        # Проверка пересечений по времени
        or_(
            # Новая запись начинается во время существующей
            and_(
                Appointment.appointment_date <= appointment_date,
                # SQLAlchemy не поддерживает прямое сложение с timedelta в запросах
                # Поэтому используем SQL выражение
                appointment_date < Appointment.appointment_date + timedelta(minutes=1) * Appointment.duration_minutes
            ),
            # Новая запись заканчивается во время существующей
            and_(
                Appointment.appointment_date < end_time,
                end_time <= Appointment.appointment_date + timedelta(minutes=1) * Appointment.duration_minutes
            ),
            # Новая запись полностью охватывает существующую
            and_(
                appointment_date <= Appointment.appointment_date,
                Appointment.appointment_date + timedelta(minutes=1) * Appointment.duration_minutes <= end_time
            )
        )
    )
    
    # Исключаем текущую запись при редактировании
    if exclude_appointment_id:
        query = query.where(Appointment.id != exclude_appointment_id)
    
    result = await session.execute(query)
    overlapping = result.scalars().first()
    
    return overlapping


async def validate_appointment_time(
    session: AsyncSession,
    user_id: int,
    appointment_date: datetime,
    duration_minutes: int,
    exclude_appointment_id: Optional[int] = None
) -> tuple[bool, Optional[str]]:
    """
    Валидация времени записи
    
    Args:
        session: Сессия БД
        user_id: ID пользователя
        appointment_date: Дата и время начала записи
        duration_minutes: Продолжительность в минутах
        exclude_appointment_id: ID записи для исключения (при редактировании)
    
    Returns:
        tuple: (is_valid, error_message)
            - is_valid: True если время валидно
            - error_message: Сообщение об ошибке или None
    """
    # Проверка 1: Запись не в прошлом
    if appointment_date < datetime.now():
        return False, "Нельзя создать запись в прошлом"
    
    # Проверка 2: Продолжительность положительная
    if duration_minutes <= 0:
        return False, "Продолжительность должна быть больше 0"
    
    # Проверка 3: Разумная продолжительность (не больше 8 часов)
    if duration_minutes > 480:
        return False, "Продолжительность не может превышать 8 часов"
    
    # Проверка 4: Пересечение с другими записями
    overlapping = await check_appointment_overlap(
        session=session,
        user_id=user_id,
        appointment_date=appointment_date,
        duration_minutes=duration_minutes,
        exclude_appointment_id=exclude_appointment_id
    )
    
    if overlapping:
        overlap_end = overlapping.appointment_date + timedelta(minutes=overlapping.duration_minutes)
        return False, (
            f"Время пересекается с существующей записью: "
            f"{overlapping.appointment_date.strftime('%d.%m.%Y %H:%M')} - "
            f"{overlap_end.strftime('%H:%M')} "
            f"(Клиент: {overlapping.client.first_name if overlapping.client else 'Неизвестен'})"
        )
    
    return True, None


def format_appointment_time_range(appointment_date: datetime, duration_minutes: int) -> str:
    """
    Форматирует временной диапазон записи
    
    Args:
        appointment_date: Дата и время начала
        duration_minutes: Продолжительность в минутах
    
    Returns:
        str: Отформатированная строка, например "14:00 - 15:30"
    """
    end_time = appointment_date + timedelta(minutes=duration_minutes)
    return f"{appointment_date.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"


def calculate_appointment_end_time(appointment_date: datetime, duration_minutes: int) -> datetime:
    """
    Вычисляет время окончания записи
    
    Args:
        appointment_date: Дата и время начала
        duration_minutes: Продолжительность в минутах
    
    Returns:
        datetime: Время окончания
    """
    return appointment_date + timedelta(minutes=duration_minutes)
