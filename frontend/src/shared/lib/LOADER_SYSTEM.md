# Loader Navigation System - Technical Summary

## Проблема
Loader показывался дважды при навигации между страницами:
1. При клике на кнопку
2. При загрузке новой страницы

## Решение

### Архитектура
Система использует `sessionStorage` для отслеживания состояния навигации между страницами.

### Компоненты

#### 1. `loader.js` - Управление loader
```javascript
// Loader создается скрытым
<div class="loader-container hidden" id="page-loader">

// При создании экземпляра проверяем флаг навигации
const isNavigating = sessionStorage.getItem('isNavigating') === 'true';

if (!isNavigating) {
    // Первая загрузка - показываем loader
    pageLoader.show();
} else {
    // Навигация - loader уже показан с предыдущей страницы
    // Ничего не делаем
}
```

#### 2. `navigation.js` - Управление переходами
```javascript
export function navigateWithLoader(url) {
    // Показываем существующий loader
    const loader = document.getElementById('page-loader');
    loader.classList.remove('hidden');
    
    // Устанавливаем флаг навигации
    sessionStorage.setItem('isNavigating', 'true');
    
    // Переходим на новую страницу
    window.location.href = url;
}
```

### Последовательность событий

#### Сценарий 1: Первая загрузка страницы
1. ✅ Loader создается скрытым
2. ✅ Проверка: `isNavigating` = `false` (нет флага)
3. ✅ Loader показывается
4. ✅ Страница загружается
5. ✅ Loader скрывается через 1.5-2 сек

#### Сценарий 2: Навигация между страницами
1. ✅ Пользователь кликает на кнопку
2. ✅ `navigateWithLoader()` показывает loader
3. ✅ Устанавливается флаг: `sessionStorage.setItem('isNavigating', 'true')`
4. ✅ Переход на новую страницу
5. ✅ Новая страница: loader создается скрытым
6. ✅ Проверка: `isNavigating` = `true` (флаг есть)
7. ✅ Loader НЕ показывается повторно (уже виден)
8. ✅ Флаг удаляется: `sessionStorage.removeItem('isNavigating')`
9. ✅ Страница загружается
10. ✅ Loader скрывается через 1.5-2 сек

### Ключевые моменты

1. **Один loader на все случаи**: Используется один и тот же `page-loader` для первой загрузки и навигации

2. **SessionStorage как мост**: Флаг `isNavigating` передает информацию между страницами

3. **Скрытый по умолчанию**: Loader создается скрытым, видимость контролируется программно

4. **Автоматическая очистка**: Флаг `isNavigating` автоматически удаляется после проверки

## Преимущества

- ✅ Нет дублирования loader
- ✅ Плавные переходы между страницами
- ✅ Единая точка управления loader
- ✅ Простая и понятная логика
- ✅ Минимальная задержка (100ms)

## Файлы

- `frontend/src/shared/ui/loader/loader.js` - Логика loader
- `frontend/src/shared/lib/navigation.js` - Логика навигации
- Все HTML страницы используют `data-href` для навигации
