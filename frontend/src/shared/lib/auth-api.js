/**
 * API клиент для аутентификации
 * Слой Shared - переиспользуемый код
 */

import { API_BASE_URL } from '../config/api.js';

/**
 * Регистрация нового пользователя
 */
export async function register(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));
    throw new Error(errorData.detail || 'Ошибка регистрации');
  }

  return await response.json();
}

/**
 * Вход пользователя
 */
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Ошибка сервера' }));
    throw new Error(errorData.detail || 'Ошибка входа');
  }

  return await response.json();
}

/**
 * Выход пользователя
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');

  // Перенаправляем на страницу входа
  window.location.href = 'src/pages/login/index.html';
}

/**
 * Проверка авторизации
 */
export function isAuthenticated() {
  const token = localStorage.getItem('auth_token');
  return !!token;
}

/**
 * Получение заголовка авторизации
 */
export function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? `Bearer ${token}` : null;
}
