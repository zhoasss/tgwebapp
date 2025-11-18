/**
 * Конфигурация API
 * Слой Shared - переиспользуемый код
 */

/**
 * Определяет URL API сервера
 * Автоматически выбирает между localhost (разработка) и production доменом
 * @returns {string} Base URL для API
 */
export function getApiBaseUrl() {
  // Проверяем, находимся ли мы на production домене
  const isProduction = window.location.hostname === 'booking-cab.ru' ||
                      window.location.hostname === 'www.booking-cab.ru';

  // Для production используем HTTPS, для разработки - текущий протокол
  const protocol = isProduction ? 'https:' : window.location.protocol;
  const hostname = isProduction ? 'booking-cab.ru' : window.location.hostname;

  return `${protocol}//${hostname}`;
}

/**
 * Base URL для API запросов
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Endpoints API
 */
export const API_ENDPOINTS = {
  PROFILE: '/api/profile/',
  HEALTH: '/health',
  DEBUG: '/api/debug',
};

