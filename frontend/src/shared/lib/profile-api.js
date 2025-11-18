/**
 * API клиент для работы с профилем
 * Слой Shared - переиспользуемый код
 */

import { getInitData } from './telegram.js';

// URL API сервера (пустая строка = относительный путь, nginx проксирует /api/*)
const API_BASE_URL = '';

/**
 * Выполняет запрос к API
 */
async function apiRequest(endpoint, options = {}) {
  const initData = getInitData();
  
  if (!initData) {
    throw new Error('Telegram WebApp не инициализирован');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 API запрос: ${window.location.protocol}//${window.location.host}${url}`);

  const headers = {
    'Content-Type': 'application/json',
    'X-Init-Data': initData,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Получить профиль пользователя из API
 */
export async function getProfile() {
  try {
    return await apiRequest('/api/profile/');
  } catch (error) {
    console.error('❌ Ошибка получения профиля:', error);
    throw error;
  }
}

/**
 * Обновить профиль пользователя через API
 */
export async function updateProfile(data) {
  try {
    return await apiRequest('/api/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    throw error;
  }
}

