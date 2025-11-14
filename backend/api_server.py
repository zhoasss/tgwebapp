"""
FastAPI сервер для работы с WebApp
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.shared.database.connection import init_database
from src.shared.logger.setup import setup_logging
from src.features.api.profile import router as profile_router

# Настройка логирования
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logging.info("🚀 Запуск API сервера...")
    await init_database()
    logging.info("✅ API сервер запущен")
    
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
        "http://localhost:*",
        "http://127.0.0.1:*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(profile_router)

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {
        "message": "API сервер работает",
        "version": "1.0.0",
        "endpoints": [
            "/api/profile/ (GET, PUT)"
        ]
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья сервера"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

