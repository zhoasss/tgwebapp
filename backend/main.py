import logging
import asyncio
from telegram.ext import Application
from src.shared.config.env_loader import load_config
from src.shared.logger.setup import setup_logging
from src.shared.database.connection import init_database
from src.features.start_command.handler import register_start_handler

async def run_bot():
    """Запускает бота"""
    # Настройка логирования с ротацией
    from pathlib import Path
    data_dir = Path("/app/data")
    data_dir.mkdir(exist_ok=True)
    setup_logging(log_file=str(data_dir / 'bot.log'))

    logging.info("🤖 Инициализация Telegram бота...")

    # Загрузка конфигурации
    config = load_config()
    logging.info("⚙️ Конфигурация загружена")
    logging.info(f"🌐 Web App URL: {config['web_app_url']}")

    # Инициализация базы данных
    try:
        await init_database()
        logging.info("💾 База данных готова")
    except Exception as e:
        logging.critical(f"❌ Критическая ошибка инициализации БД: {e}")
        raise SystemExit(1)  # Останавливаем приложение при ошибке БД

    # Создание приложения
    logging.info("🔧 Создание Telegram приложения...")
    application = Application.builder().token(config['bot_token']).build()

    # Сохраняем web_app_url в bot_data для использования в обработчиках
    application.bot_data['web_app_url'] = config['web_app_url']

    # Регистрация обработчиков
    register_start_handler(application)
    logging.info("📡 Обработчики команд зарегистрированы")

    # Инициализация приложения
    await application.initialize()
    await application.start()

    logging.info("✅ Telegram бот успешно запущен!")
    logging.info("🎯 Бот готов принимать команды")

    # Запуск polling
    logging.info("📨 Запуск polling для получения обновлений...")
    await application.updater.start_polling(
        drop_pending_updates=False,  # Изменено: теперь бот обрабатывает все сообщения
        allowed_updates=["message", "callback_query"]
    )

    logging.info("🔄 Polling активен - бот работает")
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

