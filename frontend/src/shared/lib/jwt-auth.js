/**
 * Модуль JWT аутентификации
 * Слой Shared - переиспользуемый код
 */

import { getInitData } from './telegram.js';
import { API_BASE_URL } from '../config/api.js?v=3.1.0';
import { setCookie, getCookie, eraseCookie } from './cookies.js?v=3.1.0';

/**
 * Класс для управления JWT аутентификации
 */
class JWTAutManager {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.initPromise = null;
  }

  /**
   * Инициализация аутентификации
   */
  async init() {
    console.log('🚀 JWT Manager init() called');
    if (this.initPromise) {
      console.log('   - Returning cached initPromise');
      return this.initPromise;
    }

    console.log('   - Starting new _initAuth()');
    this.initPromise = this._initAuth();
    return this.initPromise;
  }

  /**
   * Внутренняя инициализация
   */
  async _initAuth() {
    try {
      console.log('🔐 === INIT AUTH START ===');
      console.log('   - API_BASE_URL:', API_BASE_URL);

      // Проверяем, есть ли уже токены в cookies
      const hasTokens = this._hasValidTokens();
      console.log('   - hasTokens in cookies:', hasTokens);

      if (hasTokens) {
        console.log('✅ Найдены токены в cookies, проверяем валидность...');

        try {
          // Проверяем статус аутентификации через API
          const statusResponse = await this._checkAuthStatus();

          if (statusResponse.is_authenticated) {
            this.isAuthenticated = true;
            this.user = statusResponse.user;
            console.log('✅ Аутентификация подтверждена:', this.user.username);
            return true;
          }
        } catch (statusError) {
          console.warn('⚠️ Не удалось проверить статус токенов, очищаем cookies:', statusError.message);
          // Очищаем невалидные токены
          this._clearAuthCookies();
        }
      }

      console.log('🔄 Выполняем аутентификацию через Telegram...');

      try {
        // Выполняем вход через initData
        console.log('📞 Вызов login()...');
        const loginSuccess = await this.login();

        if (loginSuccess) {
          console.log('✅ Вход выполнен успешно');
          return true;
        } else {
          console.log('❌ Вход не удался, но приложение продолжит работать');
          return false;
        }
      } catch (loginError) {
        console.error('❌ Ошибка входа:', loginError.message);
        console.log('ℹ️ Приложение будет работать в ограниченном режиме');
        return false;
      }

    } catch (error) {
      console.error('❌ Критическая ошибка инициализации JWT:', error.message);
      console.log('ℹ️ Приложение продолжит работать без аутентификации');
      this.isAuthenticated = false;
      this.user = null;
      return false;
    }
  }

  /**
   * Очистка cookies с токенами
   */
  _clearAuthCookies() {
    eraseCookie('access_token');
    eraseCookie('refresh_token');
    console.log('🗑️ Cookies очищены');
  }

  /**
   * Проверка наличия токенов в cookies
   */
  _hasValidTokens() {
    return !!getCookie('access_token');
  }

  /**
   * Проверка статуса аутентификации через API
   */
  async _checkAuthStatus() {
    try {
      console.log('🔍 === CHECK AUTH STATUS ===');
      const token = getCookie('access_token');
      const headers = {
        'Content-Type': 'application/json',
      };

      console.log('📋 Status check details:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        endpoint: `${API_BASE_URL}/api/auth/protected`
      });

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added Authorization header');
      } else {
        console.warn('⚠️ No token found in cookies for Authorization header');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/protected`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ответ от /api/auth/protected:', data);

        // API возвращает true если авторизован
        if (data === true || data.is_authenticated === true) {
          // Загружаем данные пользователя
          await this._loadCurrentUser();
          return { is_authenticated: true, user: this.user };
        } else {
          console.log('⚠️ Пользователь не авторизован');
          return { is_authenticated: false };
        }
      } else if (response.status === 401) {
        console.log('⚠️ Токены истекли или невалидны (401)');
        return { is_authenticated: false };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Ошибка проверки статуса аутентификации:', error);
      console.log('🔍 Will proceed without cached tokens');
      return { is_authenticated: false };
    }
  }

  /**
   * Загрузка данных текущего пользователя
   */
  async _loadCurrentUser() {
    try {
      console.log('👥 === LOAD CURRENT USER ===');
      const token = getCookie('access_token');
      const headers = {
        'Content-Type': 'application/json',
      };

      console.log('📋 Load user details:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        endpoint: `${API_BASE_URL}/api/auth/me`
      });

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added Authorization header');
      } else {
        console.warn('⚠️ No token in cookies for /me endpoint');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        console.log('✅ Данные пользователя загружены:', this.user);
      } else {
        console.warn('⚠️ Не удалось загрузить данные пользователя (status:', response.status + ')');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных пользователя:', error);
    }
  }

  /**
   * Вход через initData
   */
  async login() {
    try {
      console.log('🚀 === LOGIN ATTEMPT START ===');
      const initData = getInitData();

      console.log('📋 LOGIN DIAGNOSTICS:', {
        hasInitData: !!initData,
        initDataLength: initData ? initData.length : 0,
        apiBaseUrl: API_BASE_URL,
        timestamp: new Date().toISOString()
      });

      if (!initData) {
        console.error('❌ FATAL: initData is null or undefined');
        console.error('   This means app is NOT running inside Telegram WebApp');
        console.log('   Expected: Running in https://t.me/botusername/appname');
        console.log('   Actual: Running in regular browser or without Telegram context');
        throw new Error('initData отсутствует - приложение должно запускаться из Telegram');
      }

      console.log('✅ initData found, proceeding with login');
      console.log('📡 Выполнение входа через initData...');
      console.log('🔐 initData preview:', initData.substring(0, 50) + '...');
      console.log('🔗 Login URL:', `${API_BASE_URL}/api/auth/signin`);

      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Init-Data': initData,
          'User-Agent': navigator.userAgent,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Вход выполнен успешно, получены токены');
      console.log('📦 Response data:', {
        access_token: data.access_token ? data.access_token.substring(0, 30) + '...' : 'MISSING',
        refresh_token: data.refresh_token ? data.refresh_token.substring(0, 30) + '...' : 'MISSING',
        token_type: data.token_type
      });

      // Сохраняем токены в cookies
      if (data.access_token) {
        setCookie('access_token', data.access_token);
        console.log('💾 access_token сохранён в Cookies');
      } else {
        console.error('❌ access_token отсутствует в ответе!');
      }

      if (data.refresh_token) {
        setCookie('refresh_token', data.refresh_token);
        console.log('💾 refresh_token сохранён в Cookies');
      } else {
        console.error('❌ refresh_token отсутствует в ответе!');
      }

      this.isAuthenticated = true;

      // Проверяем, что cookies действительно сохранились
      console.log('🔍 Проверка сохраненных cookies:');
      const savedAccessToken = getCookie('access_token');
      const savedRefreshToken = getCookie('refresh_token');
      console.log('   - access_token in cookies:', savedAccessToken ? '✅ YES' : '❌ NO');
      console.log('   - refresh_token in cookies:', savedRefreshToken ? '✅ YES' : '❌ NO');
      console.log('   - All cookies:', document.cookie);

      // После успешного входа нужно получить данные пользователя
      await this._loadCurrentUser();

      return true;

    } catch (error) {
      console.error('❌ === LOGIN FAILED ===');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.log('🔍 DEBUGGING INFO:');
      console.log('   - Environment:', {
        location: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host
      });
      console.log('   - Telegram availability:', {
        hasTelegramObject: !!window.Telegram,
        hasWebApp: !!window.Telegram?.WebApp,
        hasInitData: !!window.Telegram?.WebApp?.initData
      });

      this.isAuthenticated = false;
      this.user = null;
      return false;
    }
  }

  /**
   * Выход из системы
   */
  async logout() {
    try {
      console.log('🚪 Выход из системы...');

      // Очищаем токены из cookies
      this._clearAuthCookies();

      this.isAuthenticated = false;
      this.user = null;

      console.log('✅ Выход выполнен успешно');

      // Закрываем Telegram WebApp
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.close();
      }
      return true;

    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
      this.user = null;
    }
  }

  /**
   * Получение текущего пользователя
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Проверка аутентификации
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Обновление токенов (вызывается автоматически при истечении access токена)
   */
  async refreshTokens() {
    try {
      console.log('🔄 Обновление токенов через API...');

      const refreshToken = getCookie('refresh_token');
      const body = refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : null;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Токены обновлены через API');

      // Обновляем токены в cookies
      if (data.user && data.user.access_token) {
        setCookie('access_token', data.user.access_token);
      }
      if (data.access_token) {
        setCookie('access_token', data.access_token);
      }
      if (data.refresh_token) {
        setCookie('refresh_token', data.refresh_token);
      }

      return true;

    } catch (error) {
      console.error('❌ Ошибка обновления токенов через API:', error);
      // НЕ выполняем автоматический выход - даем пользователю возможность
      // продолжить работу или повторить попытку
      console.log('ℹ️ Токены не обновлены, пользователь останется в текущем состоянии');
      return false;
    }
  }
}

// Глобальный экземпляр менеджера аутентификации
const jwtAuthManager = new JWTAutManager();

export default jwtAuthManager;

/**
 * Функции для обратной совместимости
 */
export function isAuthenticated() {
  return jwtAuthManager.isUserAuthenticated();
}

export function getAuthenticatedUser() {
  return jwtAuthManager.getCurrentUser();
}

export function logout() {
  return jwtAuthManager.logout();
}

/**
 * Инициализация аутентификации при загрузке приложения
 */
export async function initJWTAut() {
  return await jwtAuthManager.init();
}
