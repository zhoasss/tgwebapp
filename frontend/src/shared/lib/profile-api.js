/**
 * API клиент для работы с профилем
 * Слой Shared - переиспользуемый код
 */

import jwtAuthManager from './jwt-auth.js';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.js';

/**
 * Выполняет запрос к API
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 API запрос:`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   API_BASE_URL: ${API_BASE_URL}`);
  console.log(`   Full URL: ${url}`);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Логируем заголовки
  console.log('📋 Заголовки запроса:', headers);

  try {
    console.log('📡 Выполнение fetch запроса...');
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Важно для отправки/получения cookies
    });

    console.log(`📥 Ответ получен: ${response.status} ${response.statusText}`);
    console.log('📋 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`❌ HTTP ошибка: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('❌ Тело ошибки:', errorText);

      // Если получили 401 и это не первая попытка, пробуем обновить токен
      if (response.status === 401 && retryCount === 0) {
        console.log('⚠️ Получен 401, пытаемся обновить токен...');

        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            // Пробуем обновить токен
            const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}` // Отправляем refresh токен
              }
            });

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('access_token', data.access_token);
              if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
              }
              console.log('✅ Токен обновлён, повторяем запрос');
              // Повторяем оригинальный запрос с новым токеном
              return apiRequest(endpoint, options, retryCount + 1);
            } else {
              console.error(`❌ Ошибка обновления токена: ${refreshResponse.status} ${refreshResponse.statusText}`);
              const refreshErrorText = await refreshResponse.text();
              console.error('❌ Тело ошибки обновления токена:', refreshErrorText);
            }
          } catch (refreshError) {
            console.error('❌ Ошибка при запросе обновления токена:', refreshError);
          }
        }

        console.error('❌ Не удалось обновить токен или refresh токен отсутствует');
        throw new Error('Требуется повторная авторизация');
      }

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

    // Проверяем, обновились ли токены на сервере (автоматически при истечении access токена)
    if (responseData.token_refreshed && responseData.new_access_token && responseData.new_refresh_token) {
      console.log('🔄 Сервер автоматически обновил токены, устанавливаем новые cookies');

      // Устанавливаем новые cookies (копируем логику из jwt-auth.js)
      const secure = window.location.protocol === 'https:';
      const sameSite = secure ? 'strict' : 'lax';

      // Access token (30 минут)
      document.cookie = `access_token=${responseData.new_access_token}; path=/; secure=${secure}; samesite=${sameSite}; max-age=${30 * 60}`;

      // Refresh token (30 дней)
      document.cookie = `refresh_token=${responseData.new_refresh_token}; path=/; secure=${secure}; samesite=${sameSite}; max-age=${30 * 24 * 60 * 60}`;

      console.log('✅ Новые токены установлены в cookies');
    }

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
    const endpoint = `${API_ENDPOINTS.APPOINTMENTS}${queryString ? '?' + queryString : ''}`;

    console.log('🔗 Final URL:', `${API_BASE_URL}${endpoint}`);
    console.log('📍 Endpoint:', endpoint);

    return await apiRequest(endpoint);
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

    return await apiRequest(API_ENDPOINTS.APPOINTMENTS, {
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

    return await apiRequest(`${API_ENDPOINTS.APPOINTMENTS}${appointmentId}`, {
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

    return await apiRequest(`${API_ENDPOINTS.APPOINTMENTS}${appointmentId}`, {
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
    return await apiRequest(API_ENDPOINTS.TEST);
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
    return await apiRequest(API_ENDPOINTS.DEBUG);
  } catch (error) {
    console.error('❌ Debug API failed:', error);
    throw error;
  }
}

