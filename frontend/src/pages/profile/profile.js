/**
 * Логика страницы профиля
 * Слой Pages - страницы приложения
 */

import { getTelegramUser, showNotification } from '../../shared/lib/telegram.js';
import { getProfile, updateProfile } from '../../shared/lib/profile-api.js';

let isEditMode = false;
let profileData = {};
let isLoading = false;

/**
 * Загружает данные профиля из API
 */
async function loadProfileData() {
  console.log('📡 Загрузка данных профиля...');
  console.log('🔍 Проверка Telegram WebApp:', window.Telegram?.WebApp);
  console.log('🔍 initData:', window.Telegram?.WebApp?.initData);
  console.log('🔍 initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
  
  const user = getTelegramUser();
  console.log('👤 Данные пользователя из Telegram:', user);
  
  if (!user) {
    console.error('❌ Не удалось получить данные пользователя из Telegram');
    showError('Не удалось авторизоваться через Telegram. Пожалуйста, перезапустите бот.');
    return;
  }

  // Показываем индикатор загрузки
  showLoading(true);

  try {
    console.log('🌐 Загрузка профиля из API...');
    const apiProfile = await getProfile();
    console.log('✅ Профиль получен из API:', apiProfile);
    
    profileData = {
      id: apiProfile.telegram_id,
      firstName: apiProfile.first_name || 'Пользователь',
      lastName: apiProfile.last_name || '',
      username: apiProfile.username || '',
      phone: apiProfile.phone || '',
      businessName: apiProfile.business_name || '',
      address: apiProfile.address || ''
    };
    
    updateProfileUI();
  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error);
    showError('Не удалось загрузить данные профиля. Проверьте соединение.');
  } finally {
    showLoading(false);
  }
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
 * Показывает сообщение об ошибке
 */
function showError(message) {
  showNotification(message);
  
  // Показываем сообщение об ошибке в UI
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
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
 * Сохраняет только номер телефона через API
 */
async function savePhoneToAPI(phone) {
  try {
    const updatedProfile = await updateProfile({ phone });
    profileData.phone = updatedProfile.phone || '';
    updateProfileUI();
    showNotification('Номер телефона сохранен!');
    console.log('✅ Номер телефона сохранен:', phone);
  } catch (error) {
    console.error('❌ Ошибка сохранения номера:', error);
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
    console.log('🌐 Сохранение профиля через API...');
    const updatedProfile = await updateProfile(updateData);
    console.log('✅ Профиль обновлен через API:', updatedProfile);
    
    // Обновляем локальные данные из ответа сервера
    profileData.phone = updatedProfile.phone || '';
    profileData.businessName = updatedProfile.business_name || '';
    profileData.address = updatedProfile.address || '';
    
    // Обновляем UI и выходим из режима редактирования
    updateProfileUI();
    toggleEditMode();
    
    // Показываем уведомление
    showNotification('Профиль успешно обновлен!');
    
  } catch (error) {
    console.error('❌ Ошибка сохранения профиля:', error);
    showNotification('Не удалось сохранить профиль. Проверьте соединение.');
  } finally {
    showLoading(false);
  }
}

/**
 * Инициализация страницы профиля
 */
function initProfilePage() {
  console.log('🚀 Инициализация страницы профиля...');
  
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

