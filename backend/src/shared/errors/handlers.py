"""
Обработчики ошибок для FastAPI
Слой Shared - общие компоненты
"""

import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError as PydanticValidationError

from .exceptions import BookingAPIException

logger = logging.getLogger(__name__)


async def booking_api_exception_handler(request: Request, exc: BookingAPIException):
    """Обработчик кастомных исключений API"""
    logger.warning(
        f"API Exception: {exc.error_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "error_code": exc.error_code,
            "path": str(request.url),
            "method": request.method,
            "data": exc.data
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "details": exc.data
            },
            "success": False
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Обработчик стандартных HTTP исключений FastAPI"""
    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": str(request.url),
            "method": request.method
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            },
            "success": False
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Обработчик ошибок SQLAlchemy"""
    logger.error(
        f"Database Exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "path": str(request.url),
            "method": request.method,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )

    # Специальная обработка ошибок целостности
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "DATABASE_INTEGRITY_ERROR",
                    "message": "Нарушение целостности данных"
                },
                "success": False
            }
        )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "Ошибка базы данных"
            },
            "success": False
        }
    )


async def pydantic_validation_exception_handler(request: Request, exc: PydanticValidationError):
    """Обработчик ошибок валидации Pydantic"""
    logger.warning(
        f"Pydantic Validation Error: {exc.errors()}",
        extra={
            "path": str(request.url),
            "method": request.method,
            "validation_errors": exc.errors()
        }
    )

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Неверный формат данных",
                "details": exc.errors()
            },
            "success": False
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Обработчик непредвиденных ошибок"""
    logger.error(
        f"Unexpected Exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "path": str(request.url),
            "method": request.method,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Внутренняя ошибка сервера"
            },
            "success": False
        }
    )


def register_error_handlers(app):
    """Регистрирует все обработчики ошибок в FastAPI приложении"""

    # Кастомные исключения API
    app.add_exception_handler(BookingAPIException, booking_api_exception_handler)

    # Стандартные исключения FastAPI
    app.add_exception_handler(HTTPException, http_exception_handler)

    # Ошибки базы данных
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

    # Ошибки валидации
    app.add_exception_handler(PydanticValidationError, pydantic_validation_exception_handler)

    # Общий обработчик для непредвиденных ошибок
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("✅ Зарегистрированы обработчики ошибок")
