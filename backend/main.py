import logging
from telegram.ext import Application
from src.shared.config.env_loader import load_config
from src.shared.logger.setup import setup_logging
from src.features.start_command.handler import register_start_handler

def main():
    """Точка входа в приложение"""
    # Настройка логирования
    setup_logging()
    
    # Загрузка конфигурации
    config = load_config()
    
    logging.info("🚀 Запуск бота...")
    
    # Создание приложения
    application = Application.builder().token(config['bot_token']).build()
    
    # Регистрация обработчиков
    register_start_handler(application)
    
    # Запуск бота
    application.run_polling(
        drop_pending_updates=True,
        allowed_updates=["message", "callback_query"]
    )
    
    logging.info("✅ Бот успешно запущен")

if __name__ == "__main__":
    main()

