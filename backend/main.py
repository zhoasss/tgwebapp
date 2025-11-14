import logging
import asyncio
from telegram.ext import Application
from src.shared.config.env_loader import load_config
from src.shared.logger.setup import setup_logging
from src.shared.database.connection import init_database
from src.features.start_command.handler import register_start_handler

async def run_bot():
    """Запускает бота"""
    # Настройка логирования
    setup_logging()
    
    # Загрузка конфигурации
    config = load_config()
    
    logging.info("🚀 Запуск Telegram бота...")
    
    # Инициализация базы данных
    try:
        await init_database()
    except Exception as e:
        logging.error(f"❌ Не удалось инициализировать БД: {e}")
        logging.warning("⚠️ Бот продолжит работу без БД")
    
    # Создание приложения
    application = Application.builder().token(config['bot_token']).build()
    
    # Сохраняем web_app_url в bot_data для использования в обработчиках
    application.bot_data['web_app_url'] = config['web_app_url']
    
    # Регистрация обработчиков
    register_start_handler(application)
    
    # Инициализация приложения
    await application.initialize()
    await application.start()
    
    logging.info("✅ Бот успешно запущен")
    
    # Запуск polling
    await application.updater.start_polling(
        drop_pending_updates=True,
        allowed_updates=["message", "callback_query"]
    )
    
    # Ожидание остановки
    await asyncio.Event().wait()

def main():
    """Точка входа в приложение"""
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logging.info("⏹️ Бот остановлен")

if __name__ == "__main__":
    main()

