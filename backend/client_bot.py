import logging
import asyncio
from telegram.ext import Application
from src.shared.config.env_loader import config
from src.shared.logger.setup import setup_logging
from src.shared.database.connection import init_database
from src.features.start_command.client_bot_handler import register_client_start_handler

async def run_client_bot():
    """Запускает клиентского бота для записи"""
    # Настройка логирования
    setup_logging(log_file=str(config.data_dir / 'client_bot.log'))

    logging.info("🤖 [CLIENT BOT] Инициализация клиентского Telegram бота...")
    logging.info("⚙️ [CLIENT BOT] Конфигурация загружена")
    logging.info(f"🌐 [CLIENT BOT] Web App URL: {config.web_app_url}")

    # Проверяем наличие токена клиентского бота
    if not config.client_bot_token:
        logging.error("❌ [CLIENT BOT] CLIENT_BOT_TOKEN не настроен в .env")
        raise SystemExit(1)

    # Инициализация базы данных (общая с основным ботом)
    try:
        await init_database()
        logging.info("💾 [CLIENT BOT] База данных готова")
    except Exception as e:
        logging.critical(f"❌ [CLIENT BOT] Критическая ошибка инициализации БД: {e}")
        raise SystemExit(1)

    # Создание приложения
    logging.info("🔧 [CLIENT BOT] Создание Telegram приложения...")
    application = Application.builder().token(config.client_bot_token).build()

    # Сохраняем web_app_url в bot_data для использования в обработчиках
    application.bot_data['web_app_url'] = config.web_app_url

    # Регистрация обработчиков
    register_client_start_handler(application)
    logging.info("📡 [CLIENT BOT] Обработчики команд зарегистрированы")

    # Инициализация приложения
    await application.initialize()
    await application.start()

    logging.info("✅ [CLIENT BOT] Telegram бот успешно запущен!")
    logging.info("🎯 [CLIENT BOT] Бот готов принимать команды от клиентов")

    # Запуск polling
    logging.info("📨 [CLIENT BOT] Запуск polling для получения обновлений...")
    await application.updater.start_polling(
        drop_pending_updates=False,
        allowed_updates=["message", "callback_query"]
    )

    logging.info("🔄 [CLIENT BOT] Polling активен - бот работает")
    # Ожидание остановки
    await asyncio.Event().wait()

def main():
    """Точка входа в приложение"""
    try:
        asyncio.run(run_client_bot())
    except KeyboardInterrupt:
        logging.info("⏹️ [CLIENT BOT] Бот остановлен")
    except Exception as e:
        logging.error(f"❌ [CLIENT BOT] Неожиданная ошибка: {e}")
        raise SystemExit(1)

if __name__ == "__main__":
    main()
