"""
Аутентификация через Telegram WebApp
Слой Shared - общие компоненты
"""

import hashlib
import hmac
import json
from urllib.parse import parse_qs
from fastapi import HTTPException, Header
import logging

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
    if not init_data:
        raise HTTPException(status_code=401, detail="Init data отсутствует")
    
    try:
        # Парсим init_data
        parsed_data = parse_qs(init_data)
        
        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            raise HTTPException(status_code=401, detail="Hash отсутствует в init_data")
        
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
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Сравниваем хеши
        if calculated_hash != received_hash:
            raise HTTPException(status_code=401, detail="Init data невалидны")
        
        # Парсим данные пользователя
        user_data = parsed_data.get('user', [None])[0]
        if user_data:
            user = json.loads(user_data)
            return user
        else:
            raise HTTPException(status_code=401, detail="Данные пользователя отсутствуют")
            
    except json.JSONDecodeError:
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

