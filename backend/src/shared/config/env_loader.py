import os
from pathlib import Path
from dotenv import load_dotenv

def load_config():
    """Загружает конфигурацию из .env файла"""
    # Получаем путь к корню проекта (backend/)
    backend_dir = Path(__file__).parent.parent.parent.parent
    env_path = backend_dir / ".env"
    
    print(f"🔍 Путь к .env файлу: {env_path}")
    print(f"🔍 Файл существует: {env_path.exists()}")
    
    # Загружаем .env файл
    load_dotenv(env_path)
    
    bot_token = os.getenv("BOT_TOKEN")
    web_app_url = os.getenv("WEB_APP_URL")
    
    if not bot_token or not web_app_url:
        raise ValueError(f"❌ Отсутствуют обязательные переменные в {env_path}")
    
    return {
        'bot_token': bot_token,
        'web_app_url': web_app_url.strip()
    }

