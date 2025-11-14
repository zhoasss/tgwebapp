/**
 * Глобальное хранилище данных пользователя
 * Слой Shared - переиспользуемый код
 */

/**
 * Глобальное хранилище данных пользователя
 */
let userData = null;
let isLoading = false;
let loadError = null;

/**
 * Получает данные пользователя из хранилища
 * @returns {Object|null} Данные пользователя или null
 */
export function getUserData() {
  return userData;
}

/**
 * Сохраняет данные пользователя в хранилище
 * @param {Object} data - Данные пользователя
 */
export function setUserData(data) {
  userData = data;
  console.log('💾 Данные пользователя сохранены в store:', data);
}

/**
 * Очищает данные пользователя
 */
export function clearUserData() {
  userData = null;
  loadError = null;
  console.log('🗑️ Данные пользователя очищены');
}

/**
 * Проверяет, загружены ли данные пользователя
 * @returns {boolean}
 */
export function isUserDataLoaded() {
  return userData !== null;
}

/**
 * Получает статус загрузки
 * @returns {boolean}
 */
export function isUserDataLoading() {
  return isLoading;
}

/**
 * Устанавливает статус загрузки
 * @param {boolean} loading
 */
export function setLoading(loading) {
  isLoading = loading;
}

/**
 * Получает ошибку загрузки
 * @returns {Error|null}
 */
export function getLoadError() {
  return loadError;
}

/**
 * Устанавливает ошибку загрузки
 * @param {Error|null} error
 */
export function setLoadError(error) {
  loadError = error;
}

/**
 * Обновляет данные пользователя (частично)
 * @param {Object} updates - Обновления
 */
export function updateUserData(updates) {
  if (!userData) {
    console.warn('⚠️ Попытка обновить данные, но пользователь не загружен');
    return;
  }
  
  userData = { ...userData, ...updates };
  console.log('💾 Данные пользователя обновлены:', userData);
}

