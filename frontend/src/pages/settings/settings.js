/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');
  
  settingsItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent;
      console.log(`Клик на настройку: ${title}`);
      
      // Навигация к конкретным настройкам
      if (title.includes('Профиль')) {
        // Переход на страницу профиля
        window.location.href = '../profile/index.html';
      } else {
        // Для остальных пунктов показываем уведомление
        const message = `Настройка: ${title}\n\nСкоро здесь будет полная функциональность!`;
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert(message);
        } else {
          alert(message);
        }
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

