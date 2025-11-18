/**
 * API клиент для работы с профилем
 * Слой Shared - переиспользуемый код
 */

import { getAuthHeader, isAuthenticated } from './auth-api.js';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.js';

/**
 * Выполняет запрос к API с retry логикой
 */
async function apiRequest(endpoint, options = {}, maxRetries = 2) {
  console.log('🔍 API Request - Auth check:', {
    isAuthenticated: isAuthenticated(),
    endpoint: endpoint
  });

  if (!isAuthenticated()) {
    throw new Error('Пользователь не авторизован');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': getAuthHeader(),
    ...options.headers,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 API ${options.method || 'GET'} ${endpoint} (попытка ${attempt}/${maxRetries})`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));

        // Для 401 ошибки не повторяем попытку
        if (response.status === 401) {
          throw new Error(errorData.detail || 'Ошибка авторизации');
        }

        // Для других ошибок повторяем, если не последняя попытка
        if (attempt === maxRetries) {
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        console.warn(`⚠️ API ошибка ${response.status}, повторяем через 1с...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const data = await response.json();
      console.log(`✅ API ${endpoint} успешен`);
      return data;

    } catch (error) {
      console.error(`❌ API Request Error (попытка ${attempt}/${maxRetries}):`, error);

      // Не повторяем для авторизационных ошибок
      if (error.message.includes('авторизации') || error.message.includes('валидации')) {
        throw error;
      }

      // Если последняя попытка или сетевая ошибка
      if (attempt === maxRetries || error.name === 'TypeError') {
        throw error;
      }

      // Ждем перед следующей попыткой
      console.log(`⏳ Повторяем API запрос через 1с...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Получить профиль пользователя из API
 */
export async function getProfile() {
  try {
    return await apiRequest(API_ENDPOINTS.PROFILE);
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
    return await apiRequest(API_ENDPOINTS.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    throw error;
  }
}

/**
 * Проверка здоровья API
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`);
    return response.ok;
  } catch (error) {
    console.error('❌ API недоступен:', error);
    return false;
  }
}

