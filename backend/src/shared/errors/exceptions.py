"""
Кастомные исключения для API
Слой Shared - общие компоненты
"""

from fastapi import HTTPException
from typing import Any, Dict, Optional


class BookingAPIException(HTTPException):
    """Базовое исключение для API"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.data = data or {}


class AuthenticationError(BookingAPIException):
    """Ошибка аутентификации"""

    def __init__(self, detail: str = "Ошибка аутентификации", **kwargs):
        super().__init__(status_code=401, detail=detail, error_code="AUTH_ERROR", **kwargs)


class AuthorizationError(BookingAPIException):
    """Ошибка авторизации"""

    def __init__(self, detail: str = "Недостаточно прав доступа", **kwargs):
        super().__init__(status_code=403, detail=detail, error_code="FORBIDDEN", **kwargs)


class ValidationError(BookingAPIException):
    """Ошибка валидации данных"""

    def __init__(self, detail: str = "Неверные данные", **kwargs):
        super().__init__(status_code=400, detail=detail, error_code="VALIDATION_ERROR", **kwargs)


class NotFoundError(BookingAPIException):
    """Ресурс не найден"""

    def __init__(self, resource: str = "ресурс", **kwargs):
        detail = f"{resource} не найден"
        super().__init__(status_code=404, detail=detail, error_code="NOT_FOUND", **kwargs)


class ConflictError(BookingAPIException):
    """Конфликт данных"""

    def __init__(self, detail: str = "Конфликт данных", **kwargs):
        super().__init__(status_code=409, detail=detail, error_code="CONFLICT", **kwargs)


class BusinessLogicError(BookingAPIException):
    """Ошибка бизнес-логики"""

    def __init__(self, detail: str = "Операция невозможна", **kwargs):
        super().__init__(status_code=400, detail=detail, error_code="BUSINESS_LOGIC_ERROR", **kwargs)


class TelegramAuthError(AuthenticationError):
    """Ошибка аутентификации через Telegram"""

    def __init__(self, detail: str = "Ошибка аутентификации через Telegram", **kwargs):
        super().__init__(detail=detail, error_code="TELEGRAM_AUTH_ERROR", **kwargs)


class AppointmentConflictError(ConflictError):
    """Конфликт времени записи"""

    def __init__(self, detail: str = "Время уже занято", **kwargs):
        super().__init__(detail=detail, error_code="APPOINTMENT_CONFLICT", **kwargs)


class WorkingHoursError(BusinessLogicError):
    """Ошибка рабочего графика"""

    def __init__(self, detail: str = "Ошибка рабочего графика", **kwargs):
        super().__init__(detail=detail, error_code="WORKING_HOURS_ERROR", **kwargs)


class DatabaseError(BookingAPIException):
    """Ошибка базы данных"""

    def __init__(self, detail: str = "Ошибка базы данных", **kwargs):
        super().__init__(status_code=500, detail=detail, error_code="DATABASE_ERROR", **kwargs)
