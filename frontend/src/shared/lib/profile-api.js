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

