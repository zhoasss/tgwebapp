/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

import { showNotification } from '../../shared/lib/telegram.js';

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');
  
  settingsItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent;
      console.log(`Клик на настройку: ${title}`);
      
      // Используем универсальную функцию showNotification
      // Она автоматически выберет между Telegram showAlert и обычным alert
      showNotification(`Настройка: ${title}`);
    });
  });
  
  console.log('✅ Страница настроек инициализирована');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}

