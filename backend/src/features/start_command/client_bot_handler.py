import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

async def start_client(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start для клиентского бота"""
    user = update.effective_user
    
    # Проверяем, есть ли параметр deep link
    args = context.args
    deep_link_param = args[0] if args else None
    
    logging.info(f"📱 [CLIENT BOT] Получена команда /start от пользователя {user.id} (@{user.username})")
    if deep_link_param:
        logging.info(f"🔗 [CLIENT BOT] Deep link параметр: {deep_link_param}")
    
    # Проверяем, это ли ссылка для бронирования
    if deep_link_param and deep_link_param.startswith('booking_'):
        # Извлекаем booking_slug
        booking_slug = deep_link_param.replace('booking_', '')
        logging.info(f"🔗 [CLIENT BOT] Открытие публичного бронирования для slug: {booking_slug}")
        
        # Формируем URL для Web App с параметром бронирования
        web_app_url = context.bot_data.get('web_app_url', 'https://booking-cab.ru')
        booking_url = f"{web_app_url}/src/pages/booking/index.html?slug={booking_slug}"
        
        # Создаем клавиатуру с кнопкой для открытия бронирования
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
        
        logging.info(f"✅ [CLIENT BOT] Отправлена ссылка на бронирование для {user.id}")
    else:
        # Приветствие для клиентов без deep link
        await update.message.reply_text(
            f"👋 Привет, {user.first_name}!\n\n"
            f"Этот бот предназначен для онлайн-записи.\n"
            f"Попросите мастера отправить вам ссылку для записи."
        )
        
        logging.info(f"ℹ️ [CLIENT BOT] Отправлено приветствие пользователю {user.id}")

def register_client_start_handler(application: Application):
    """Регистрирует обработчик команды /start для клиентского бота"""
    from src.shared.config.env_loader import config
    
    application.bot_data['web_app_url'] = config.web_app_url
    
    application.add_handler(CommandHandler("start", start_client))
    logging.info("✅ [CLIENT BOT] Обработчик команды /start зарегистрирован")
