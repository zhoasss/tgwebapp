/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

import { showNotification } from '../../shared/lib/telegram.js';

// Маршруты для настроек
const SETTINGS_ROUTES = {
  'Профиль': null, // Будет добавлено позже
  'График работы': null, // Будет добавлено позже
  'Услуги': null, // Будет добавлено позже
  'Управление': null, // Будет добавлено позже
};

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');
  
  settingsItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent.trim();
      // Убираем эмодзи для поиска в маршрутах
      const cleanTitle = title.replace(/^[^\w\s]+\s*/, '');
      
      console.log(`Клик на настройку: ${cleanTitle}`);
      
      // Проверяем, есть ли маршрут для этой настройки
      const route = SETTINGS_ROUTES[cleanTitle];
      
      if (route) {
        // Переход на страницу настройки
        window.location.href = route;
      } else {
        // Показываем уведомление, что функция будет доступна позже
        showNotification(
          `Раздел "${cleanTitle}" будет доступен в следующих обновлениях!`
        );
      }
    });
  });
  
  console.log('✅ Страница настроек инициализирована');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}

