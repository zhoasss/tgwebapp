/**
 * Логика страницы профиля
 * Слой Pages - страницы приложения
 */

import { showNotification } from '../../shared/lib/telegram.js';
import { getProfile, updateProfile } from '../../shared/lib/profile-api.js';
import jwtAuthManager from '../../shared/lib/jwt-auth.js';
import pageLoader from '../../shared/ui/loader/loader.js';

let isEditMode = false;
let profileData = {};
// isLoading is no longer needed as we use global loader
// let isLoading = false;

/**
 * Загружает данные профиля через JWT аутентификацию
 */
async function loadProfileData() {
  console.log('📡 Загрузка данных профиля...');

  // Показываем глобальный лоадер
  // Это увеличивает счетчик запросов, предотвращая скрытие лоадера,
  // если инициализация приложения завершится раньше загрузки профиля
  pageLoader.show();

  try {
    // Инициализируем JWT аутентификацию
    console.log('🔐 Инициализация JWT аутентификации...');
    const authSuccess = await jwtAuthManager.init();

    if (!authSuccess) {
      console.warn('⚠️ Аутентификация не выполнена, показываем гостевой режим');

      // Показываем базовые данные из Telegram WebApp
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;

        profileData = {
          id: tgUser.id,
          telegram_id: tgUser.id,
          firstName: tgUser.first_name || 'Пользователь',
          lastName: tgUser.last_name || '',
          username: tgUser.username || '',
          phone: '',
          businessName: '',
          address: ''
        };

        updateProfileUI();
        console.log('ℹ️ Отображены данные из Telegram WebApp (гостевой режим)');
      } else {
        throw new Error('Не удалось получить данные пользователя из Telegram');
      }

      return;
    }

    const user = jwtAuthManager.getCurrentUser();
    console.log('👤 Данные пользователя из JWT:', user);

    // Сначала показываем базовые данные пользователя
    profileData = {
      id: user.id,
      telegram_id: user.telegram_id,
      firstName: user.first_name || 'Пользователь',
      lastName: user.last_name || '',
      username: user.username || '',
      phone: user.phone || '',
      businessName: user.business_name || '',
      address: user.address || ''
    };

    updateProfileUI();
    console.log('✅ Базовые данные профиля отображены');

    // Пытаемся получить полные данные с сервера
    try {
      console.log('🔄 Загрузка полных данных профиля с сервера...');
      // getProfile использует apiClient, который тоже управляет лоадером
      // но так как мы уже вызвали pageLoader.show(), лоадер гарантированно будет виден
      const apiProfile = await getProfile();
      console.log('✅ Профиль загружен с API:', apiProfile);

      // Если токены были обновлены, уведомляем пользователя
      if (apiProfile.token_refreshed) {
        console.log('🔄 Токены были автоматически обновлены при загрузке профиля');
      }

      // Обновляем данные из API
      profileData = {
        id: apiProfile.id || profileData.id,
        telegram_id: apiProfile.telegram_id || profileData.telegram_id,
        firstName: apiProfile.first_name || profileData.firstName,
        lastName: apiProfile.last_name || profileData.lastName,
        username: apiProfile.username || profileData.username,
        phone: apiProfile.phone || profileData.phone,
        businessName: apiProfile.business_name || profileData.businessName,
        address: apiProfile.address || profileData.address
      };

      updateProfileUI();
      console.log('✅ Данные профиля обновлены из API');

    } catch (apiError) {
      console.warn('⚠️ Не удалось загрузить данные с сервера, используем базовые:', apiError.message);
      console.log('✅ Приложение работает с базовыми данными пользователя');
    }

  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error);

    // Не закрываем приложение автоматически, показываем сообщение об ошибке
    showError('Не удалось загрузить профиль. Проверьте подключение к интернету и попробуйте обновить страницу.');

    // Показываем базовую информацию о пользователе из Telegram, если доступна
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const tgUser = tg.initDataUnsafe.user;
      profileData = {
        id: tgUser.id,
        telegram_id: tgUser.id,
        firstName: tgUser.first_name || 'Пользователь',
        lastName: tgUser.last_name || '',
        username: tgUser.username || '',
        phone: '',
        businessName: '',
        address: ''
      };
      updateProfileUI();
      console.log('ℹ️ Показаны базовые данные при ошибке загрузки');
    }
  } finally {
    // Скрываем глобальный лоадер (уменьшаем счетчик)
    pageLoader.hide();
  }
}


/**
 * Показывает сообщение об ошибке
 */
function showError(message) {
  showNotification(message, 'error');

  // Показываем сообщение об ошибке в UI
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

/**
 * Показывает кастомное уведомление (для fallback)
 */
function showCustomNotification(message, type = 'info') {
  // Удаляем предыдущее уведомление
  const existingNotification = document.querySelector('.custom-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `custom-notification notification-${type}`;

  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#FF9800',
    info: '#2196F3'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    max-width: 90%;
    text-align: center;
    animation: slideDown 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Автоматическое скрытие через 4 секунды
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 4000);

  // Добавляем CSS анимации
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
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
  const initials = first + last;

  // Если нет инициалов, используем первую букву имени
  if (!initials && firstName) {
    return firstName.charAt(0).toUpperCase();
  }

  return initials || '?';
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
    showNotification('Дождитесь завершения загрузки', 'warning');
    return;
  }

  isEditMode = !isEditMode;
  const viewMode = document.getElementById('view-mode');
  const editMode = document.getElementById('edit-mode');

  if (isEditMode) {
    // Переход в режим редактирования
    console.log('✏️ Включаем режим редактирования');

    // Заполняем форму текущими данными
    document.getElementById('edit-phone').value = profileData.phone || '';
    document.getElementById('edit-business').value = profileData.businessName || '';
    document.getElementById('edit-address').value = profileData.address || '';

    // Показываем форму редактирования
    viewMode.style.display = 'none';
    editMode.style.display = 'block';

    // Добавляем классы для анимации
    editMode.classList.add('fade-in');
    setTimeout(() => editMode.classList.remove('fade-in'), 300);

    // Фокус на первое поле
    setTimeout(() => {
      const firstInput = document.getElementById('edit-phone');
      if (firstInput) firstInput.focus();
    }, 100);

  } else {
    // Переход в режим просмотра
    console.log('👁️ Возвращаемся в режим просмотра');

    // Показываем режим просмотра
    editMode.style.display = 'none';
    viewMode.style.display = 'block';

    // Добавляем классы для анимации
    viewMode.classList.add('fade-in');
    setTimeout(() => viewMode.classList.remove('fade-in'), 300);
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
    showNotification('Telegram WebApp недоступен', 'error');
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
    showNotification('Пожалуйста, введите номер телефона вручную', 'warning');
    toggleEditMode();
  }
}

/**
 * Сохраняет только номер телефона через API
 */
async function savePhoneToAPI(phone) {
  try {
    const updatedProfile = await updateProfile({ phone });
    profileData.phone = updatedProfile.phone || '';
    updateProfileUI();
    showNotification('Номер телефона сохранен!', 'success');
    console.log('✅ Номер телефона сохранен:', phone);
  } catch (error) {
    console.error('❌ Ошибка сохранения номера:', error);
    showNotification('Не удалось сохранить номер телефона', 'error');
  }
}

/**
 * Валидирует данные формы
 */
function validateForm(phone, businessName, address) {
  const errors = [];

  // Валидация телефона (если указан)
  if (phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
    if (!phoneRegex.test(phone)) {
      errors.push('Неверный формат номера телефона. Используйте формат: +7 (999) 123-45-67');
    }
  }

  // Валидация названия бизнеса
  if (businessName && businessName.length > 255) {
    errors.push('Название бизнеса слишком длинное (максимум 255 символов)');
  }

  // Валидация адреса
  if (address && address.length > 500) {
    errors.push('Адрес слишком длинный (максимум 500 символов)');
  }

  return errors;
}

/**
 * Сохраняет изменения профиля
 */
/**
 * Сохраняет изменения профиля
 */
async function saveProfile() {
  // Removed isLoading check as we rely on UI state (buttons disabled etc)
  // or we could check pageLoader.requestCount but it's better to just disable the button

  const phone = document.getElementById('edit-phone').value.trim();
  const businessName = document.getElementById('edit-business').value.trim();
  const address = document.getElementById('edit-address').value.trim();

  // Валидация данных
  const validationErrors = validateForm(phone, businessName, address);
  if (validationErrors.length > 0) {
    showNotification(validationErrors[0], 'error');
    return;
  }

  // Проверяем, есть ли хотя бы одно изменение
  const hasChanges = (
    phone !== profileData.phone ||
    businessName !== profileData.businessName ||
    address !== profileData.address
  );

  if (!hasChanges) {
    showNotification('Нет изменений для сохранения', 'info');
    // Небольшая задержка перед возвратом в режим просмотра
    setTimeout(() => {
      toggleEditMode();
    }, 1000);
    return;
  }

  const updateData = {
    phone: phone || null,
    business_name: businessName || null,
    address: address || null
  };

  // Определяем платформу для логирования
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const platform = isMobile ? '📱 Mobile' : '💻 Desktop';

  console.log(`${platform} 💾 Сохранение профиля...`, updateData);

  // Сначала сохраняем локально (работает всегда)
  profileData.phone = phone;
  profileData.businessName = businessName;
  profileData.address = address;

  // Показываем глобальный лоадер
  pageLoader.show();

  // Создаем промис для минимальной задержки анимации (1.5 сек)
  // Это обеспечивает плавный UX, чтобы лоадер не моргал слишком быстро
  const animationDelay = new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // Пытаемся синхронизировать с сервером параллельно с анимацией
    console.log(`${platform} 🔄 Синхронизация с сервером...`);

    // updateProfile использует apiClient, который тоже может вызвать show/hide
    // но так как мы вызвали show() вручную, счетчик увеличится
    const [updatedProfile] = await Promise.all([
      updateProfile(updateData),
      animationDelay
    ]);

    console.log(`${platform} ✅ Профиль синхронизирован с API:`, updatedProfile);

    // Обновляем локальные данные из ответа сервера
    if (updatedProfile) {
      profileData.phone = updatedProfile.phone || profileData.phone;
      profileData.businessName = updatedProfile.business_name || profileData.businessName;
      profileData.address = updatedProfile.address || profileData.address;
    }

    console.log(`${platform} ✅ Профиль успешно сохранен и синхронизирован`);

  } catch (apiError) {
    console.warn(`${platform} ⚠️ Сервер недоступен, данные сохранены только локально:`, apiError.message);
    console.log(`${platform} ✅ Приложение работает в автономном режиме - данные сохранены локально`);

    // Даже при ошибке дожидаемся окончания анимации для плавности
    await animationDelay;
  } finally {
    // Скрываем лоадер
    pageLoader.hide();
  }

  // Обновляем UI
  updateProfileUI();

  // Переключаем режим (без уведомлений)
  toggleEditMode();

  console.log('✅ Сохранение профиля завершено');
}

/**
 * Инициализация страницы профиля
 */
function initProfilePage() {
  console.log('🚀 Инициализация страницы профиля...');

  // Проверяем, что мы в Telegram WebApp
  if (!window.Telegram?.WebApp) {
    console.error('❌ Приложение запущено не в Telegram WebApp!');
    showError('Это приложение работает только в Telegram. Пожалуйста, запустите его через бота.');
    return;
  }

  console.log('✅ Telegram WebApp обнаружен, инициализация продолжается...');

  // Инициализируем состояние - начинаем с режима просмотра
  isEditMode = false;
  const viewMode = document.getElementById('view-mode');
  const editMode = document.getElementById('edit-mode');

  if (viewMode) viewMode.style.display = 'block';
  if (editMode) editMode.style.display = 'none';

  // Загружаем данные профиля
  loadProfileData();

  // Настраиваем обработчики событий
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

  console.log('✅ Страница профиля инициализирована');
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

