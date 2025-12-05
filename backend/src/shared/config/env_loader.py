"""
Конфигурация приложения с поддержкой разных окружений
Слой Shared - общие компоненты
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from urllib.parse import quote_plus
import logging

logger = logging.getLogger(__name__)


class Config:
    """Класс конфигурации приложения"""

    def __init__(self):
        # Определяем окружение
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
        self.is_production = self.environment == "production"
        self.is_development = self.environment == "development"
        self.is_testing = self.environment == "testing"

        # Загружаем переменные окружения
        self._load_env_file()

        # Настройки данных (нужно перед database_url)
        self.data_dir: Path = Path(self._get_env("DATA_DIR", "/app/data"))
        self.data_dir.mkdir(exist_ok=True)

        # Настройки Telegram
        self.bot_token: str = self._get_required_env("BOT_TOKEN")
        self.bot_username: str = self._get_env("BOT_USERNAME", "booking_cab_bot")  # Username бота без @
        self.web_app_url: str = self._get_required_env("WEB_APP_URL")
        
        # Настройки Client Bot (опционально)
        self.client_bot_token: Optional[str] = self._get_env("CLIENT_BOT_TOKEN")
        self.client_bot_username: Optional[str] = self._get_env("CLIENT_BOT_USERNAME")
        
        if self.client_bot_username:
            logger.info(f"✅ Client bot настроен: @{self.client_bot_username}")
        else:
            logger.info("ℹ️ Client bot не настроен, будет использоваться основной бот")

        # Настройки базы данных
        self.database_url: str = self._get_env("DATABASE_URL", self._get_default_database_url())
        self.db_echo: bool = self._get_env_bool("DB_ECHO", False)

        # Настройки JWT
        self.jwt_secret_key: str = self._get_env("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.jwt_algorithm: str = self._get_env("JWT_ALGORITHM", "HS256")
        self.jwt_access_token_expire_minutes: int = self._get_env_int("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30)

        # Настройки сервера
        self.host: str = self._get_env("HOST", "0.0.0.0")
        self.port: int = self._get_env_int("PORT", 8000)
        self.debug: bool = self._get_env_bool("DEBUG", not self.is_production)
        self.reload: bool = self._get_env_bool("RELOAD", self.is_development)

        # Настройки CORS
        self.cors_origins: List[str] = self._get_cors_origins()
        self.cors_allow_credentials: bool = True
        self.cors_allow_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
        self.cors_allow_headers: List[str] = ["Content-Type", "X-Init-Data", "Authorization", "Accept"]

        # Настройки логирования
        self.log_level: str = self._get_env("LOG_LEVEL", "INFO")
        self.log_file: Optional[str] = self._get_env("LOG_FILE")
        self.log_max_bytes: int = self._get_env_int("LOG_MAX_BYTES", 10 * 1024 * 1024)  # 10MB
        self.log_backup_count: int = self._get_env_int("LOG_BACKUP_COUNT", 5)

        # Настройки приложения
        self.app_title: str = "Booking Cabinet API"
        self.app_description: str = "API для системы управления записями и бронированиями"
        self.app_version: str = "2.0.0"

        logger.info(f"✅ Конфигурация загружена для окружения: {self.environment}")

    def _load_env_file(self):
        """Загружает .env файл"""
        # Возможные пути к .env файлу
        possible_paths = [
            Path(".env"),                                    # Текущая директория
            Path(".env.local"),                             # Локальный файл
            Path(f".env.{self.environment}"),               # Файл для конкретного окружения
            Path("/app/.env"),                              # Docker контейнер
            Path("/app/.env.local"),                        # Локальный в контейнере
        ]

        # Определяем корневую папку проекта
        project_root = Path(__file__).parent.parent.parent.parent.parent
        possible_paths.extend([
            project_root / ".env",
            project_root / ".env.local",
            project_root / f".env.{self.environment}",
        ])

        env_loaded = False
        for path in possible_paths:
            if path.exists():
                logger.info(f"🔍 Загрузка конфигурации из: {path}")
                load_dotenv(path)
                env_loaded = True
                break

        if not env_loaded:
            logger.warning("⚠️ Файл .env не найден, используем переменные окружения системы")

    def _get_required_env(self, key: str) -> str:
        """Получает обязательную переменную окружения"""
        value = os.getenv(key)
        if not value:
            raise ValueError(f"❌ Обязательная переменная окружения {key} не найдена")
        return value.strip()

    def _get_env(self, key: str, default: Any = None) -> Any:
        """Получает переменную окружения с значением по умолчанию"""
        value = os.getenv(key, default)
        if value is None:
            return None
        return value.strip() if isinstance(value, str) else value

    def _get_env_bool(self, key: str, default: bool = False) -> bool:
        """Получает булевую переменную окружения"""
        value = os.getenv(key, str(default)).lower()
        return value in ("true", "1", "yes", "on")

    def _get_env_int(self, key: str, default: int = 0) -> int:
        """Получает целочисленную переменную окружения"""
        value = os.getenv(key, str(default))
        try:
            return int(value)
        except ValueError:
            logger.warning(f"⚠️ Неверное значение для {key}: {value}, использую по умолчанию: {default}")
            return default

    def _get_cors_origins(self) -> List[str]:
        """Получает список разрешенных origins для CORS"""
        origins_str = os.getenv("CORS_ORIGINS", "")
        if origins_str:
            return [origin.strip() for origin in origins_str.split(",")]
        else:
            # Значения по умолчанию
            return [
                "https://zhoasss.github.io",
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:8080",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8080",
                "https://booking-cab.ru",
                "https://web.telegram.org",
                "https://telegram.me",
                "https://t.me",
                "https://telegram.org",
                "https://zhoasssgithubio-production.up.railway.app"
            ]

    def _get_default_database_url(self) -> str:
        """Получает URL базы данных по умолчанию"""
        db_path = self.data_dir / "database.db"
        # Не используем quote_plus для пути SQLite, так как это ломает абсолютные пути
        return f"sqlite+aiosqlite:///{db_path}"

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует конфигурацию в словарь (без чувствительных данных)"""
        return {
            "environment": self.environment,
            "is_production": self.is_production,
            "is_development": self.is_development,
            "debug": self.debug,
            "host": self.host,
            "port": self.port,
            "cors_origins": self.cors_origins,
            "log_level": self.log_level,
            "data_dir": str(self.data_dir),
            "app_title": self.app_title,
            "app_version": self.app_version,
        }


# Глобальный экземпляр конфигурации
config = Config()


def load_config() -> Config:
    """Функция для обратной совместимости"""
    return config


def get_database_url() -> str:
    """Получает URL базы данных"""
    return config.database_url


def get_jwt_settings() -> Dict[str, Any]:
    """Получает настройки JWT"""
    return {
        "secret_key": config.jwt_secret_key,
        "algorithm": config.jwt_algorithm,
        "access_token_expire_minutes": config.jwt_access_token_expire_minutes,
    }

