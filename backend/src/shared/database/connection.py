"""
Подключение к базе данных
Слой Shared - общие компоненты
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from pathlib import Path
import logging

from .models import Base

# Получаем путь к директории для размещения БД
data_dir = Path("/app/data")
data_dir.mkdir(exist_ok=True)
database_path = data_dir / "database.db"

# URL для подключения к SQLite
DATABASE_URL = f"sqlite+aiosqlite:///{database_path}"

# Создание асинхронного движка
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Установите True для отладки SQL запросов
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
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logging.info("✅ База данных инициализирована")
        logging.info(f"📁 Путь к БД: {database_path}")
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

