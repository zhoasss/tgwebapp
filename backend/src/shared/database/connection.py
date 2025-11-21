"""
Подключение к базе данных
Слой Shared - общие компоненты
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from pathlib import Path
import logging

from .models import Base, User, Service, Client, Appointment, WorkingHours

# Импортируем конфигурацию
from ..config.env_loader import get_database_url, config

# URL для подключения к базе данных
DATABASE_URL = get_database_url()

# Создание асинхронного движка
engine = create_async_engine(
    DATABASE_URL,
    echo=config.db_echo,  # Используем настройку из конфигурации
    future=True
)

# Фабрика сессий
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_database():
    """Инициализация базы данных - создание всех таблиц"""
    try:
        # Используем синхронный движок для создания таблиц
        # так как async движок не создает таблицы корректно
        from sqlalchemy import create_engine
        from urllib.parse import unquote_plus
        
        # Преобразуем async URL в sync URL
        sync_url = DATABASE_URL.replace('sqlite+aiosqlite://', 'sqlite:///')
        sync_url = unquote_plus(sync_url)
        
        sync_engine = create_engine(sync_url)
        Base.metadata.create_all(sync_engine)
        sync_engine.dispose()
        
        logging.info("✅ База данных инициализирована")
        logging.info(f"📁 Настройки БД: URL={DATABASE_URL}")
    except Exception as e:
        logging.error(f"❌ Ошибка инициализации БД: {e}")
        raise

async def get_session() -> AsyncSession:
    """Получение сессии базы данных для dependency injection"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_db_session() -> AsyncSession:
    """Получение сессии базы данных (простой вариант)"""
    return async_session_factory()

