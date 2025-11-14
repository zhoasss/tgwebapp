# Telegram WebApp API - Руководство по использованию

## Оглавление
- [Инициализация](#инициализация)
- [Утилиты](#утилиты)
- [Методы](#методы)
- [События](#события)
- [Версии и совместимость](#версии-и-совместимость)
- [Лучшие практики](#лучшие-практики)

## Инициализация

WebApp инициализируется автоматически при загрузке приложения через `src/app/providers/telegram/init.js`.

### Что происходит при инициализации:

1. Вызывается `tg.ready()` - сообщает Telegram, что приложение готово
2. Вызывается `tg.expand()` - разворачивает приложение на весь экран
3. Отключаются вертикальные свайпы (если поддерживается)
4. Устанавливаются цвета заголовка и фона
5. Включается подтверждение закрытия

## Утилиты

Все утилиты для работы с Telegram WebApp находятся в `src/shared/lib/telegram.js`.

### Основные функции:

#### `getTelegramWebApp()`
Возвращает экземпляр Telegram WebApp или `null`.

```javascript
import { getTelegramWebApp } from '../../shared/lib/telegram.js';

const tg = getTelegramWebApp();
if (tg) {
  console.log('Версия:', tg.version);
}
```

#### `isTelegramWebApp()`
Проверяет, запущено ли приложение в Telegram.

```javascript
import { isTelegramWebApp } from '../../shared/lib/telegram.js';

if (isTelegramWebApp()) {
  console.log('Приложение запущено в Telegram');
}
```

#### `isVersionAtLeast(version)`
Проверяет версию Telegram WebApp.

```javascript
import { isVersionAtLeast } from '../../shared/lib/telegram.js';

if (isVersionAtLeast('6.2')) {
  // Используем функции, доступные с версии 6.2+
}
```

#### `showNotification(message, callback)`
Показывает уведомление пользователю. Автоматически выбирает между `showAlert` (Telegram) и `alert` (браузер).

```javascript
import { showNotification } from '../../shared/lib/telegram.js';

showNotification('Данные сохранены!', () => {
  console.log('Уведомление закрыто');
});
```

#### `showConfirmation(message, callback)`
Показывает диалог подтверждения. Автоматически выбирает между `showConfirm` (Telegram) и `confirm` (браузер).

```javascript
import { showConfirmation } from '../../shared/lib/telegram.js';

showConfirmation('Вы уверены?', (confirmed) => {
  if (confirmed) {
    console.log('Пользователь подтвердил');
  }
});
```

#### `getTelegramUser()`
Получает данные пользователя Telegram.

```javascript
import { getTelegramUser } from '../../shared/lib/telegram.js';

const user = getTelegramUser();
if (user) {
  console.log('ID:', user.id);
  console.log('Имя:', user.first_name);
  console.log('Username:', user.username);
}
```

#### `getTelegramTheme()`
Получает тему Telegram.

```javascript
import { getTelegramTheme } from '../../shared/lib/telegram.js';

const theme = getTelegramTheme();
console.log('Цветовая схема:', theme.colorScheme); // 'light' или 'dark'
console.log('Параметры темы:', theme.themeParams);
```

#### `onTelegramEvent(eventName, callback)`
Подписывается на событие Telegram WebApp.

```javascript
import { onTelegramEvent } from '../../shared/lib/telegram.js';

onTelegramEvent('themeChanged', () => {
  console.log('Тема изменилась');
});
```

#### `callTelegramMethod(methodName, minVersion, ...args)`
Безопасно вызывает метод Telegram WebApp с проверкой версии.

```javascript
import { callTelegramMethod } from '../../shared/lib/telegram.js';

// Вызов метода без проверки версии
callTelegramMethod('expand');

// Вызов метода с проверкой версии
callTelegramMethod('setHeaderColor', '6.1', 'bg_color');
```

## Методы

### Основные методы Telegram WebApp:

| Метод | Минимальная версия | Описание |
|-------|-------------------|----------|
| `ready()` | 6.0 | Сообщает, что Mini App готово |
| `expand()` | 6.0 | Разворачивает приложение |
| `close()` | 6.0 | Закрывает приложение |
| `showAlert(message, callback)` | 6.1 | Показывает уведомление |
| `showConfirm(message, callback)` | 6.2 | Показывает подтверждение |
| `showPopup(params, callback)` | 6.2 | Показывает кастомный попап |
| `disableVerticalSwipes()` | 7.7 | Отключает вертикальные свайпы |
| `setHeaderColor(color)` | 6.1 | Устанавливает цвет заголовка |
| `setBackgroundColor(color)` | 6.1 | Устанавливает цвет фона |
| `enableClosingConfirmation()` | 6.2 | Включает подтверждение закрытия |
| `openLink(url, options)` | 6.1 | Открывает ссылку |
| `openTelegramLink(url)` | 6.1 | Открывает Telegram ссылку |

## События

### Доступные события:

| Событие | Описание |
|---------|----------|
| `themeChanged` | Изменилась тема |
| `viewportChanged` | Изменился размер viewport |
| `mainButtonClicked` | Нажата главная кнопка |
| `backButtonClicked` | Нажата кнопка назад |
| `settingsButtonClicked` | Нажата кнопка настроек |
| `invoiceClosed` | Закрыт инвойс |
| `popupClosed` | Закрыт попап |

### Использование:

```javascript
import { onTelegramEvent, offTelegramEvent } from '../../shared/lib/telegram.js';

// Подписка на событие
const handler = () => console.log('Тема изменилась');
onTelegramEvent('themeChanged', handler);

// Отписка от события
offTelegramEvent('themeChanged', handler);
```

## Версии и совместимость

### Проверка версии перед использованием методов:

```javascript
import { isVersionAtLeast, callTelegramMethod } from '../../shared/lib/telegram.js';

// Ручная проверка
if (isVersionAtLeast('6.2')) {
  // Используем showConfirm
}

// Автоматическая проверка через callTelegramMethod
callTelegramMethod('showConfirm', '6.2', 'Вы уверены?', (result) => {
  console.log('Результат:', result);
});
```

### Таблица версий:

| Версия | Новые возможности |
|--------|-------------------|
| 6.0 | Базовые методы (ready, expand, close) |
| 6.1 | showAlert, setHeaderColor, setBackgroundColor, openLink |
| 6.2 | showConfirm, showPopup, enableClosingConfirmation |
| 6.4 | showScanQrPopup |
| 7.7 | disableVerticalSwipes |

## Лучшие практики

### 1. Всегда проверяйте доступность

```javascript
import { getTelegramWebApp } from '../../shared/lib/telegram.js';

const tg = getTelegramWebApp();
if (!tg) {
  console.warn('Telegram WebApp недоступен');
  return;
}
```

### 2. Используйте проверку версии

```javascript
import { callTelegramMethod } from '../../shared/lib/telegram.js';

// Правильно - с проверкой версии
callTelegramMethod('setHeaderColor', '6.1', 'bg_color');

// Неправильно - без проверки
tg.setHeaderColor('bg_color'); // Может вызвать ошибку в старых версиях
```

### 3. Обрабатывайте ошибки

```javascript
import { callTelegramMethod } from '../../shared/lib/telegram.js';

const result = callTelegramMethod('showAlert', '6.1', 'Сообщение');
if (result === null) {
  // Метод не сработал, используем fallback
  alert('Сообщение');
}
```

### 4. Используйте универсальные функции

```javascript
// Правильно - универсальная функция
import { showNotification } from '../../shared/lib/telegram.js';
showNotification('Сообщение');

// Неправильно - прямой вызов без fallback
tg.showAlert('Сообщение');
```

### 5. Инициализируйте приложение правильно

```javascript
// Правильный порядок инициализации:
1. Загрузить Telegram SDK (<script src="...">)
2. Вызвать ready()
3. Вызвать expand()
4. Настроить цвета и другие параметры
5. Подписаться на события
6. Загрузить контент приложения
```

### 6. Используйте CSS переменные темы

```css
/* Используйте переменные Telegram */
.button {
  background-color: var(--tg-theme-button-color, #3390ec);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.text {
  color: var(--tg-theme-text-color, #000000);
}
```

### 7. Тестируйте в разных версиях

- Тестируйте в Telegram Desktop
- Тестируйте в Telegram Mobile (iOS и Android)
- Проверяйте работу в разных версиях Telegram
- Используйте fallback для старых версий

## Примеры использования

### Пример 1: Показ уведомления

```javascript
import { showNotification } from '../../shared/lib/telegram.js';

function saveData() {
  // Сохраняем данные...
  
  showNotification('Данные успешно сохранены!', () => {
    // Код после закрытия уведомления
  });
}
```

### Пример 2: Подтверждение действия

```javascript
import { showConfirmation } from '../../shared/lib/telegram.js';

function deleteItem() {
  showConfirmation('Вы действительно хотите удалить этот элемент?', (confirmed) => {
    if (confirmed) {
      // Удаляем элемент
      console.log('Элемент удален');
    }
  });
}
```

### Пример 3: Работа с темой

```javascript
import { getTelegramTheme, onTelegramEvent } from '../../shared/lib/telegram.js';

function updateTheme() {
  const theme = getTelegramTheme();
  document.body.className = theme.colorScheme === 'dark' ? 'dark-mode' : 'light-mode';
}

// Применяем тему при загрузке
updateTheme();

// Обновляем тему при изменении
onTelegramEvent('themeChanged', updateTheme);
```

### Пример 4: Получение данных пользователя

```javascript
import { getTelegramUser, showNotification } from '../../shared/lib/telegram.js';

function greetUser() {
  const user = getTelegramUser();
  if (user) {
    showNotification(`Привет, ${user.first_name}!`);
  }
}
```

## Дополнительные ресурсы

- [Официальная документация Telegram WebApp](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Примеры Telegram Mini Apps](https://github.com/telegram-mini-apps)

