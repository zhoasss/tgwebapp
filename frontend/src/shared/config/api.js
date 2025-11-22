/**
 * Конфигурация API
 * Слой Shared - переиспользуемый код
 * @version 1.0.1
 */

// Version for cache busting
const API_CONFIG_VERSION = '1.0.1';

/**
 * Определяет URL API сервера
 * Автоматически выбирает между localhost (разработка) и production доменом
 * @returns {string} Base URL для API
 */
export function getApiBaseUrl() {
  // Определяем текущий hostname
  const hostname = window.location.hostname;
  console.log('🌐 Current hostname:', hostname);

  // Проверяем, находимся ли мы на production домене
  const isProduction = hostname === 'booking-cab.ru' ||
    hostname === 'www.booking-cab.ru' ||
    hostname.includes('booking-cab.ru');

  console.log('🏭 Is production:', isProduction);

  if (isProduction) {
    // Для production всегда используем HTTPS и фиксированный домен
    const apiUrl = 'https://booking-cab.ru';
    console.log('🎯 Production API URL:', apiUrl);
    return apiUrl;
  } else {
    // Для разработки используем текущий протокол и hostname
    const apiUrl = `${window.location.protocol}//${hostname}`;
    console.log('🛠️ Development API URL:', apiUrl);
    return apiUrl;
  }
}

/**
 * Base URL для API запросов
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Endpoints API
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  SIGNIN: '/api/auth/signin',
  PROTECTED: '/api/auth/protected',
  ME: '/api/auth/me',

  // Business endpoints
  PROFILE: '/api/profiles/',
  APPOINTMENTS: '/api/appointments/',
  SERVICES: '/api/services/',
  CLIENTS: '/api/clients/',
  SCHEDULE: '/api/schedule',
  HEALTH: '/health',
  DEBUG: '/api/debug',
  TEST: '/api/test',
};

