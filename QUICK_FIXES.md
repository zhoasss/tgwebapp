# 🔧 Быстрые исправления для проекта

## 1️⃣ СРОЧНО: Защитить токен бота

### Создайте файл `backend/.env`:

```env
BOT_TOKEN=получите_новый_токен_у_@BotFather
WEB_APP_URL=https://zhoasss.github.io/frontend/index.html
```

### Отзовите старый токен:
1. Откройте @BotFather в Telegram
2. Выполните команду `/mybots`
3. Выберите вашего бота
4. Нажмите "API Token" → "Revoke current token"
5. Получите новый токен и добавьте в `.env`

---

## 2️⃣ Обновите .gitignore

Создайте или обновите файл `backend/.gitignore`:

```gitignore
# Секреты
.env
*.env
p.env

# Логи
*.log
bot.log
api.log

# База данных
*.db
database.db

# Python
__pycache__/
*.pyc
*.pyo
venv/
.venv/
*.so

# IDE
.idea/
.vscode/
*.swp
*.swo

# MacOS
.DS_Store

# Temporary files
*.tmp
*.bak
```

Затем удалите логи из git:
```bash
cd backend
git rm --cached bot.log api.log database.db
git commit -m "Remove sensitive files from git"
```

---

## 3️⃣ Исправьте CORS

Отредактируйте `backend/api_server.py`:

```python
# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://zhoasss.github.io",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Init-Data"],
)
```

---

## 4️⃣ Создайте конфиг для API URL

Создайте файл `frontend/src/shared/config/api.js`:

```javascript
/**
 * Конфигурация API
 */

/**
 * Определяет URL API сервера в зависимости от окружения
 */
export function getApiBaseUrl() {
  // В разработке
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // В production - замените на URL вашего API сервера
  return 'https://your-api-server.com';
}

export const API_BASE_URL = getApiBaseUrl();
```

Обновите `frontend/src/shared/lib/profile-api.js`:

```javascript
import { getInitData } from './telegram.js';
import { API_BASE_URL } from '../config/api.js';  // Импортируем конфиг

// Удалите старую строку:
// const API_BASE_URL = 'http://localhost:8000';

// Остальной код без изменений
```

---

## 5️⃣ Добавьте валидацию в API

Обновите `backend/src/features/api/profile.py`:

```python
from pydantic import BaseModel, Field, validator
import re

class ProfileUpdate(BaseModel):
    """Схема для обновления профиля"""
    phone: str | None = Field(None, max_length=50, description="Номер телефона")
    business_name: str | None = Field(None, max_length=255, description="Название бизнеса")
    address: str | None = Field(None, max_length=500, description="Адрес")
    
    @validator('phone')
    def validate_phone(cls, v):
        """Валидация номера телефона"""
        if v is None or v == '':
            return v
        
        # Базовая проверка формата
        if not re.match(r'^\+?[\d\s\-()]{10,20}$', v):
            raise ValueError('Неверный формат номера телефона')
        
        return v.strip()
    
    @validator('business_name', 'address')
    def validate_string_fields(cls, v):
        """Валидация текстовых полей"""
        if v is None or v == '':
            return v
        
        # Удаляем лишние пробелы
        v = v.strip()
        
        # Проверяем на пустую строку после trim
        if not v:
            return None
        
        return v
```

---

## 6️⃣ Настройте ротацию логов

Обновите `backend/src/shared/logger/setup.py`:

```python
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging(log_file='bot.log', max_bytes=10*1024*1024, backup_count=5):
    """
    Настраивает логирование с ротацией файлов
    
    Args:
        log_file: Имя файла лога
        max_bytes: Максимальный размер файла (по умолчанию 10MB)
        backup_count: Количество резервных копий
    """
    
    # Определяем путь к директории backend
    backend_dir = Path(__file__).parent.parent.parent.parent
    log_path = backend_dir / log_file
    
    # Console handler
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    
    # File handler с ротацией
    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    
    # Формат логов
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    # Настройка root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[console, file_handler]
    )
    
    # Уменьшаем уровень логирования для httpx (слишком много INFO)
    logging.getLogger('httpx').setLevel(logging.WARNING)
```

Обновите вызовы в `main.py` и `api_server.py`:

```python
# В main.py
setup_logging(log_file='bot.log')

# В api_server.py  
setup_logging(log_file='api.log')
```

---

## 7️⃣ Улучшите обработку ошибок БД

В `backend/main.py` замените:

```python
# Инициализация базы данных
try:
    await init_database()
    logging.info("✅ База данных инициализирована успешно")
except Exception as e:
    logging.critical(f"❌ Критическая ошибка инициализации БД: {e}")
    raise SystemExit(1)  # Останавливаем приложение
```

---

## 8️⃣ Создайте файл с переменными окружения

Создайте `backend/env.example` (как шаблон):

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here

# Web App Configuration
WEB_APP_URL=https://zhoasss.github.io/frontend/index.html

# Database Configuration (для production)
# DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Environment
ENVIRONMENT=development
```

---

## 9️⃣ Добавьте health check в бота

В `backend/main.py` добавьте:

```python
import asyncio
import signal

class GracefulKiller:
    """Обработчик graceful shutdown"""
    kill_now = False
    
    def __init__(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)
    
    def exit_gracefully(self, *args):
        logging.info("🛑 Получен сигнал остановки")
        self.kill_now = True

async def run_bot():
    """Запускает бота"""
    # ... существующий код ...
    
    # Запуск polling
    await application.updater.start_polling(
        drop_pending_updates=False,
        allowed_updates=["message", "callback_query"]
    )
    
    # Graceful shutdown
    killer = GracefulKiller()
    
    try:
        while not killer.kill_now:
            await asyncio.sleep(1)
    finally:
        logging.info("⏹️ Остановка бота...")
        await application.stop()
        await application.shutdown()
```

---

## 🔟 Добавьте версионирование API

В `backend/api_server.py`:

```python
from datetime import datetime

@app.get("/")
async def root():
    """Корневой endpoint с информацией о сервере"""
    return {
        "service": "Личный кабинет API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "profile": "/api/profile/ (GET, PUT)",
            "health": "/health (GET)",
            "docs": "/docs (GET)"
        }
    }
```

---

## ✅ Порядок применения исправлений

1. **Сначала безопасность** (пункты 1-2)
2. **Затем конфигурация** (пункты 3-4)
3. **Потом улучшения** (пункты 5-10)

---

## 🧪 Тестирование после исправлений

```bash
# 1. Проверьте, что .env создан
cat backend/.env

# 2. Запустите API сервер
cd backend
python api_server.py

# 3. В другом терминале запустите бота
python main.py

# 4. Проверьте API
curl http://localhost:8000/health
curl http://localhost:8000/

# 5. Откройте бота в Telegram и протестируйте
```

---

## 📝 Дополнительные рекомендации

### Для production:

1. Используйте PostgreSQL:
```python
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///database.db"
)
```

2. Добавьте monitoring (Sentry):
```bash
pip install sentry-sdk
```

```python
import sentry_sdk
sentry_sdk.init(dsn="your-sentry-dsn")
```

3. Используйте gunicorn:
```bash
gunicorn api_server:app -w 4 -k uvicorn.workers.UvicornWorker
```

4. Настройте nginx как reverse proxy
5. Получите SSL сертификат (certbot)

---

**Важно:** После применения всех исправлений протестируйте приложение полностью!

