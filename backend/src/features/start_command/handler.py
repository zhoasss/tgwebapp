import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from .message_template import create_welcome_message, create_keyboard

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    
    # Проверяем, есть ли параметр deep link
    args = context.args
    deep_link_param = args[0] if args else None
    
    logging.info(f"Получена команда /start от пользователя {user.id} (@{user.username})")
    if deep_link_param:
        logging.info(f"Deep link параметр: {deep_link_param}")
    
    # Проверяем, это ли ссылка для бронирования
    if deep_link_param and deep_link_param.startswith('booking_'):
        # Извлекаем booking_slug
        booking_slug = deep_link_param.replace('booking_', '')
        logging.info(f"🔗 Открытие публичного бронирования для slug: {booking_slug}")
        
        # Формируем URL для Web App с параметром бронирования
        web_app_url = context.bot_data.get('web_app_url', 'https://booking-cab.ru')
        booking_url = f"{web_app_url}/src/pages/booking/index.html?slug={booking_slug}"
        
        # Создаем клавиатуру с кнопкой для открытия бронирования
        from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
        
        keyboard = [
            [InlineKeyboardButton(
                "📅 Записаться онлайн",
                web_app=WebAppInfo(url=booking_url)
            )]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👋 Привет, {user.first_name}!\n\n"
            f"Нажмите кнопку ниже, чтобы выбрать услугу и записаться.",
            reply_markup=reply_markup
        )
        
        logging.info(f"Отправлена ссылка на бронирование для {user.id}")
    else:
        # Обычное приветствие для владельца бизнеса
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

