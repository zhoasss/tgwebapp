/**
 * Логика страницы регистрации
 * Слой Pages - страницы приложения
 */

import { register } from '../../shared/lib/auth-api.js';

/**
 * Обработчик формы регистрации
 */
async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Валидация
  if (!username || !password || !confirmPassword) {
    showError('Заполните все поля');
    return;
  }

  if (username.length < 3) {
    showError('Имя пользователя должно содержать минимум 3 символа');
    return;
  }

  if (password.length < 6) {
    showError('Пароль должен содержать минимум 6 символов');
    return;
  }

  if (password !== confirmPassword) {
    showError('Пароли не совпадают');
    return;
  }

  try {
    showLoading(true);

    const result = await register(username, password);

    // Сохраняем токен
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user_id', result.user_id);
    localStorage.setItem('username', result.username);

    showSuccess('Регистрация выполнена успешно!');

    // Перенаправляем на главную страницу
    setTimeout(() => {
      window.location.href = '../../../index.html';
    }, 1000);

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    showError(error.message || 'Ошибка регистрации. Попробуйте другое имя пользователя.');
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
    button.textContent = 'Регистрация...';
  } else {
    button.disabled = false;
    button.textContent = 'Зарегистрироваться';
  }
}

/**
 * Показать ошибку
 */
function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.color = 'var(--error-color, #f44336)';
  errorElement.style.background = 'var(--bg-destructive, #ffebee)';
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
function initRegisterPage() {
  const form = document.getElementById('register-form');
  form.addEventListener('submit', handleRegister);

  // Проверяем, есть ли уже авторизация
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Если пользователь уже авторизован, перенаправляем на главную
    window.location.href = '../../../index.html';
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initRegisterPage);
