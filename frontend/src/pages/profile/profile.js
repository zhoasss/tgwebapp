/**
 * Логика страницы профиля
 * Слой Pages - страницы приложения
 */

import { getTelegramUser, showNotification } from '../../shared/lib/telegram.js';
import { getProfile, updateProfile } from '../../shared/lib/profile-api.js';
import { waitForAppInit, initAuthGuard } from '../../app/providers/auth/guard.js';

let isEditMode = false;
let profileData = {};
let isLoading = false;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 10;

/**
 * Загружает данные профиля из глобального состояния приложения
 * Ждет инициализации Auth Guard перед отображением данных
 */
async function loadProfileData() {
  console.log('📋 Загрузка данных профиля...');
  console.log('📊 Текущее состояние appState:', window.appState);

  try {
    console.log('⏳ Ждем инициализации Auth Guard...');

    // Ждем инициализации приложения (Auth Guard загрузит данные)
    const appState = await waitForAppInit();
    console.log('✅ Auth Guard инициализирован, состояние:', appState);

    if (!appState.isAuthenticated) {
      console.error('❌ Пользователь не авторизован');
      throw new Error('Пользователь не авторизован');
    }

    if (appState.error) {
      console.error('❌ Ошибка в appState:', appState.error);
      throw new Error(appState.error);
    }

    if (!appState.userData) {
      console.error('❌ Данные пользователя отсутствуют в appState');
      console.log('📊 Полное состояние appState:', JSON.stringify(appState, null, 2));
      throw new Error('Данные пользователя не загружены');
    }

    console.log('✅ Данные из глобального состояния:', appState.userData);

    // Используем данные из глобального состояния
    profileData = { ...appState.userData };

    // Скрываем сообщение об ошибке если оно было
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.style.display = 'none';
    }

    // Обновляем UI
    updateProfileUI();

    console.log('🎉 Профиль отображён успешно');

  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error);
    console.error('📊 Состояние appState на момент ошибки:', window.appState);

    let errorMessage = 'Не удалось загрузить данные профиля.';

    if (error.message.includes('Таймаут')) {
      errorMessage = 'Превышено время ожидания загрузки данных.';
    } else if (error.message.includes('авторизован')) {
      errorMessage = 'Требуется авторизация через Telegram.';
    } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      errorMessage = 'Нет связи с сервером. Проверьте подключение.';
    } else if (error.message.includes('не загружены')) {
      errorMessage = 'Данные профиля не найдены. Попробуйте перезапустить приложение.';
    }

    showError(errorMessage);

    // Показываем кнопку повторной попытки для всех ошибок
    showRetryButton();
  }
}

/**
 * Показывает кнопку повторной попытки загрузки
 */
function showRetryButton() {
  const container = document.querySelector('.profile-container') || document.body;

  // Удаляем старую кнопку, если есть
  const existingButton = document.getElementById('retry-load-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const retryButton = document.createElement('button');
  retryButton.id = 'retry-load-btn';
  retryButton.textContent = '🔄 Повторить загрузку';
  retryButton.style.cssText = `
    display: block;
    margin: 20px auto;
    padding: 12px 24px;
    background: var(--accent-color, #3390ec);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.3s ease;
  `;

  retryButton.addEventListener('click', () => {
    retryButton.remove();
    loadProfileData();
  });

  retryButton.addEventListener('mouseover', () => {
    retryButton.style.background = 'var(--accent-hover, #2980d6)';
  });

  retryButton.addEventListener('mouseout', () => {
    retryButton.style.background = 'var(--accent-color, #3390ec)';
  });

  container.appendChild(retryButton);
}

/**
 * Показывает/скрывает индикатор загрузки
 */
function showLoading(show) {
  isLoading = show;
  const loadingElement = document.getElementById('loading-indicator');
  if (loadingElement) {
    loadingElement.style.display = show ? 'flex' : 'none';
  }
  
  // Блокируем кнопку редактирования во время загрузки
  const editButton = document.getElementById('edit-profile-btn');
  if (editButton) {
    editButton.disabled = show;
  }
}

/**
 * Показывает сообщение об ошибке или информационное сообщение
 */
function showError(message, isError = true) {
  if (isError) {
    showNotification(message);
  }

  // Показываем сообщение в UI
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.style.color = isError ? 'var(--error-color, #e74c3c)' : 'var(--text-secondary, #666)';
  }
}

/**
 * Обновляет UI профиля
 */
function updateProfileUI() {
  const fullName = profileData.lastName 
    ? `${profileData.firstName} ${profileData.lastName}` 
    : profileData.firstName;
  
  const username = profileData.username 
    ? `@${profileData.username}` 
    : 'Нет username';
  
  // Обновляем заголовок
  document.getElementById('profile-name').textContent = fullName;
  document.getElementById('profile-username').textContent = username;
  
  // Обновляем детали
  document.getElementById('detail-firstname').textContent = profileData.firstName;
  document.getElementById('detail-lastname').textContent = profileData.lastName || 'Не указана';
  
  // Для телефона добавляем кнопку запроса, если его нет
  const phoneElement = document.getElementById('detail-phone');
  if (profileData.phone) {
    phoneElement.textContent = profileData.phone;
  } else {
    phoneElement.innerHTML = `
      <span style="color: var(--text-secondary);">Не указан</span>
      <button id="request-phone-btn" style="
        margin-left: 8px;
        padding: 4px 12px;
        font-size: 12px;
        background: var(--accent-color);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      ">Запросить</button>
    `;
    
    // Добавляем обработчик для кнопки запроса телефона
    setTimeout(() => {
      const requestBtn = document.getElementById('request-phone-btn');
      if (requestBtn) {
        requestBtn.addEventListener('click', requestPhoneNumber);
      }
    }, 100);
  }
  
  document.getElementById('detail-business').textContent = profileData.businessName || 'Не указано';
  document.getElementById('detail-address').textContent = profileData.address || 'Не указан';
  
  // Обновляем аватар
  const initials = getInitials(profileData.firstName, profileData.lastName);
  document.getElementById('avatar-initials').textContent = initials;
  
  if (profileData.id) {
    const avatarCircle = document.getElementById('avatar');
    const gradient = generateGradient(profileData.id);
    avatarCircle.style.background = gradient;
  }
}

/**
 * Получает инициалы из имени и фамилии
 */
function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

/**
 * Генерирует градиент на основе ID пользователя
 */
function generateGradient(userId) {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ];
  
  const index = userId % gradients.length;
  return gradients[index];
}

/**
 * Переключает режим редактирования
 */
function toggleEditMode() {
  if (isLoading) {
    showNotification('Дождитесь завершения загрузки');
    return;
  }

  isEditMode = !isEditMode;
  const viewMode = document.getElementById('view-mode');
  const editMode = document.getElementById('edit-mode');
  
  if (isEditMode) {
    // Переход в режим редактирования
    viewMode.classList.add('hidden');
    editMode.classList.add('active');
    
    // Заполняем форму текущими данными
    document.getElementById('edit-phone').value = profileData.phone || '';
    document.getElementById('edit-business').value = profileData.businessName || '';
    document.getElementById('edit-address').value = profileData.address || '';
  } else {
    // Переход в режим просмотра
    viewMode.classList.remove('hidden');
    editMode.classList.remove('active');
  }
  
  console.log(`🔄 Режим редактирования: ${isEditMode ? 'включен' : 'выключен'}`);
}

/**
 * Запрашивает номер телефона у пользователя через Telegram
 */
function requestPhoneNumber() {
  console.log('📞 Запрос номера телефона...');
  
  const tg = window.Telegram?.WebApp;
  
  if (!tg) {
    showNotification('Telegram WebApp недоступен');
    return;
  }
  
  // Проверяем, поддерживается ли метод requestContact (доступен с версии 6.9)
  if (typeof tg.requestContact === 'function') {
    tg.requestContact((status, data) => {
      console.log('📞 Результат запроса контакта:', status, data);
      
      if (status && data?.responseUnsafe?.contact?.phone_number) {
        const phone = data.responseUnsafe.contact.phone_number;
        
        // Автоматически сохраняем номер через API
        profileData.phone = phone;
        savePhoneToAPI(phone);
      } else {
        console.log('ℹ️ Пользователь отменил запрос контакта');
      }
    });
  } else {
    // Fallback для старых версий - показываем форму редактирования
    console.warn('⚠️ Метод requestContact недоступен в этой версии Telegram');
    showNotification('Пожалуйста, введите номер телефона вручную');
    toggleEditMode();
  }
}

/**
 * Сохраняет только номер телефона через API в БД
 */
async function savePhoneToAPI(phone) {
  try {
    console.log('🌐 API запрос: PUT /api/profile/ - сохранение телефона в БД');
    const updatedProfile = await updateProfile({ phone });
    
    console.log('✅ Телефон сохранён в БД для ID:', updatedProfile.telegram_id);
    
    // Обновляем локальные данные из ответа БД
    profileData.phone = updatedProfile.phone || '';
    
    // Обновляем глобальные данные (загружены из БД)
    if (window.userData) {
      window.userData.phone = updatedProfile.phone || '';
      console.log('💾 Обновлены данные в памяти (источник - БД)');
    }
    
    updateProfileUI();
    showNotification('Номер телефона сохранен в БД!');
  } catch (error) {
    console.error('❌ Ошибка сохранения номера в БД:', error);
    showNotification('Не удалось сохранить номер телефона');
  }
}

/**
 * Сохраняет изменения профиля
 */
async function saveProfile() {
  if (isLoading) {
    showNotification('Операция уже выполняется');
    return;
  }

  const phone = document.getElementById('edit-phone').value.trim();
  const businessName = document.getElementById('edit-business').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  
  const updateData = {
    phone: phone || null,
    business_name: businessName || null,
    address: address || null
  };
  
  showLoading(true);

  try {
    console.log('🌐 API запрос: PUT /api/profile/ - сохранение в БД');
    console.log('📝 Данные для сохранения в БД:', updateData);
    
    const updatedProfile = await updateProfile(updateData);
    
    console.log('✅ Профиль обновлён в БД для ID:', updatedProfile.telegram_id);
    console.log('💾 Обновлённые данные из БД:', updatedProfile);
    
    // Обновляем локальные данные из ответа БД
    profileData.phone = updatedProfile.phone || '';
    profileData.businessName = updatedProfile.business_name || '';
    profileData.address = updatedProfile.address || '';
    
    // Обновляем глобальные данные (источник - БД)
    if (window.userData) {
      window.userData.phone = updatedProfile.phone || '';
      window.userData.businessName = updatedProfile.business_name || '';
      window.userData.address = updatedProfile.address || '';
      console.log('💾 Обновлены данные в памяти (источник - БД)');
    }
    
    // Обновляем UI и выходим из режима редактирования
    updateProfileUI();
    toggleEditMode();
    
    // Показываем уведомление
    showNotification('Профиль успешно обновлен в БД!');
    
  } catch (error) {
    console.error('❌ Ошибка сохранения профиля в БД:', error);
    showNotification('Не удалось сохранить профиль. Проверьте соединение.');
  } finally {
    showLoading(false);
  }
}

/**
 * Инициализация страницы профиля
 */
async function initProfilePage() {
  console.log('🚀 Инициализация страницы профиля...');

  try {
    // Проверяем, инициализирован ли уже Auth Guard
    if (!window.appState || (!window.appState.isInitialized && !window.appState.isLoading)) {
      console.log('🔒 Auth Guard не инициализирован, запускаем...');
      const authResult = await initAuthGuard();
      if (!authResult) {
        throw new Error('Не удалось инициализировать авторизацию');
      }
    }

    // Загружаем данные профиля (ждем Auth Guard)
    await loadProfileData();

    // Настраиваем обработчики событий
    setupEventListeners();

    console.log('✅ Страница профиля инициализирована');

  } catch (error) {
    console.error('❌ Ошибка инициализации страницы профиля:', error);
    showError('Ошибка инициализации страницы. Попробуйте перезагрузить приложение.');
  }
}

/**
 * Настраивает обработчики событий страницы
 */
function setupEventListeners() {
  const editButton = document.getElementById('edit-profile-btn');
  const saveButton = document.getElementById('save-profile-btn');
  const cancelButton = document.getElementById('cancel-edit-btn');

  if (editButton) {
    editButton.addEventListener('click', (e) => {
      e.preventDefault();
      toggleEditMode();
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await saveProfile();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', (e) => {
      e.preventDefault();
      toggleEditMode();
    });
  }
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initProfilePage().catch(console.error);
  });
} else {
  initProfilePage().catch(console.error);
}

