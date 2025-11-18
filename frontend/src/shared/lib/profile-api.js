/**
 * API клиент для работы с профилем
 * Слой Shared - переиспользуемый код
 */

import { getInitData } from './telegram.js';
import { API_BASE_URL } from '../config/api.js';

/**
 * Выполняет запрос к API
 */
async function apiRequest(endpoint, options = {}) {
  const initData = getInitData();

  if (!initData) {
    throw new Error('Telegram WebApp не инициализирован');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 API запрос:`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   API_BASE_URL: ${API_BASE_URL}`);
  console.log(`   Full URL: ${url}`);
  console.log(`🔑 Отправка токена авторизации (длина: ${initData.length} символов)`);

  const headers = {
    'Content-Type': 'application/json',
    'X-Init-Data': initData,
    ...options.headers,
  };

  // Логируем заголовки (без полного токена для безопасности)
  console.log('📋 Заголовки запроса:', {
    'Content-Type': headers['Content-Type'],
    'X-Init-Data': initData.substring(0, 50) + '...',
    'Other headers': Object.keys(headers).filter(h => h !== 'X-Init-Data')
  });

  try {
    console.log('📡 Выполнение fetch запроса...');
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`📥 Ответ получен: ${response.status} ${response.statusText}`);
    console.log('📋 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`❌ HTTP ошибка: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('❌ Тело ошибки:', errorText);

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (e) {
        // Не JSON, используем текст как есть
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('✅ Успешный ответ API:', responseData);
    return responseData;

  } catch (error) {
    console.error('🚨 API Request Error:', error);
    console.error('🚨 Тип ошибки:', error.constructor.name);
    console.error('🚨 URL запроса:', url);
    console.error('🚨 Заголовки запроса:', headers);

    // Специальная обработка CORS ошибок
    if (error.name === 'TypeError' && error.message.includes('Load failed')) {
      console.error('🚨 Вероятно CORS ошибка или network error');
      console.error('💡 Проверьте:');
      console.error('   - CORS настройки в nginx');
      console.error('   - Доступность backend сервиса');
      console.error('   - HTTPS сертификаты');
      throw new Error('Ошибка сети или CORS. Проверьте подключение к серверу.');
    }

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

/**
 * Получить список записей пользователя
 */
export async function getAppointments(status = null, dateFrom = null, dateTo = null, limit = 50, offset = 0) {
  try {
    console.log('📅 Получение списка записей...');
    console.log('🌐 API_BASE_URL:', API_BASE_URL);

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (limit !== 50) params.append('limit', limit.toString());
    if (offset !== 0) params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = `/api/appointments/${queryString ? '?' + queryString : ''}`;
    const url = `${API_BASE_URL}${endpoint}`;

    console.log('🔗 Final URL:', url);
    console.log('📍 Endpoint:', endpoint);

    return await apiRequest(url);
  } catch (error) {
    console.error('❌ Ошибка получения записей:', error);
    throw error;
  }
}

/**
 * Создать новую запись
 */
export async function createAppointment(appointmentData) {
  try {
    console.log('📝 Создание новой записи...', appointmentData);

    return await apiRequest('/api/appointments/', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  } catch (error) {
    console.error('❌ Ошибка создания записи:', error);
    throw error;
  }
}

/**
 * Обновить запись
 */
export async function updateAppointment(appointmentId, appointmentData) {
  try {
    console.log(`📝 Обновление записи ${appointmentId}...`, appointmentData);

    return await apiRequest(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  } catch (error) {
    console.error('❌ Ошибка обновления записи:', error);
    throw error;
  }
}

/**
 * Удалить запись
 */
export async function deleteAppointment(appointmentId) {
  try {
    console.log(`🗑️ Удаление записи ${appointmentId}...`);

    return await apiRequest(`/api/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('❌ Ошибка удаления записи:', error);
    throw error;
  }
}

/**
 * Тестовый запрос API без авторизации
 */
export async function testApiConnection() {
  try {
    console.log('🧪 Тестирование подключения к API...');
    const url = `${API_BASE_URL}/api/test`;
    console.log(`🌐 Test URL: ${window.location.protocol}//${window.location.host}${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📥 Test response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API test successful:', data);
    return data;

  } catch (error) {
    console.error('❌ API test failed:', error);
    throw error;
  }
}

/**
 * Debug запрос для проверки API без авторизации
 */
export async function debugApiConnection() {
  try {
    console.log('🐛 Debug запрос к API...');
    const url = `${API_BASE_URL}/api/debug`;
    console.log(`🌐 Debug URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📥 Debug response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Debug API successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Debug API failed:', error);
    throw error;
  }
}

