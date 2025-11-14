/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

/**
 * Проверяет, поддерживается ли версия Telegram WebApp
 */
function versionAtLeast(requiredVersion) {
  if (!window.Telegram?.WebApp) {
    return false;
  }
  
  const tg = window.Telegram.WebApp;
  const currentVersion = tg.version || '0.0';
  
  // Функция для сравнения версий (например, "6.0" vs "6.1")
  const parseVersion = (v) => v.split('.').map(Number);
  const current = parseVersion(currentVersion);
  const required = parseVersion(requiredVersion);
  
  for (let i = 0; i < Math.max(current.length, required.length); i++) {
    const currentPart = current[i] || 0;
    const requiredPart = required[i] || 0;
    
    if (currentPart > requiredPart) return true;
    if (currentPart < requiredPart) return false;
  }
  
  return true; // Версии равны
}

/**
 * Безопасный вызов метода Telegram WebApp с проверкой поддержки
 */
function safeTelegramCall(methodName, minVersion, ...args) {
  if (!window.Telegram?.WebApp) {
    return false;
  }
  
  const tg = window.Telegram.WebApp;
  
  // Проверяем версию, если указана минимальная версия
  if (minVersion && !versionAtLeast(minVersion)) {
    console.warn(`⚠️ Метод ${methodName} требует версию ${minVersion} или выше. Текущая версия: ${tg.version || 'unknown'}`);
    return false;
  }
  
  const method = tg[methodName];
  
  if (typeof method !== 'function') {
    console.warn(`⚠️ Метод ${methodName} не доступен в Telegram WebApp`);
    return false;
  }
  
  try {
    // Вызываем метод с обработкой ошибок
    const result = method.apply(tg, args);
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${methodName}:`, error);
    return false;
  }
}

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');
  
  settingsItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent;
      console.log(`Клик на настройку: ${title}`);
      
      // Для версии 6.0 и ниже используем обычный alert, так как showAlert может использовать
      // внутри showPopup, который не поддерживается в версии 6.0
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const version = tg.version || '0.0';
        
        // Проверяем, что версия выше 6.0 (например, 6.1+)
        if (versionAtLeast('6.1')) {
          const success = safeTelegramCall('showAlert', null, `Настройка: ${title}`);
          if (success) {
            return; // Успешно вызвали showAlert
          }
        }
      }
      
      // Fallback на обычный alert для версии 6.0 и ниже или если метод не доступен
      alert(`Настройка: ${title}`);
    });
  });
  
  console.log('✅ Страница настроек инициализирована');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}

