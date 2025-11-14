/**
 * Auth Guard - проверка авторизации при загрузке страниц
 * Слой App - глобальные настройки
 */

import { requireAuth, isAuthenticated, validateInitData } from '../../../shared/lib/auth.js';
import { getTelegramWebApp, showNotification } from '../../../shared/lib/telegram.js';
import { getProfile } from '../../../shared/lib/profile-api.js';

/**
 * Инициализирует защиту авторизации для всего приложения
 * Вызывается автоматически при загрузке любой страницы
 */
export async function initAuthGuard() {
  console.log('🔒 Инициализация Auth Guard...');
  
  // Показываем индикатор загрузки
  showLoadingOverlay('Подключение к Telegram...');
  
  // Небольшая задержка для отображения UI
  await sleep(300);
  
  const tg = getTelegramWebApp();
  
  // Шаг 1: Проверка Telegram WebApp
  if (!tg) {
    console.error('❌ Telegram WebApp недоступен');
    hideLoadingOverlay();
    showUnauthorizedError('Приложение должно быть открыто через Telegram бота');
    return false;
  }
  
  updateLoadingMessage('Проверка авторизации...');
  await sleep(200);
  
  // Шаг 2: Проверка валидности initData
  if (!validateInitData()) {
    console.error('❌ Невалидные данные авторизации');
    hideLoadingOverlay();
    showUnauthorizedError('Невалидные данные авторизации. Пожалуйста, перезапустите бота.');
    return false;
  }
  
  // Шаг 3: Требуем авторизацию
  const authenticated = requireAuth(() => {
    hideLoadingOverlay();
    blockAppAccess();
  });
  
  if (!authenticated) {
    hideLoadingOverlay();
    blockAppAccess();
    return false;
  }
  
  console.log('✅ Auth Guard: Авторизация успешна');
  
  // Готовим приложение к работе
  tg.ready();
  tg.expand();
  
  // Скрываем индикатор загрузки
  hideLoadingOverlay();
  
  return true;
}

/**
 * Вспомогательная функция задержки
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Показывает overlay с индикатором загрузки
 */
function showLoadingOverlay(message = 'Загрузка...') {
  // Проверяем, нет ли уже overlay
  let overlay = document.getElementById('auth-loading-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'auth-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-body, #fff);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      text-align: center;
      max-width: 400px;
    `;
    
    content.innerHTML = `
      <div style="display: inline-block; width: 48px; height: 48px; border: 4px solid var(--accent-color, #3390ec); border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
      <p id="loading-message" style="color: var(--text-primary, #333); font-size: 16px; font-weight: 500; margin: 0;"></p>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }
  
  // Обновляем сообщение
  const messageEl = document.getElementById('loading-message');
  if (messageEl) {
    messageEl.textContent = message;
  }
}

/**
 * Обновляет сообщение в индикаторе загрузки
 */
function updateLoadingMessage(message) {
  const messageEl = document.getElementById('loading-message');
  if (messageEl) {
    messageEl.textContent = message;
  }
}

/**
 * Скрывает overlay загрузки
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('auth-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

/**
 * Показывает ошибку о неавторизованном доступе
 */
function showUnauthorizedError(message) {
  // Создаем overlay с сообщением об ошибке
  const overlay = document.createElement('div');
  overlay.id = 'auth-error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-body, #fff);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    text-align: center;
    max-width: 400px;
  `;
  
  content.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
    <h2 style="color: var(--text-primary, #333); margin-bottom: 16px;">Доступ запрещен</h2>
    <p style="color: var(--text-secondary, #666); margin-bottom: 24px; line-height: 1.5;">
      ${message}
    </p>
    <p style="color: var(--text-secondary, #666); font-size: 14px;">
      Откройте бота в Telegram и нажмите "Открыть кабинет"
    </p>
  `;
  
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

/**
 * Блокирует доступ к приложению
 */
function blockAppAccess() {
  console.log('🚫 Доступ к приложению заблокирован');
  
  // Скрываем основной контент
  const app = document.getElementById('app');
  if (app) {
    app.style.display = 'none';
  }
  
  // Показываем ошибку
  showUnauthorizedError(
    'Для использования приложения необходимо открыть его через Telegram бота.'
  );
  
  // Закрываем приложение через 5 секунд
  setTimeout(() => {
    const tg = getTelegramWebApp();
    if (tg && typeof tg.close === 'function') {
      tg.close();
    }
  }, 5000);
}

/**
 * Автоматическая инициализация при загрузке скрипта
 * Выполняется для всех страниц
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await initAuthGuard();
  });
} else {
  initAuthGuard();
}

