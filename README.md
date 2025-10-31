# Личный кабинет - Telegram Mini App

Проект организован по архитектуре **FSD (Feature-Sliced Design)**.

## 📁 Структура проекта

```
├── backend/                  # Python Telegram бот
│   ├── main.py              # Точка входа
│   ├── requirements.txt     # Зависимости Python
│   ├── p.env               # Переменные окружения
│   └── src/
│       ├── shared/          # Общие утилиты
│       │   ├── config/      # Конфигурация
│       │   └── logger/      # Логирование
│       └── features/        # Функциональность
│           └── start_command/  # Команда /start
│
└── frontend/                # Telegram Mini App
    ├── index.html          # Главная страница
    └── src/
        ├── app/             # Глобальные настройки
        │   ├── styles/      # CSS переменные и глобальные стили
        │   ├── providers/   # Инициализация (Telegram SDK)
        │   └── config/      # Конфигурация (темы)
        │
        ├── pages/           # Страницы приложения
        │   ├── records/     # Страница записей
        │   └── settings/    # Страница настроек
        │
        ├── widgets/         # Составные блоки UI
        │   ├── footer-navigation/  # Нижняя навигация
        │   └── settings-menu/      # Меню настроек
        │
        ├── entities/        # Бизнес-сущности
        │   └── record/      # Запись (карточка)
        │
        └── shared/          # Переиспользуемый код
            ├── ui/          # UI компоненты
            └── lib/         # Утилиты
```

## 🚀 Запуск проекта

### Backend (Telegram бот)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend (GitHub Pages)

Frontend автоматически публикуется на GitHub Pages:
`https://zhoasss.github.io/frontend/index.html`

## 🎯 Архитектура FSD

### Слои (от верхнего к нижнему):

1. **`app/`** - Инициализация приложения, глобальные настройки
2. **`pages/`** - Страницы приложения (роутинг)
3. **`widgets/`** - Составные блоки UI
4. **`features/`** - Пользовательские сценарии
5. **`entities/`** - Бизнес-сущности
6. **`shared/`** - Переиспользуемый код

### Правила:
- ✅ Слой может импортировать только из слоев ниже
- ✅ `shared` используется всеми слоями
- ❌ Нельзя импортировать из слоев выше

## 🔧 Технологии

**Backend:**
- Python 3.x
- python-telegram-bot
- python-dotenv

**Frontend:**
- HTML5
- CSS3 (CSS Variables)
- Vanilla JavaScript (ES6+)
- Telegram Web App SDK

## 📝 Конфигурация

Создайте файл `backend/p.env`:

```env
BOT_TOKEN=your_bot_token_here
WEB_APP_URL=https://zhoasss.github.io/frontend/index.html
```

## 🎨 Темы

Приложение поддерживает светлую и темную темы:
- Автоматическое определение темы Telegram
- Поддержка системной темы браузера
- Плавные переходы между темами

## 📱 Функции

- 📅 Просмотр записей
- ⚙️ Настройки профиля
- 👥 Управление клиентами
- ✂️ Управление услугами
- ⏰ График работы

## 🔗 Ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [FSD Documentation](https://feature-sliced.design/)

