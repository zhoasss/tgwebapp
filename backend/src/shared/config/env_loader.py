import os
from pathlib import Path
from dotenv import load_dotenv

def load_config():
    """Загружает конфигурацию из .env файла или переменных окружения"""
    # Проверяем возможные пути к .env файлу
    possible_paths = [Path(".env"), Path("/app/.env")]

    env_path = None
    for path in possible_paths:
        if path.exists():
            env_path = path
            break

    # Загружаем .env файл если он существует
    if env_path:
        print(f"🔍 Загрузка из файла: {env_path}")
        load_dotenv(env_path)
    else:
        print(f"ℹ️ Файл .env не найден ни в одном из путей, используем переменные окружения")
    
    # Получаем переменные (из .env или системных переменных окружения)
    bot_token = os.getenv("BOT_TOKEN")
    web_app_url = os.getenv("WEB_APP_URL")

    print(f"🔍 BOT_TOKEN: {'загружен' if bot_token else 'не найден'}")
    print(f"🔍 WEB_APP_URL: {'загружен' if web_app_url else 'не найден'}")

    if not bot_token:
        raise ValueError(f"❌ BOT_TOKEN не найден в переменных окружения")

    if not web_app_url:
        raise ValueError(f"❌ WEB_APP_URL не найден в переменных окружения")

    return {
        'bot_token': bot_token,
        'web_app_url': web_app_url.strip()
    }

