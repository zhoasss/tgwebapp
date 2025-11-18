"""
Аутентификация через Telegram WebApp
Слой Shared - общие компоненты
"""

import hashlib
import hmac
import json
from urllib.parse import parse_qs
from fastapi import HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from ..database.models import User

def validate_telegram_init_data(init_data: str, bot_token: str) -> dict:
    """
    Проверяет подлинность initData от Telegram WebApp

    Args:
        init_data: Строка initData от Telegram WebApp
        bot_token: Токен бота

    Returns:
        dict: Распарсенные данные пользователя

    Raises:
        HTTPException: Если данные невалидны
    """
    logging.info(f"🔐 Начинаем валидацию init_data (длина: {len(init_data) if init_data else 0})")

    if not init_data:
        logging.error("❌ Init data отсутствует")
        raise HTTPException(status_code=401, detail="Init data отсутствует")

    try:
        # Парсим init_data
        parsed_data = parse_qs(init_data)
        logging.info(f"📋 Распарсенные параметры: {list(parsed_data.keys())}")

        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            logging.error("❌ Hash отсутствует в init_data")
            raise HTTPException(status_code=401, detail="Hash отсутствует в init_data")

        logging.info(f"🔒 Получен hash: {received_hash[:10]}...")
        
        # Удаляем hash из данных для проверки
        data_check_string_parts = []
        for key in sorted(parsed_data.keys()):
            if key != 'hash':
                value = parsed_data[key][0]
                data_check_string_parts.append(f"{key}={value}")
        
        data_check_string = '\n'.join(data_check_string_parts)
        
        # Создаем secret key из токена бота
        secret_key = hmac.new(
            "WebAppData".encode(),
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        logging.info(f"🔑 Secret key создан из токена (длина: {len(bot_token)})")

        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        logging.info(f"🔢 Вычислен hash: {calculated_hash[:10]}...")
        logging.info(f"🔍 Сравнение: received={received_hash[:10]}... vs calculated={calculated_hash[:10]}...")

        # Сравниваем хеши
        if calculated_hash != received_hash:
            logging.error("❌ Hash не совпадает - init data невалидны")
            raise HTTPException(status_code=401, detail="Init data невалидны")
        
        # Парсим данные пользователя
        user_data = parsed_data.get('user', [None])[0]
        if user_data:
            user = json.loads(user_data)
            logging.info(f"✅ Валидация init_data успешна для пользователя: {user.get('id', 'unknown')}")
            return user
        else:
            logging.error("❌ Данные пользователя отсутствуют в init_data")
            raise HTTPException(status_code=401, detail="Данные пользователя отсутствуют")

    except json.JSONDecodeError as e:
        logging.error(f"❌ Ошибка парсинга JSON данных пользователя: {e}")
        raise HTTPException(status_code=401, detail="Ошибка парсинга данных пользователя")
    except Exception as e:
        logging.error(f"❌ Ошибка валидации init_data: {e}")
        raise HTTPException(status_code=401, detail="Ошибка валидации init_data")

async def get_telegram_user(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    bot_token: str = None
) -> dict:
    """
    Dependency для получения данных пользователя из Telegram init_data

    Args:
        x_init_data: Init data из заголовка запроса
        bot_token: Токен бота для валидации

    Returns:
        dict: Данные пользователя
    """
    if not bot_token:
        # В production нужно получать из config
        from ..config.env_loader import load_config
        config = load_config()
        bot_token = config['bot_token']

    return validate_telegram_init_data(x_init_data, bot_token)

async def get_current_user(
    authorization: str = Header(..., alias="Authorization")
) -> dict:
    """
    Dependency для получения данных пользователя по токену

    Args:
        authorization: Токен авторизации (Bearer token)

    Returns:
        dict: Данные пользователя
    """
    from ..database.connection import get_session

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    token = authorization.replace("Bearer ", "")

    async with get_session() as session:
        result = await session.execute(
            select(User).where(User.token == token)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="Неверный токен")

        return user.to_dict()

