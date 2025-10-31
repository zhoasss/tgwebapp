/**
 * Управление темой приложения
 * Слой App - глобальная настройка темы
 */

function applyTheme() {
  let isDark = false;

  if (window.Telegram?.WebApp) {
    // Используем тему из Telegram
    isDark = window.Telegram.WebApp.colorScheme === 'dark';
  } else if (window.matchMedia) {
    // Используем системную тему
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.documentElement.className = isDark ? 'theme-dark' : '';
  console.log(`🎨 Тема применена: ${isDark ? 'темная' : 'светлая'}`);
}

// Применяем тему при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyTheme);
} else {
  applyTheme();
}

// Подписываемся на смену темы
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.onEvent('themeChanged', applyTheme);
  setTimeout(applyTheme, 100); // Дополнительная проверка
} else if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
}

