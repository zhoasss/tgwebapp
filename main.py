import logging
import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

# Загружаем переменные из .env
load_dotenv("p.env")

# Получаем настройки
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL")

if not BOT_TOKEN or not WEB_APP_URL:
    raise ValueError("❌ Отсутствуют обязательные переменные: BOT_TOKEN или WEB_APP_URL в .env")

# Логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    logging.info(f"Получена команда /start от пользователя {user.id} (@{user.username})")

    # Формируем красивое приветственное сообщение
    welcome_text = (
        f"Привет, {user.first_name}! 👋\n\n"
        "✨ **Добро пожаловать в ваш личный кабинет!** ✨\n\n"
        "Здесь всё под рукой для комфортного управления вашей деятельностью 💼:\n\n"
        "📅 **Посмотреть записи**\n"
        "👥 **Управлять клиентами и записями**\n"
        "✂️ **Управление списком услуг**\n"
        "⏰ **Настроить график работы**\n"
        "👤 **Редактировать профиль**\n\n"
        "Чтобы воспользоваться всеми возможностями — нажмите на кнопку ниже! 👇"
    )

    # Кнопка с коротким текстом и ссылкой из .env
    keyboard = [
        [InlineKeyboardButton("Открыть кабинет 🚀", url=WEB_APP_URL.strip())]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )
    logging.info(f"Отправлено приветственное сообщение пользователю {user.id}")

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))

    # Запускаем polling
    application.run_polling(
        drop_pending_updates=True,
        allowed_updates=["message"]
    )

if __name__ == "__main__":
    main()