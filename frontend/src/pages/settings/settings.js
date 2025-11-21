/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

import pageLoader from '../../shared/ui/loader/loader.js';

// Маршруты для настроек
const SETTINGS_ROUTES = {
  'Профиль': '../profile/index.html',
  'График работы': '../schedule/index.html',
  'Услуги': '../services/index.html',
  'Управление': '../management/index.html',
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


      // Переход на страницу настройки
      if (route) {
        // Use navigateWithLoader if available, otherwise fallback to direct navigation
        if (window.navigateWithLoader) {
          window.navigateWithLoader(route);
        } else {
          window.location.href = route;
        }
      }
    });
  });

  console.log('✅ Страница настроек инициализирована');

  // Скрываем лоадер, так как страница загружена
  pageLoader.hide();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}

