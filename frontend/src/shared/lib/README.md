# Navigation with Loader

## Проблема
При нажатии на кнопки навигации в футере, сначала на 0.5 секунды появлялась новая страница, и только потом показывался loader. Это создавало неприятный визуальный эффект.

## Решение
Создан модуль `navigation.js`, который показывает loader **сразу** при нажатии на кнопку, перед переходом на новую страницу.

## Как это работает

### 1. Модуль навигации (`src/shared/lib/navigation.js`)
- Функция `navigateWithLoader(url, delay)` - показывает loader и переходит на указанный URL
- Функция `setupFooterNavigation()` - автоматически инициализирует обработчики для всех кнопок с атрибутом `data-href`
- Автоматическая инициализация при загрузке страницы

### 2. Изменения в HTML
Все кнопки навигации в футере теперь используют атрибут `data-href` вместо `onclick`:

**Было:**
```html
<button class="footer-btn" onclick="window.location.href='../settings/index.html'">
```

**Стало:**
```html
<button class="footer-btn" data-href="../settings/index.html">
```

### 3. Последовательность событий
1. Пользователь нажимает на кнопку
2. **Сразу** появляется loader (300ms задержка по умолчанию)
3. Происходит переход на новую страницу
4. Новая страница загружается с уже видимым loader
5. Loader скрывается после полной загрузки страницы

## Обновленные файлы

### HTML страницы
- `frontend/index.html`
- `frontend/src/pages/profile/index.html`
- `frontend/src/pages/settings/index.html`
- `frontend/src/pages/schedule/index.html`
- `frontend/src/pages/services/index.html`
- `frontend/src/pages/management/index.html`

### JavaScript
- `frontend/src/shared/lib/navigation.js` (новый файл)
- `frontend/src/pages/settings/settings.js` (обновлен для использования navigateWithLoader)

## Использование

### Автоматическое (для кнопок футера)
Просто добавьте атрибут `data-href` к кнопке:
```html
<button class="footer-btn" data-href="/path/to/page.html">
  Кнопка
</button>
```

### Программное
```javascript
// Использовать глобальную функцию
window.navigateWithLoader('/path/to/page.html');

// Или импортировать
import { navigateWithLoader } from './shared/lib/navigation.js';
navigateWithLoader('/path/to/page.html', 500); // с кастомной задержкой
```
