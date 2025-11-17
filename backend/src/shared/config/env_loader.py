import os
from pathlib import Path
from dotenv import load_dotenv

def load_config():
    """Загружает конфигурацию из .env файла или переменных окружения"""
    # Получаем путь к корню проекта (backend/)
    backend_dir = Path(__file__).parent.parent.parent.parent
    env_path = backend_dir / ".env"
    
    # Загружаем .env файл если он существует (для локальной разработки)
    if env_path.exists():
        print(f"🔍 Загрузка из файла: {env_path}")
        load_dotenv(env_path)
    else:
        print(f"ℹ️ Файл .env не найден, используем переменные окружения")
    
    # Получаем переменные (из .env или системных переменных окружения)
    bot_token = os.getenv("BOT_TOKEN")
    web_app_url = os.getenv("WEB_APP_URL")
    
    if not bot_token:
        raise ValueError(f"❌ BOT_TOKEN не найден в переменных окружения")
    
    if not web_app_url:
        raise ValueError(f"❌ WEB_APP_URL не найден в переменных окружения")
    
    return {
        'bot_token': bot_token,
        'web_app_url': web_app_url.strip()
    }

