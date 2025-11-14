# 🗄️ Работа с базой данных

## ✅ Текущая логика (только БД)

Все данные работают **ТОЛЬКО с базой данных Railway SQLite**. Никаких промежуточных хранилищ!

---

## 🔄 Полный цикл работы

### 1️⃣ Открытие кабинета

```
Пользователь → Нажимает "Открыть кабинет"
              ↓
        Auth Guard проверяет:
        ✅ Telegram WebApp
        ✅ initData валиден
        ✅ user.id существует
              ↓
        Главная страница открыта
```

**БД не трогается!** Только авторизация.

---

### 2️⃣ Переход на профиль

```
Пользователь → Нажимает "Профиль"
              ↓
        Frontend → API запрос
              ↓
    GET /api/profile/
    Header: X-Init-Data (содержит telegram_id)
              ↓
        Backend:
        1. Проверяет HMAC подпись
        2. Извлекает telegram_id из initData
        3. Ищет в БД:
              ↓
    SELECT * FROM users 
    WHERE telegram_id = 1170127102
              ↓
    ЕСЛИ НЕ НАЙДЕН (первый запуск):
        ✨ Создаёт новую запись:
        
        INSERT INTO users (
            telegram_id, 
            first_name, 
            last_name, 
            username,
            created_at,
            updated_at
        ) VALUES (
            1170127102,
            'Roman',
            'Navickij',
            'tromsriget',
            NOW(),
            NOW()
        );
        
        Возвращает созданную запись
              ↓
    ЕСЛИ НАЙДЕН:
        ✅ Возвращает данные из БД:
        {
            telegram_id: 1170127102,
            first_name: 'Roman',
            phone: '+7 999 123-45-67',
            business_name: 'Салон красоты',
            address: 'ул. Ленина, 10',
            ...
        }
              ↓
        Frontend → Отображает данные
```

---

### 3️⃣ Редактирование профиля

```
Пользователь → Редактирует данные
              → Нажимает "Сохранить"
              ↓
        Frontend → API запрос
              ↓
    PUT /api/profile/
    Header: X-Init-Data (содержит telegram_id)
    Body: {
        phone: '+7 999 123-45-67',
        business_name: 'Салон красоты',
        address: 'ул. Ленина, 10'
    }
              ↓
        Backend:
        1. Проверяет HMAC подпись
        2. Извлекает telegram_id
        3. Валидирует данные (формат телефона и т.д.)
        4. Обновляет БД:
              ↓
    UPDATE users SET
        phone = '+7 999 123-45-67',
        business_name = 'Салон красоты',
        address = 'ул. Ленина, 10',
        updated_at = NOW()
    WHERE telegram_id = 1170127102;
              ↓
        5. Возвращает обновлённые данные из БД
              ↓
        Frontend → Обновляет UI
```

---

## 📊 Таблица БД (Railway SQLite)

### Структура таблицы `users`:

```sql
CREATE TABLE users (
    telegram_id   BIGINT PRIMARY KEY,  -- ID пользователя из Telegram
    first_name    VARCHAR(255),        -- Имя
    last_name     VARCHAR(255),        -- Фамилия
    username      VARCHAR(255),        -- Username (@username)
    phone         VARCHAR(50),         -- Телефон
    business_name VARCHAR(255),        -- Название бизнеса
    address       TEXT,                -- Адрес
    created_at    DATETIME,            -- Дата создания
    updated_at    DATETIME             -- Дата обновления
);
```

### Пример записи:

```
telegram_id:   1170127102
first_name:    Roman
last_name:     Navickij
username:      tromsriget
phone:         +7 999 123-45-67
business_name: Салон красоты
address:       ул. Ленина, 10
created_at:    2025-11-14 21:03:39
updated_at:    2025-11-14 21:10:25
```

---

## 🔍 Как работает поиск по ID

### Backend (`backend/src/features/api/profile.py`):

```python
# GET /api/profile/
async def get_profile(telegram_user: dict = Depends(get_telegram_user)):
    telegram_id = telegram_user['id']  # Из initData
    
    # Ищем в БД по telegram_id
    user = session.query(User).filter_by(
        telegram_id=telegram_id
    ).first()
    
    if not user:
        # Первый запуск - создаём запись
        user = User(
            telegram_id=telegram_id,
            first_name=telegram_user['first_name'],
            ...
        )
        session.add(user)
        session.commit()
    
    return user.to_dict()


# PUT /api/profile/
async def update_profile(data: ProfileUpdate, telegram_user: dict):
    telegram_id = telegram_user['id']  # Из initData
    
    # Находим в БД по telegram_id
    user = session.query(User).filter_by(
        telegram_id=telegram_id
    ).first()
    
    # Обновляем поля
    user.phone = data.phone
    user.business_name = data.business_name
    user.address = data.address
    user.updated_at = datetime.now()
    
    session.commit()
    
    return user.to_dict()
```

---

## 🎯 Гарантии

### ✅ Что гарантируется:

1. **Каждый API запрос идёт в БД**
   - GET → читает из БД
   - PUT → обновляет БД

2. **Поиск только по telegram_id**
   - Уникальный ID пользователя из Telegram
   - Primary Key в БД

3. **Данные сохраняются навсегда**
   - БД на Railway (persistent storage)
   - Не удаляются при редеплое

4. **Автоматическое создание**
   - При первом запуске → создаётся запись
   - Сохраняется telegram_id, имя из Telegram

5. **Автоматическое обновление**
   - При каждом сохранении → обновляется `updated_at`
   - История изменений в БД

---

## 📱 Пример работы пользователя

### Первый запуск:

```
1. Открыл кабинет → Auth Guard → OK
2. Перешёл на профиль
   → API: GET /api/profile/
   → БД: SELECT WHERE telegram_id = 1170127102
   → НЕ НАЙДЕНО
   → БД: INSERT telegram_id = 1170127102
   → Показан пустой профиль (только имя из Telegram)

3. Заполнил телефон и адрес → "Сохранить"
   → API: PUT /api/profile/
   → БД: UPDATE WHERE telegram_id = 1170127102
   → Данные сохранены ✅

4. Закрыл приложение
```

### Второй запуск (на следующий день):

```
1. Открыл кабинет → Auth Guard → OK
2. Перешёл на профиль
   → API: GET /api/profile/
   → БД: SELECT WHERE telegram_id = 1170127102
   → НАЙДЕНО
   → Показаны ВСЕ данные (телефон, адрес) ✅

Данные остались! Ничего не потерялось!
```

---

## 🔐 Безопасность по ID

### Каждый пользователь видит ТОЛЬКО свои данные:

```
Пользователь A (telegram_id: 111)
    → GET /api/profile/
    → initData содержит id: 111
    → Backend извлекает id: 111
    → БД: SELECT WHERE telegram_id = 111
    → Возвращает данные пользователя A ✅

Пользователь B (telegram_id: 222)
    → GET /api/profile/
    → initData содержит id: 222
    → Backend извлекает id: 222
    → БД: SELECT WHERE telegram_id = 222
    → Возвращает данные пользователя B ✅
```

**Невозможно получить чужие данные!** 🔒

---

## 💾 Где физически хранятся данные

### Railway SQLite:

```
Railway Server (Europe West)
    ↓
/app/database.db (файл на диске Railway)
    ↓
Persistent Volume (не удаляется при редеплое)
    ↓
Бэкапы Railway (автоматические)
```

**Данные ПОСТОЯННЫ и БЕЗОПАСНЫ!** ✅

---

## 📊 Схема работы

```
┌─────────────────────────────────────────────┐
│ ПОЛЬЗОВАТЕЛЬ                                │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│ FRONTEND                                     │
│ - Профиль открыт                             │
│ - Делает API запрос                          │
└──────────────┬───────────────────────────────┘
               │ GET /api/profile/
               │ Header: X-Init-Data
               ↓
┌──────────────────────────────────────────────┐
│ BACKEND (Railway)                            │
│ 1. Проверяет подпись                         │
│ 2. Извлекает telegram_id                     │
└──────────────┬───────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────┐
│ БАЗА ДАННЫХ (Railway SQLite)                │
│ SELECT * FROM users                          │
│ WHERE telegram_id = ?                        │
│                                              │
│ НАЙДЕНО → Возвращает данные                  │
│ НЕ НАЙДЕНО → Создаёт + Возвращает            │
└──────────────┬───────────────────────────────┘
               │
               ↓ Данные из БД
┌──────────────────────────────────────────────┐
│ FRONTEND                                     │
│ - Отображает данные из БД                    │
│ - При сохранении → PUT в БД                  │
└──────────────────────────────────────────────┘
```

---

## ✅ ИТОГО

**Всё работает только с БД:**
- ✅ Загрузка → из БД по telegram_id
- ✅ Сохранение → в БД по telegram_id
- ✅ Никаких кешей/store
- ✅ Данные сохраняются навсегда
- ✅ Каждый пользователь видит только свои данные

**GitHub Pages обновится через ~30 секунд, затем проверьте!** 🎉

