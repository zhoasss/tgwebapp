/**
 * Конфигурация API
 * Слой Shared - переиспользуемый код
 */

/**
 * URL API сервера
 * Selectel deployment
 */
const API_URL = 'https://booking-cab.ru';

/**
 * Определяет URL API сервера
 * @returns {string} Base URL для API
 */
export function getApiBaseUrl() {
  return API_URL;
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
};

