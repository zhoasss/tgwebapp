from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
import logging

def create_welcome_message(user) -> str:
    """Создает текст приветственного сообщения"""
    return (
        f"Привет, {user.first_name}! 👋\n\n"
        "✨ **Добро пожаловать в ваш личный кабинет!** ✨\n\n"
        "Здесь всё под рукой для комфортного управления вашей деятельностью 💼:\n\n"
        "📅 **Посмотреть записи**\n"
        "👥 **Управлять клиентами и записями**\n"
        "✂️ **Управление списком услуг**\n"
        "⏰ **Настроить график работы**\n"
        "👤 **Редактировать профиль**\n\n"
        "Нажмите на кнопку ниже, чтобы открыть кабинет! 🚀"
    )

def create_keyboard(web_app_url: str) -> InlineKeyboardMarkup:
    """Создает клавиатуру с кнопкой открытия кабинета"""
    # Проверяем протокол URL
    if web_app_url.startswith('https://'):
        # HTTPS - используем Web App кнопку для открытия в Telegram
        keyboard = [
            [InlineKeyboardButton(
                "Открыть кабинет 🚀",
                web_app=WebAppInfo(url=web_app_url)
            )]
        ]
        logging.info(f"✅ Используем Web App кнопку для HTTPS URL: {web_app_url}")
    else:
        # HTTP - используем обычную ссылку (Telegram не позволяет Web App для HTTP)
        keyboard = [
            [InlineKeyboardButton(
                "Открыть кабинет 🌐",
                url=web_app_url
            )]
        ]
        logging.warning(f"⚠️ Используем обычную ссылку для HTTP URL: {web_app_url}")
        logging.warning("💡 Для Web App в Telegram настройте HTTPS!")
    return InlineKeyboardMarkup(keyboard)

def create_contact_keyboard() -> ReplyKeyboardMarkup:
    """Создает клавиатуру для запроса контакта"""
    keyboard = [
        [KeyboardButton("📱 Поделиться контактом", request_contact=True)]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)

