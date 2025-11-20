/**
 * Модуль JWT аутентификации
 * Слой Shared - переиспользуемый код
 */

import { getInitData } from './telegram.js';
import { API_BASE_URL } from '../config/api.js';

/**
 * Класс для управления JWT аутентификацией
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
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initAuth();
    return this.initPromise;
  }

  /**
   * Внутренняя инициализация
   */
  async _initAuth() {
    try {
      console.log('🔐 Инициализация JWT аутентификации...');

      // Проверяем, есть ли уже токены в cookies
      const hasTokens = this._hasValidTokens();

      if (hasTokens) {
        console.log('✅ Найдены токены в cookies, проверяем валидность...');

        // Проверяем статус аутентификации через API
        const statusResponse = await this._checkAuthStatus();

        if (statusResponse.is_authenticated) {
          this.isAuthenticated = true;
          this.user = statusResponse.user;
          console.log('✅ Аутентификация подтверждена:', this.user.username);
          return true;
        }
      }

      console.log('🔄 Токены отсутствуют или невалидны, выполняем вход...');

      // Выполняем вход через initData
      const loginSuccess = await this.login();

      if (loginSuccess) {
        console.log('✅ Вход выполнен успешно');
        return true;
      } else {
        console.log('❌ Вход не удался');
        return false;
      }

    } catch (error) {
      console.error('❌ Ошибка инициализации JWT аутентификации:', error);
      this.isAuthenticated = false;
      this.user = null;
      return false;
    }
  }

  /**
   * Проверка наличия токенов в cookies
   */
  _hasValidTokens() {
    // Простая проверка наличия cookies (детальная валидация будет на сервере)
    return document.cookie.includes('access_token=');
  }

  /**
   * Проверка статуса аутентификации через API
   */
  async _checkAuthStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
        method: 'GET',
        credentials: 'include', // Важно для отправки cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 401) {
        console.log('⚠️ Токены истекли или невалидны');
        return { is_authenticated: false };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Ошибка проверки статуса аутентификации:', error);
      return { is_authenticated: false };
    }
  }

  /**
   * Вход через initData
   */
  async login() {
    try {
      const initData = getInitData();

      if (!initData) {
        throw new Error('initData отсутствует');
      }

      console.log('📡 Выполнение входа через initData...');

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // Важно для получения cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Init-Data': initData,
          'User-Agent': navigator.userAgent,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Вход выполнен успешно:', data);

      this.isAuthenticated = true;
      this.user = data.user;

      return true;

    } catch (error) {
      console.error('❌ Ошибка входа:', error);
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
      console.log('👋 Выполнение выхода...');

      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      this.isAuthenticated = false;
      this.user = null;

      console.log('✅ Выход выполнен успешно');

      // Закрываем Telegram WebApp
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.close();
      }

    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
      // Даже при ошибке сбрасываем локальное состояние
      this.isAuthenticated = false;
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
      console.log('🔄 Обновление токенов...');

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Токены обновлены');

      return true;

    } catch (error) {
      console.error('❌ Ошибка обновления токенов:', error);
      // При ошибке обновления токенов выполняем полный выход
      await this.logout();
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
