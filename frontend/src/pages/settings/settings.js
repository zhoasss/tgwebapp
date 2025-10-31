/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');
  
  settingsItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent;
      console.log(`Клик на настройку: ${title}`);
      
      // Здесь добавить навигацию к конкретным настройкам
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert(`Настройка: ${title}`);
      } else {
        alert(`Настройка: ${title}`);
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

