/**
 * Управление темой приложения
 * Слой App - глобальная настройка темы
 */

import { getTelegramTheme, onTelegramEvent } from '../../shared/lib/telegram.js';

function applyTheme() {
  let isDark = false;

  // Получаем тему из Telegram WebApp
  const theme = getTelegramTheme();
  isDark = theme.colorScheme === 'dark';
  
  // Применяем цвета из темы Telegram
  if (theme.themeParams && Object.keys(theme.themeParams).length > 0) {
    const root = document.documentElement;
    
    // Применяем CSS переменные из темы Telegram
    const params = theme.themeParams;
    
    if (params.bg_color) {
      root.style.setProperty('--tg-theme-bg-color', params.bg_color);
    }
    if (params.text_color) {
      root.style.setProperty('--tg-theme-text-color', params.text_color);
    }
    if (params.hint_color) {
      root.style.setProperty('--tg-theme-hint-color', params.hint_color);
    }
    if (params.link_color) {
      root.style.setProperty('--tg-theme-link-color', params.link_color);
    }
    if (params.button_color) {
      root.style.setProperty('--tg-theme-button-color', params.button_color);
    }
    if (params.button_text_color) {
      root.style.setProperty('--tg-theme-button-text-color', params.button_text_color);
    }
    if (params.secondary_bg_color) {
      root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color);
    }
  } else if (window.matchMedia) {
    // Fallback: используем системную тему
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

// Подписываемся на смену темы через правильный API
onTelegramEvent('themeChanged', () => {
  console.log('🔄 Событие themeChanged получено');
  applyTheme();
});

// Fallback для браузера
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
}

