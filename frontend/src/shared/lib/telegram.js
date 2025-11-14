/**
 * Утилиты для работы с Telegram WebApp API
 * Слой Shared - переиспользуемый код
 */

/**
 * Получает экземпляр Telegram WebApp
 * @returns {Object|null} Telegram WebApp или null
 */
export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

/**
 * Проверяет, запущено ли приложение в Telegram WebApp
 * @returns {boolean}
 */
export function isTelegramWebApp() {
  const tg = getTelegramWebApp();
  return tg !== null && tg.initData && tg.initData.length > 0;
}

/**
 * Проверяет версию Telegram WebApp
 * @param {string} requiredVersion - Минимальная требуемая версия (например, "6.1")
 * @returns {boolean}
 */
export function isVersionAtLeast(requiredVersion) {
  const tg = getTelegramWebApp();
  if (!tg) return false;
  
  const currentVersion = tg.version || '0.0';
  
  // Разбиваем версии на части и сравниваем
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
 * Безопасный вызов метода Telegram WebApp с проверкой существования
 * @param {string} methodName - Название метода
 * @param {string|null} minVersion - Минимальная версия (опционально)
 * @param  {...any} args - Аргументы метода
 * @returns {any|null} Результат вызова или null
 */
export function callTelegramMethod(methodName, minVersion = null, ...args) {
  const tg = getTelegramWebApp();
  if (!tg) {
    console.warn(`⚠️ Telegram WebApp недоступен для вызова ${methodName}`);
    return null;
  }
  
  // Проверяем версию, если указана
  if (minVersion && !isVersionAtLeast(minVersion)) {
    console.warn(
      `⚠️ Метод ${methodName} требует версию ${minVersion} или выше. ` +
      `Текущая версия: ${tg.version || 'unknown'}`
    );
    return null;
  }
  
  const method = tg[methodName];
  
  if (typeof method !== 'function') {
    console.warn(`⚠️ Метод ${methodName} не доступен в Telegram WebApp`);
    return null;
  }
  
  try {
    return method.apply(tg, args);
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${methodName}:`, error);
    return null;
  }
}

/**
 * Показывает уведомление пользователю
 * Автоматически выбирает между showAlert (Telegram) и alert (браузер)
 * @param {string} message - Текст сообщения
 * @param {Function} callback - Callback после закрытия (опционально)
 */
export function showNotification(message, callback = null) {
  // Пытаемся использовать showAlert из Telegram (требует версию 6.1+)
  const result = callTelegramMethod('showAlert', '6.1', message, callback);
  
  if (result === null) {
    // Fallback на обычный alert
    alert(message);
    if (callback) callback();
  }
}

/**
 * Показывает подтверждение пользователю
 * Автоматически выбирает между showConfirm (Telegram) и confirm (браузер)
 * @param {string} message - Текст сообщения
 * @param {Function} callback - Callback с результатом (boolean)
 */
export function showConfirmation(message, callback) {
  // Пытаемся использовать showConfirm из Telegram (требует версию 6.2+)
  const result = callTelegramMethod('showConfirm', '6.2', message, callback);
  
  if (result === null) {
    // Fallback на обычный confirm
    const confirmed = confirm(message);
    if (callback) callback(confirmed);
  }
}

/**
 * Получает данные инициализации Telegram WebApp
 * @returns {string|null}
 */
export function getInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || null;
}

/**
 * Получает данные пользователя из Telegram
 * @returns {Object|null}
 */
export function getTelegramUser() {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
}

/**
 * Получает тему Telegram
 * @returns {Object} Объект с информацией о теме
 */
export function getTelegramTheme() {
  const tg = getTelegramWebApp();
  
  return {
    colorScheme: tg?.colorScheme || 'light',
    themeParams: tg?.themeParams || {},
    headerColor: tg?.headerColor || '',
    backgroundColor: tg?.backgroundColor || ''
  };
}

/**
 * Подписывается на событие Telegram WebApp
 * @param {string} eventName - Название события
 * @param {Function} callback - Обработчик события
 */
export function onTelegramEvent(eventName, callback) {
  const tg = getTelegramWebApp();
  if (!tg) {
    console.warn(`⚠️ Невозможно подписаться на событие ${eventName} - Telegram WebApp недоступен`);
    return;
  }
  
  if (typeof tg.onEvent === 'function') {
    tg.onEvent(eventName, callback);
  } else {
    console.warn(`⚠️ Метод onEvent недоступен в Telegram WebApp`);
  }
}

/**
 * Отписывается от события Telegram WebApp
 * @param {string} eventName - Название события
 * @param {Function} callback - Обработчик события
 */
export function offTelegramEvent(eventName, callback) {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  if (typeof tg.offEvent === 'function') {
    tg.offEvent(eventName, callback);
  }
}

/**
 * Закрывает Mini App
 */
export function closeTelegramApp() {
  callTelegramMethod('close');
}

/**
 * Открывает ссылку в Telegram или браузере
 * @param {string} url - URL для открытия
 * @param {Object} options - Опции открытия
 */
export function openTelegramLink(url, options = {}) {
  callTelegramMethod('openLink', '6.1', url, options);
}

/**
 * Открывает другой бот или Mini App
 * @param {string} url - tg:// URL
 */
export function openTelegramUrl(url) {
  callTelegramMethod('openTelegramLink', '6.1', url);
}

