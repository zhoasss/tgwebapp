"""
Аутентификация через Telegram WebApp
Слой Shared - общие компоненты
"""

import hashlib
import hmac
import json
from urllib.parse import parse_qs, unquote
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
    logging.info(f"🤖 Bot token: {bot_token[:10] if bot_token else 'None'}...")

    if not bot_token:
        logging.error("❌ Bot token не задан")
        raise HTTPException(status_code=500, detail="Серверная ошибка: токен бота не настроен")

    if not init_data:
        logging.error("❌ Init data отсутствует")
        raise HTTPException(status_code=401, detail="Init data отсутствует")

    try:
        # URL-decode init_data перед парсингом
        decoded_init_data = unquote(init_data)
        logging.info(f"🔍 Decoded init_data (первые 100 символов): {decoded_init_data[:100]}...")

        # Парсим init_data
        parsed_data = parse_qs(decoded_init_data)
        logging.info(f"📋 Распарсенные параметры: {list(parsed_data.keys())}")
        logging.debug(f"📋 Все параметры: {parsed_data}")

        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            logging.error("❌ Hash отсутствует в init_data")
            logging.error(f"❌ Доступные поля: {list(parsed_data.keys())}")
            logging.error(f"❌ Raw decoded data: {decoded_init_data}")
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
            logging.info(f"👤 Raw user data (первые 100 символов): {user_data[:100]}...")
            try:
                # Если user_data - это URL-encoded строка, декодируем её
                if '%' in user_data:
                    user_data = unquote(user_data)
                    logging.info(f"👤 Decoded user data (первые 100 символов): {user_data[:100]}...")

                user = json.loads(user_data)
                logging.info(f"✅ Успешно распарсены данные пользователя: {user.get('username', 'unknown')} (ID: {user.get('id', 'unknown')})")
                return user
            except json.JSONDecodeError as e:
                logging.error(f"❌ Ошибка парсинга JSON пользователя: {e}")
                logging.error(f"❌ Raw user data: {user_data}")
                raise HTTPException(status_code=401, detail="Ошибка парсинга данных пользователя")
        else:
            logging.error("❌ Данные пользователя отсутствуют в init_data")
            raise HTTPException(status_code=401, detail="Данные пользователя отсутствуют")

    except json.JSONDecodeError as e:
        logging.error(f"❌ Ошибка парсинга JSON данных пользователя: {e}")
        logging.error(f"❌ User data: {user_data}")
        raise HTTPException(status_code=401, detail="Ошибка парсинга данных пользователя")
    except UnicodeDecodeError as e:
        logging.error(f"❌ Ошибка декодирования URL: {e}")
        logging.error(f"❌ Raw init_data: {init_data[:200]}...")
        raise HTTPException(status_code=401, detail="Ошибка декодирования данных")
    except Exception as e:
        logging.error(f"❌ Ошибка валидации init_data: {e}")
        logging.error(f"❌ Тип ошибки: {type(e).__name__}")
        import traceback
        logging.error(f"❌ Traceback: {traceback.format_exc()}")

        # Для отладки возвращаем более подробную информацию
        if "hash" in str(e).lower():
            raise HTTPException(status_code=401, detail="Неверный формат токена авторизации (отсутствует hash)")
        elif "json" in str(e).lower():
            raise HTTPException(status_code=401, detail="Неверный формат токена авторизации (проблема с JSON)")
        else:
            raise HTTPException(status_code=401, detail=f"Ошибка валидации токена: {str(e)}")

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
    # Проверяем наличие токена
    if not x_init_data or x_init_data.strip() == "":
        logging.error("❌ Отсутствует X-Init-Data заголовок")
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации (X-Init-Data)")

    # Проверяем минимальную длину токена
    if len(x_init_data) < 50:
        logging.error(f"❌ Токен слишком короткий (длина: {len(x_init_data)})")
        raise HTTPException(status_code=401, detail="Токен авторизации слишком короткий")

    logging.info(f"🔐 Получен токен авторизации (длина: {len(x_init_data)} символов)")
    logging.debug(f"🔍 Токен: {x_init_data[:100]}..." if len(x_init_data) > 100 else f"🔍 Токен: {x_init_data}")

    # Проверяем, что токен содержит необходимые поля
    if 'user=' not in x_init_data:
        logging.error("❌ Токен не содержит данные пользователя")
        raise HTTPException(status_code=401, detail="Токен не содержит данные пользователя")

    if 'hash=' not in x_init_data:
        logging.error("❌ Токен не содержит hash для валидации")
        raise HTTPException(status_code=401, detail="Токен не содержит hash для валидации")

    if not bot_token:
        # В production нужно получать из config
        from ..config.env_loader import load_config
        config = load_config()
        bot_token = config['bot_token']
        logging.debug("⚙️ Бот токен загружен из конфигурации")

    # Валидируем токен
    logging.info("🔒 Начинаем валидацию токена...")
    try:
        user_data = validate_telegram_init_data(x_init_data, bot_token)
        logging.info("✅ Токен успешно валидирован")
    except Exception as e:
        logging.error(f"❌ Ошибка валидации токена: {str(e)}")
        raise

    username = user_data.get('username', 'unknown')
    user_id = user_data.get('id', 'unknown')
    first_name = user_data.get('first_name', 'unknown')

    logging.info(f"👤 Пользователь авторизован: @{username} ({first_name}, ID: {user_id})")
    logging.info(f"🔗 Авторизация через ссылку: https://t.me/{config.get('bot_username', 'bot')}?start")

    return user_data

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

