/**
 * Модуль авторизации через Telegram WebApp
 * Слой Shared - переиспользуемый код
 */

import { getTelegramWebApp, getTelegramUser, getInitData, showNotification } from './telegram.js';

/**
 * Проверяет, авторизован ли пользователь через Telegram
 * @returns {boolean} true если пользователь авторизован
 */
export function isAuthenticated() {
  const tg = getTelegramWebApp();
  
  if (!tg) {
    console.error('❌ Telegram WebApp недоступен');
    return false;
  }
  
  // Проверяем наличие initData
  const initData = getInitData();
  if (!initData || initData.length === 0) {
    console.error('❌ initData отсутствует');
    return false;
  }
  
  // Проверяем наличие данных пользователя
  const user = getTelegramUser();
  if (!user || !user.id) {
    console.error('❌ Данные пользователя отсутствуют');
    return false;
  }
  
  console.log('✅ Пользователь авторизован:', user.id, user.first_name);
  return true;
}

/**
 * Требует авторизацию пользователя
 * Если пользователь не авторизован - показывает ошибку и блокирует доступ
 * @param {Function} onUnauthorized - Callback при отсутствии авторизации
 * @returns {boolean} true если авторизован
 */
export function requireAuth(onUnauthorized = null) {
  if (!isAuthenticated()) {
    console.error('🔒 Доступ запрещен: требуется авторизация через Telegram');
    
    const errorMessage = 
      'Для использования приложения необходимо открыть его через Telegram бота.\n\n' +
      'Пожалуйста, запустите бота и нажмите кнопку "Открыть кабинет".';
    
    showNotification(errorMessage, () => {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // По умолчанию закрываем приложение
        const tg = getTelegramWebApp();
        if (tg && typeof tg.close === 'function') {
          tg.close();
        }
      }
    });
    
    return false;
  }
  
  return true;
}

/**
 * Получает данные авторизованного пользователя
 * @returns {Object|null} Данные пользователя или null
 */
export function getAuthenticatedUser() {
  if (!isAuthenticated()) {
    return null;
  }
  
  return getTelegramUser();
}

/**
 * Проверяет валидность initData (базовая проверка)
 * Полная проверка происходит на backend
 * @returns {boolean} true если initData выглядит валидным
 */
export function validateInitData() {
  const initData = getInitData();

  console.log('🔍 validateInitData - проверка:', {
    hasInitData: !!initData,
    initDataPreview: initData ? initData.substring(0, 100) + '...' : 'null'
  });

  if (!initData) {
    console.error('❌ validateInitData: initData отсутствует');
    return false;
  }

  // Проверяем, что initData содержит необходимые параметры
  const requiredParams = ['user', 'auth_date', 'hash'];
  const hasRequiredParams = requiredParams.every(param =>
    initData.includes(`${param}=`)
  );

  console.log('🔍 validateInitData - параметры:', {
    requiredParams: requiredParams,
    hasRequiredParams: hasRequiredParams,
    missingParams: requiredParams.filter(param => !initData.includes(`${param}=`))
  });

  if (!hasRequiredParams) {
    console.error('❌ validateInitData: отсутствуют необходимые параметры');
    return false;
  }

  console.log('✅ validateInitData: все проверки пройдены');
  return true;
}

/**
 * Выход из приложения (закрытие)
 */
export function logout() {
  console.log('👋 Выход из приложения');
  const tg = getTelegramWebApp();
  if (tg && typeof tg.close === 'function') {
    tg.close();
  }
}

