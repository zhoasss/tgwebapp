/**
 * Auth Guard - проверка авторизации при загрузке страниц
 * Слой App - глобальные настройки
 */

import { requireAuth, isAuthenticated, validateInitData } from '../../../shared/lib/auth.js';
import { getTelegramWebApp, showNotification } from '../../../shared/lib/telegram.js';
import { getProfile } from '../../../shared/lib/profile-api.js';

// Восстанавливаем состояние из sessionStorage при загрузке
const savedState = sessionStorage.getItem('telegramAppState');
const initialState = savedState ? JSON.parse(savedState) : {
  isInitialized: false,
  isAuthenticated: false,
  userData: null,
  isLoading: false,
  error: null
};

// Глобальное состояние приложения
window.appState = { ...initialState };

// Event для уведомления об изменениях состояния
const stateChangeEvent = new CustomEvent('appStateChanged');

/**
 * Обновляет состояние приложения и уведомляет подписчиков
 */
function updateAppState(updates) {
  Object.assign(window.appState, updates);

  // Сохраняем состояние в sessionStorage (кроме функций)
  const stateToSave = { ...window.appState };
  sessionStorage.setItem('telegramAppState', JSON.stringify(stateToSave));

  window.dispatchEvent(stateChangeEvent);
  console.log('📊 App State обновлено:', window.appState);
}

/**
 * Ожидает инициализации приложения с автоматическим запуском Auth Guard
 */
export function waitForAppInit(timeout = 15000) {
  return new Promise(async (resolve, reject) => {
    console.log('⏳ waitForAppInit: Начинаем ожидание инициализации...');

    // Если уже инициализировано - возвращаем сразу
    if (window.appState.isInitialized) {
      console.log('✅ waitForAppInit: Приложение уже инициализировано');
      resolve(window.appState);
      return;
    }

    // Если есть ошибка инициализации - возвращаем ошибку
    if (window.appState.error && !window.appState.isLoading) {
      console.error('❌ waitForAppInit: Ошибка инициализации:', window.appState.error);
      reject(new Error(window.appState.error));
      return;
    }

    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      console.error('⏰ waitForAppInit: Таймаут ожидания инициализации');
      reject(new Error(`Таймаут ожидания инициализации приложения (${timeout}ms)`));
    }, timeout);

    const checkState = async () => {
      // Если инициализация завершилась успешно
      if (window.appState.isInitialized) {
        console.log('✅ waitForAppInit: Инициализация завершена успешно');
        clearTimeout(timeoutId);
        resolve(window.appState);
        return;
      }

      // Если произошла ошибка и инициализация не в процессе
      if (window.appState.error && !window.appState.isLoading) {
        console.error('❌ waitForAppInit: Ошибка инициализации:', window.appState.error);
        clearTimeout(timeoutId);
        reject(new Error(window.appState.error));
        return;
      }

      // Если прошло больше 1 секунды и инициализация не началась - запускаем Auth Guard
      if (Date.now() - startTime > 1000 && !window.appState.isAuthenticated && !window.appState.isLoading && !isInitializing) {
        console.log('🚀 waitForAppInit: Auth Guard не запустился автоматически, запускаем вручную...');
        try {
          const result = await initAuthGuard();
          if (result) {
            console.log('✅ waitForAppInit: Auth Guard запущен успешно');
            clearTimeout(timeoutId);
            resolve(window.appState);
            return;
          } else {
            console.error('❌ waitForAppInit: Auth Guard вернул false');
            clearTimeout(timeoutId);
            reject(new Error('Не удалось инициализировать Auth Guard'));
            return;
          }
        } catch (error) {
          console.error('❌ waitForAppInit: Ошибка запуска Auth Guard:', error);
          clearTimeout(timeoutId);
          reject(error);
          return;
        }
      }

      // Продолжаем проверку каждые 100ms
      setTimeout(checkState, 100);
    };

    // Запускаем проверку состояния
    checkState();
  });
}

/**
 * Инициализирует защиту авторизации для всего приложения
 * Вызывается автоматически при загрузке любой страницы
 */
export async function initAuthGuard() {
  // Предотвращаем множественные инициализации
  if (isInitializing) {
    console.log('🔒 Auth Guard уже инициализируется, ждем...');
    return new Promise((resolve) => {
      const checkInit = () => {
        if (!isInitializing) {
          resolve(window.appState.isInitialized);
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
    });
  }

  if (window.appState.isInitialized) {
    console.log('🔒 Auth Guard уже инициализирован');
    return true;
  }

  isInitializing = true;
  console.log('🔒 Инициализация Auth Guard...');

  // Устанавливаем начальное состояние
  updateAppState({ isLoading: true, error: null });

  // Показываем индикатор загрузки
  showLoadingOverlay('Подключение к Telegram...');
  await sleep(300);

  try {
    const tg = getTelegramWebApp();

    // Шаг 1: Проверка Telegram WebApp
    if (!tg) {
      throw new Error('Telegram WebApp недоступен. Убедитесь, что приложение открыто через Telegram бота.');
    }

    console.log('✅ Telegram WebApp доступен, версия:', tg.version);

    updateLoadingMessage('Проверка авторизации...');
    await sleep(200);

    // Шаг 2: Проверка наличия initData
    console.log('🔍 Auth Guard - проверка initData:', {
      hasTg: !!tg,
      hasInitData: !!tg.initData,
      initDataLength: tg.initData?.length || 0,
      platform: tg.platform || 'unknown'
    });

    if (!tg.initData || tg.initData.length === 0) {
      throw new Error('Отсутствуют данные авторизации. Пожалуйста, перезапустите приложение через бота.');
    }

    if (tg.initData.length < 50) {
      console.warn('⚠️ initData очень короткий, возможно проблема с инициализацией');
    }

    // Шаг 3: Проверка валидности initData
    if (!validateInitData()) {
      throw new Error('Невалидные данные авторизации. Пожалуйста, перезапустите бота.');
    }

    console.log('✅ Данные авторизации валидны');

    // Шаг 4: Требуем авторизацию
    const authenticated = requireAuth(() => {
      updateAppState({ isAuthenticated: false, error: 'Требуется авторизация' });
      hideLoadingOverlay();
      blockAppAccess();
    });

    if (!authenticated) {
      updateAppState({ isAuthenticated: false, error: 'Авторизация отклонена' });
      hideLoadingOverlay();
      blockAppAccess();
      isInitializing = false;
      return false;
    }

    console.log('✅ Пользователь авторизован');
    updateAppState({ isAuthenticated: true });

    updateLoadingMessage('Загрузка данных из БД...');
    await sleep(100);

    // Готовим приложение к работе
    tg.ready();
    tg.expand();

    console.log('📡 Загружаем данные пользователя из БД...');

    // Загружаем данные из БД с retry логикой
    const dataLoaded = await loadUserDataFromDBWithRetry();

    if (!dataLoaded) {
      throw new Error('Не удалось загрузить данные из БД после нескольких попыток. Проверьте подключение к интернету.');
    }

    console.log('✅ Данные загружены из БД при открытии кабинета');
    updateAppState({
      isInitialized: true,
      isLoading: false,
      error: null
    });

    // Скрываем индикатор загрузки
    hideLoadingOverlay();

    isInitializing = false;
    return true;

  } catch (error) {
    console.error('❌ Ошибка инициализации Auth Guard:', error);
    isInitializing = false;

    updateAppState({
      isInitialized: true,
      isLoading: false,
      error: error.message
    });

    hideLoadingOverlay();

    // Показываем более понятные сообщения об ошибках
    if (error.message.includes('Telegram WebApp')) {
      showUnauthorizedError('Приложение должно быть открыто через Telegram бота');
    } else if (error.message.includes('авторизации')) {
      showUnauthorizedError('Невалидные данные авторизации. Пожалуйста, перезапустите бота.');
    } else if (error.message.includes('БД') || error.message.includes('загрузить данные')) {
      showUnauthorizedError('Не удалось загрузить данные. Проверьте подключение к интернету.');
    } else {
      showUnauthorizedError('Ошибка инициализации: ' + error.message);
    }

    return false;
  }
}

/**
 * Auth Guard теперь инициализируется вручную через login/register формы
 * Автоматическая инициализация убрана
 */

/**
 * Загружает данные пользователя из БД с retry логикой
 * @param {number} maxRetries - максимальное количество попыток
 * @param {number} delay - задержка между попытками в ms
 * @returns {boolean} true если загрузка успешна
 */
async function loadUserDataFromDBWithRetry(maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 API запрос: GET /api/profile/ - загрузка из БД (попытка ${attempt}/${maxRetries})`);

      const apiProfile = await getProfile();

      console.log('✅ Данные получены из БД:', apiProfile);

      // Проверяем, новый ли это пользователь
      const isNewUser = !apiProfile.phone && !apiProfile.business_name && !apiProfile.address;

      if (isNewUser) {
        console.log('✨ Новый пользователь! Создана запись в БД для ID:', apiProfile.telegram_id);
        showNotification('Добро пожаловать! Заполните свой профиль.');
      } else {
        console.log('✅ Существующий пользователь. Данные из БД для ID:', apiProfile.telegram_id);
      }

      // Сохраняем данные в глобальном состоянии
      const userData = {
        id: apiProfile.telegram_id,
        firstName: apiProfile.first_name || 'Пользователь',
        lastName: apiProfile.last_name || '',
        username: apiProfile.username || '',
        phone: apiProfile.phone || '',
        businessName: apiProfile.business_name || '',
        address: apiProfile.address || ''
      };

      // Сохраняем в appState и window.userData для совместимости
      updateAppState({ userData });
      window.userData = userData;

      console.log('💾 Данные из БД сохранены в память:', userData);

      return true;

    } catch (error) {
      console.error(`❌ Ошибка загрузки из БД (попытка ${attempt}/${maxRetries}):`, error);

      if (attempt === maxRetries) {
        // Последняя попытка - показываем ошибку
        let errorMessage = 'Не удалось загрузить данные из БД.';

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Ошибка авторизации. Пожалуйста, перезапустите бота.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Нет связи с сервером БД. Проверьте подключение к интернету.';
        } else if (error.message.includes('валидации')) {
          errorMessage = 'Ошибка валидации данных. Попробуйте перезапустить приложение.';
        }

        updateAppState({ error: errorMessage });
        showNotification(errorMessage);
        return false;
      }

      // Ждем перед следующей попыткой
      console.log(`⏳ Ждем ${delay}ms перед следующей попыткой...`);
      await sleep(delay);
    }
  }

  return false;
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

