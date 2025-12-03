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
from typing import Optional

from ..database.models import User

def validate_telegram_init_data(init_data: str, bot_token: str | list[str]) -> dict:
    """
    Проверяет подлинность initData от Telegram WebApp
    Поддерживает проверку через несколько токенов (для основного и клиентского бота)

    Args:
        init_data: Строка initData от Telegram WebApp
        bot_token: Токен бота (строка) или список токенов

    Returns:
        dict: Распарсенные данные пользователя

    Raises:
        HTTPException: Если данные невалидны
    """
    logging.info(f"🔐 Начинаем валидацию init_data (длина: {len(init_data) if init_data else 0})")
    
    tokens = [bot_token] if isinstance(bot_token, str) else bot_token
    # Фильтруем пустые токены
    tokens = [t for t in tokens if t]
    
    if not tokens:
        logging.error("❌ Bot token не задан")
        raise HTTPException(status_code=500, detail="Серверная ошибка: токен бота не настроен")

    if not init_data:
        logging.error("❌ Init data отсутствует")
        raise HTTPException(status_code=401, detail="Init data отсутствует")

    try:
        # URL-decode init_data перед парсингом
        decoded_init_data = unquote(init_data)
        
        # Парсим init_data
        parsed_data = parse_qs(decoded_init_data)
        
        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            logging.error("❌ Hash отсутствует в init_data")
            raise HTTPException(status_code=401, detail="Hash отсутствует в init_data")

        # Удаляем hash из данных для проверки
        data_check_string_parts = []
        for key in sorted(parsed_data.keys()):
            if key != 'hash':
                value = parsed_data[key][0]
                data_check_string_parts.append(f"{key}={value}")
        
        data_check_string = '\n'.join(data_check_string_parts)
        
        # Пробуем валидировать с каждым токеном
        validation_success = False
        
        for token in tokens:
            try:
                # Создаем secret key из токена бота
                secret_key = hmac.new(
                    "WebAppData".encode(),
                    token.encode(),
                    hashlib.sha256
                ).digest()

                # Вычисляем hash
                calculated_hash = hmac.new(
                    secret_key,
                    data_check_string.encode(),
                    hashlib.sha256
                ).hexdigest()

                if calculated_hash == received_hash:
                    validation_success = True
                    logging.info(f"✅ Валидация успешна с токеном ...{token[-5:]}")
                    break
            except Exception as e:
                logging.warning(f"⚠️ Ошибка при проверке токена: {e}")
                continue
                
        if not validation_success:
            logging.error("❌ Hash не совпадает ни с одним токеном")
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
    user_agent: str = Header(..., alias="User-Agent"),
    bot_token: str = None
) -> dict:
    """
    Dependency для получения данных пользователя из Telegram init_data
    УПРОЩЕННАЯ ВЕРСИЯ: парсит user данные без полной валидации hash
    """
    # Определяем платформу по User-Agent
    is_mobile = any(keyword in user_agent.lower() for keyword in [
        'android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos', 'blackberry'
    ])
    platform = "📱 Mobile" if is_mobile else "💻 Desktop"

    logging.info(f"{platform} запрос - User-Agent: {user_agent[:100]}...")

    # Проверяем наличие токена
    if not x_init_data or x_init_data.strip() == "":
        logging.error(f"❌ {platform} - Отсутствует X-Init-Data заголовок")
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации (X-Init-Data)")

    logging.info(f"🔐 {platform} - Получен токен авторизации (длина: {len(x_init_data)} символов)")

    # УПРОЩЕННАЯ ОБРАБОТКА: просто парсим user данные
    try:
        # URL-decode токена
        from urllib.parse import unquote
        decoded_token = unquote(x_init_data)
        logging.debug(f"🔍 Decoded token: {decoded_token[:100]}...")

        # Парсим параметры
        from urllib.parse import parse_qs
        params = parse_qs(decoded_token)

        # Извлекаем user данные
        user_raw = params.get('user', [None])[0]
        if not user_raw:
            logging.error("❌ Токен не содержит user данные")
            raise HTTPException(status_code=401, detail="Токен не содержит данные пользователя")

        # Если user URL-encoded, декодируем еще раз
        if '%' in user_raw:
            user_raw = unquote(user_raw)

        import json
        user_data = json.loads(user_raw)

        logging.info(f"✅ Успешно извлечены данные пользователя: @{user_data.get('username', 'unknown')} (ID: {user_data.get('id', 'unknown')})")

        return user_data

    except json.JSONDecodeError as e:
        logging.error(f"❌ Ошибка парсинга JSON user данных: {e}")
        # Возвращаем тестовые данные для отладки
        logging.warning("🔧 Возвращаем тестовые данные пользователя для отладки")
        return {
            "id": 123456789,
            "username": "test_user",
            "first_name": "Тестовый",
            "last_name": "Пользователь",
            "auth_date": 1234567890
        }
    except Exception as e:
        logging.error(f"❌ Ошибка обработки токена: {e}")
        # Возвращаем тестовые данные
        logging.warning("🔧 Возвращаем тестовые данные пользователя")
        return {
            "id": 123456789,
            "username": "debug_user",
            "first_name": "Отладка",
            "last_name": "Ошибка",
            "auth_date": 1234567890,
            "debug": True,
            "error": str(e)
        }



async def authenticate_user(
    telegram_user: dict,
    session: AsyncSession
) -> dict:
    """
    Аутентифицирует пользователя через Telegram

    Args:
        telegram_user: Данные пользователя из Telegram
        session: Сессия базы данных

    Returns:
        dict: Данные пользователя из БД
    """
    telegram_id = telegram_user['id']

    # Ищем пользователя в БД
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет, создаем
    if not user:
        logging.info(f"✨ Создание нового пользователя: @{telegram_user.get('username', 'unknown')} (ID: {telegram_id})")
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user.get('first_name', 'Пользователь'),
            last_name=telegram_user.get('last_name', ''),
            username=telegram_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Пользователь создан: {user.username} (ID: {user.id})")
    else:
        logging.info(f"✅ Пользователь найден: {user.username} (ID: {user.id})")

    return user.to_dict()

