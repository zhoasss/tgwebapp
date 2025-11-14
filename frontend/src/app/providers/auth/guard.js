/**
 * Auth Guard - проверка авторизации при загрузке страниц
 * Слой App - глобальные настройки
 */

import { requireAuth, isAuthenticated, validateInitData } from '../../../shared/lib/auth.js';
import { getTelegramWebApp } from '../../../shared/lib/telegram.js';

/**
 * Инициализирует защиту авторизации для всего приложения
 * Вызывается автоматически при загрузке любой страницы
 */
export function initAuthGuard() {
  console.log('🔒 Инициализация Auth Guard...');
  
  const tg = getTelegramWebApp();
  
  // Если Telegram WebApp недоступен - блокируем доступ
  if (!tg) {
    console.error('❌ Telegram WebApp недоступен');
    showUnauthorizedError('Приложение должно быть открыто через Telegram бота');
    return false;
  }
  
  // Проверяем валидность initData
  if (!validateInitData()) {
    console.error('❌ Невалидные данные авторизации');
    showUnauthorizedError('Невалидные данные авторизации. Пожалуйста, перезапустите бота.');
    return false;
  }
  
  // Требуем авторизацию
  const authenticated = requireAuth(() => {
    // Callback при отсутствии авторизации
    blockAppAccess();
  });
  
  if (!authenticated) {
    blockAppAccess();
    return false;
  }
  
  console.log('✅ Auth Guard: Доступ разрешен');
  
  // Готовим приложение к работе
  tg.ready();
  tg.expand();
  
  return true;
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
  document.addEventListener('DOMContentLoaded', () => {
    initAuthGuard();
  });
} else {
  initAuthGuard();
}

