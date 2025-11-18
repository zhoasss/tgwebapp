"""
FastAPI сервер для работы с WebApp
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.shared.database.connection import init_database
from src.shared.logger.setup import setup_logging
from src.features.api.profile import router

# Настройка логирования с ротацией
from pathlib import Path
data_dir = Path("/app/data")
data_dir.mkdir(exist_ok=True)
setup_logging(log_file=str(data_dir / 'api.log'))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logging.info("🚀 Запуск API сервера...")
    logging.info("📊 Инициализация базы данных...")
    await init_database()
    logging.info("✅ База данных инициализирована")
    logging.info("🎯 API сервер готов к работе")
    logging.info(f"📍 Доступные эндпоинты: {list(app.routes)}")

    yield

    # Shutdown
    logging.info("⏹️ Остановка API сервера...")

# Создание приложения
app = FastAPI(
    title="Личный кабинет API",
    description="API для Telegram Mini App",
    version="1.0.0",
    lifespan=lifespan
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://zhoasss.github.io",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "https://booking-cab.ru",
        # Telegram Web App origins
        "https://web.telegram.org",
        "https://telegram.me",
        "https://t.me",
        "https://telegram.org"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Init-Data", "Authorization"],
)

# Подключение роутеров
app.include_router(router)

@app.get("/")
async def root():
    """Корневой endpoint"""
    logging.info("📡 Запрос к корневому эндпоинту /")
    return {
        "message": "API сервер работает",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": [
            "/api/profile/ (GET, PUT) - требуется X-Init-Data заголовок",
            "/health - проверка здоровья"
        ]
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья сервера"""
    logging.debug("💓 Health check запрос")
    return {"status": "ok", "timestamp": "now"}

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

