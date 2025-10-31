from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

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
        "Нажмите на кнопку ниже, чтобы открыть кабинет прямо в Telegram! 🚀"
    )

def create_keyboard(web_app_url: str) -> InlineKeyboardMarkup:
    """Создает клавиатуру с кнопкой открытия Mini App"""
    keyboard = [
        [InlineKeyboardButton(
            "Открыть кабинет 🚀",
            web_app=WebAppInfo(url=web_app_url)
        )]
    ]
    return InlineKeyboardMarkup(keyboard)

