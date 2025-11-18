"""
FastAPI сервер для системы управления записями
Модульный API с разделением на фичи
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.shared.database.connection import init_database
from src.shared.logger.setup import setup_logging
from src.shared.errors.handlers import register_error_handlers
from src.shared.config.env_loader import config
from src.features.api.profiles import router as profile_router
from src.features.api.services import router as services_router
from src.features.api.clients import router as clients_router
from src.features.api.appointments import router as appointments_router
from src.features.api.schedule import router as schedule_router

# Настройка логирования с ротацией
setup_logging(
    log_file=config.log_file or str(config.data_dir / 'api.log'),
    max_bytes=config.log_max_bytes,
    backup_count=config.log_backup_count
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logging.info("🚀 Запуск API сервера...")
    try:
        logging.info("📊 Инициализация базы данных...")
        await init_database()
        logging.info("✅ База данных инициализирована")
        logging.info("🎯 API сервер готов к работе")
    except Exception as e:
        logging.error(f"❌ Ошибка при инициализации БД: {e}")
        raise

    yield

    # Shutdown
    logging.info("⏹️ Остановка API сервера...")

# Создание приложения
app = FastAPI(
    title=config.app_title,
    description=config.app_description,
    version=config.app_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    debug=config.debug
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=config.cors_allow_credentials,
    allow_methods=config.cors_allow_methods,
    allow_headers=config.cors_allow_headers,
)

# Регистрация обработчиков ошибок
register_error_handlers(app)

# Подключение роутеров
app.include_router(profile_router, prefix="/api", tags=["profiles"])
app.include_router(services_router, prefix="/api", tags=["services"])
app.include_router(clients_router, prefix="/api", tags=["clients"])
app.include_router(appointments_router, prefix="/api", tags=["appointments"])
app.include_router(schedule_router, prefix="/api", tags=["schedule"])

@app.get("/")
async def root():
    """Корневой endpoint с информацией о API"""
    return {
        "message": f"{config.app_title} работает",
        "version": config.app_version,
        "status": "healthy",
        "environment": config.environment,
        "documentation": {
            "swagger": "/api/docs",
            "redoc": "/api/redoc"
        },
        "modules": [
            "profiles - управление профилями пользователей",
            "services - управление услугами",
            "clients - управление клиентами",
            "appointments - управление записями",
            "schedule - управление графиком работы"
        ]
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья сервера"""
    return {
        "status": "ok",
        "service": "api",
        "version": config.app_version,
        "environment": config.environment
    }

@app.get("/api/debug")
async def debug_endpoint():
    """Debug endpoint для тестирования API без авторизации"""
    return {
        "status": "ok",
        "message": "API debug endpoint работает",
        "timestamp": "2025-01-01T12:00:00Z",
        "server": "FastAPI",
        "version": config.app_version
    }

@app.get("/api/test")
async def api_test():
    """Тестовый endpoint для проверки API доступности"""
    return {
        "status": "ok",
        "message": "API доступен",
        "cors_test": "CORS работает",
        "version": "2.0.0"
    }

@app.get("/api/test-no-auth")
async def test_no_auth():
    """Тестовый endpoint без авторизации"""
    return {
        "status": "ok",
        "message": "API работает без авторизации",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api_server:app",
        host=config.host,
        port=config.port,
        reload=config.reload,
        log_level=config.log_level.lower()
    )

