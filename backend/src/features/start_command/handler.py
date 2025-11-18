import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from .message_template import create_welcome_message, create_keyboard

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    logging.info(f"Получена команда /start от пользователя {user.id} (@{user.username})")
    
    # Получаем приветственное сообщение и клавиатуру
    welcome_text = create_welcome_message(user)
    reply_markup = create_keyboard(context.bot_data.get('web_app_url'))
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )
    
    logging.info(f"Отправлено сообщение с Mini App пользователю {user.id}")

def register_start_handler(application: Application):
    """Регистрирует обработчик команды /start"""
    from src.shared.config.env_loader import config
    
    application.bot_data['web_app_url'] = config.web_app_url
    
    application.add_handler(CommandHandler("start", start))

