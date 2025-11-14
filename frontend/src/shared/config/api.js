/**
 * Конфигурация API
 * Слой Shared - переиспользуемый код
 */

/**
 * Определяет URL API сервера в зависимости от окружения
 * @returns {string} Base URL для API
 */
export function getApiBaseUrl() {
  // В разработке (localhost)
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // В production на GitHub Pages
  // TODO: Замените на URL вашего production API сервера
  // Например: 'https://your-api-server.com'
  return 'http://localhost:8000';  // Временно localhost для тестирования
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

