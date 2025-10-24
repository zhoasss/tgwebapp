import logging
import os
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Загружаем переменные из .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "p.env"))

# Получаем настройки
BOT_TOKEN = "8218346555:AAEPcKe5WVZEW977WmrlEQ7XsowdNx2-bJ0"
WEB_APP_URL ="https://zhoasss.github.io/"

if not BOT_TOKEN or not WEB_APP_URL:
    raise ValueError("❌ Отсутствуют обязательные переменные: BOT_TOKEN или WEB_APP_URL в .env")

# Логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(
        f"Привет, {user.first_name}! 👋\nНажми кнопку ниже, чтобы открыть Mini App:",
        reply_markup={
            "inline_keyboard": [
                [{"text": "Открыть Mini App", "web_app": {"url": WEB_APP_URL}}]
            ]
        }
    )

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.run_polling()

if __name__ == "__main__":
    main()