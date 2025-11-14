import os
from dotenv import load_dotenv

def load_config():
    """Загружает конфигурацию из .env файла"""
    load_dotenv(".env")
    
    bot_token = os.getenv("BOT_TOKEN")
    web_app_url = os.getenv("WEB_APP_URL")
    
    if not bot_token or not web_app_url:
        raise ValueError("❌ Отсутствуют обязательные переменные: BOT_TOKEN или WEB_APP_URL в .env")
    
    return {
        'bot_token': bot_token,
        'web_app_url': web_app_url.strip()
    }

