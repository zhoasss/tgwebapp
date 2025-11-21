# Page Loader Component

Компонент для отображения анимации загрузки на всех страницах приложения.

## Структура

```
shared/ui/loader/
├── loader.css    # Стили loader'а
├── loader.js     # Логика управления loader'ом
└── README.md     # Документация
```

## Использование

### Автоматическое использование

Loader автоматически:
- Показывается при загрузке страницы
- Скрывается после полной загрузки страницы (событие `window.load`)
- Имеет плавную анимацию появления/исчезновения

### Ручное управление

Если вам нужно управлять loader'ом вручную (например, при AJAX запросах):

```javascript
import pageLoader from '../../shared/ui/loader/loader.js';

// Показать loader
pageLoader.show();

// Скрыть loader
pageLoader.hide();

// Скрыть loader с задержкой (в миллисекундах)
pageLoader.hideAfter(500);
```

### Пример использования с API запросами

```javascript
import pageLoader from '../../shared/ui/loader/loader.js';

async function loadData() {
  // Показываем loader перед запросом
  pageLoader.show();
  
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Обрабатываем данные
    displayData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Скрываем loader после завершения
    pageLoader.hide();
  }
}
```

## Стили

Loader использует следующие CSS переменные и стили:

- **Размер**: `--s: 20px` (можно изменить в `loader.css`)
- **Цвета**: `#fff`, `#666`, `#aaa` (можно настроить под вашу тему)
- **Анимация**: 2 секунды, бесконечная
- **Фон контейнера**: Полупрозрачный белый `rgba(255, 255, 255, 0.95)`

### Кастомизация

Чтобы изменить размер loader'а:

```css
.loader {
  --s: 30px; /* Увеличить размер */
}
```

Чтобы изменить цвета:

```css
.loader:before,
.loader:after {
  background:
    conic-gradient(from -90deg at calc(100% - var(--_d)) var(--_d),
     #your-color-1 135deg,
     #your-color-2 0 270deg,
     #your-color-3 0);
}
```

## Интеграция на новую страницу

1. Добавьте CSS в `<head>`:
```html
<link rel="stylesheet" href="../../shared/ui/loader/loader.css?v=1.0.0">
```

2. Добавьте JS перед закрывающим `</body>`:
```html
<script type="module" src="../../shared/ui/loader/loader.js?v=1.0.0"></script>
```

## Технические детали

- **z-index**: 9999 (отображается поверх всего контента)
- **position**: fixed (покрывает весь экран)
- **transition**: opacity 0.3s ease-out (плавное исчезновение)
- **pointer-events**: none (когда скрыт, не блокирует клики)

## Браузерная совместимость

Loader использует современные CSS функции:
- CSS Grid
- CSS Custom Properties (переменные)
- CSS Animations
- clip-path
- conic-gradient

Поддерживается всеми современными браузерами (Chrome, Firefox, Safari, Edge).
