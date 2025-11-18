/**
 * Логика страницы входа
 * Слой Pages - страницы приложения
 */

import { login } from '../../shared/lib/auth-api.js';

/**
 * Обработчик формы входа
 */
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showError('Заполните все поля');
    return;
  }

  try {
    showLoading(true);

    const result = await login(username, password);

    // Сохраняем токен
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user_id', result.user_id);
    localStorage.setItem('username', result.username);

    showSuccess('Вход выполнен успешно!');

    // Перенаправляем на главную страницу
    setTimeout(() => {
      window.location.href = '../../../index.html';
    }, 1000);

  } catch (error) {
    console.error('Ошибка входа:', error);
    showError(error.message || 'Ошибка входа. Проверьте данные.');
  } finally {
    showLoading(false);
  }
}

/**
 * Показать/скрыть загрузку
 */
function showLoading(show) {
  const button = document.querySelector('.auth-submit-btn');
  if (show) {
    button.disabled = true;
    button.textContent = 'Вход...';
  } else {
    button.disabled = false;
    button.textContent = 'Войти';
  }
}

/**
 * Показать ошибку
 */
function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

/**
 * Показать успех
 */
function showSuccess(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.color = 'var(--success-color, #4CAF50)';
  errorElement.style.background = 'var(--bg-success, #e8f5e8)';
}

/**
 * Инициализация страницы
 */
function initLoginPage() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);

  // Проверяем, есть ли уже авторизация
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Если пользователь уже авторизован, перенаправляем на главную
    window.location.href = '../../../index.html';
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initLoginPage);
