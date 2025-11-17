from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup

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
    """Создает клавиатуру с кнопкой открытия Mini App"""
    # Всегда используем Web App кнопку (Telegram требует HTTPS для Web Apps)
    # Если URL не HTTPS, кнопка будет открывать в браузере через Telegram
    keyboard = [
        [InlineKeyboardButton(
            "Открыть кабинет 🚀",
            web_app=WebAppInfo(url=web_app_url)
        )]
    ]
    return InlineKeyboardMarkup(keyboard)

def create_contact_keyboard() -> ReplyKeyboardMarkup:
    """Создает клавиатуру для запроса контакта"""
    keyboard = [
        [KeyboardButton("📱 Поделиться контактом", request_contact=True)]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)

