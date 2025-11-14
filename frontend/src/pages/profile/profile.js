/**
 * Логика страницы профиля
 * Слой Pages - страницы приложения
 */

import { getTelegramUser, showNotification } from '../../shared/lib/telegram.js';

let isEditMode = false;
let profileData = {};

/**
 * Загружает данные профиля
 */
function loadProfileData() {
  console.log('📡 Загрузка данных профиля...');
  console.log('🔍 Проверка Telegram WebApp:', window.Telegram?.WebApp);
  console.log('🔍 initData:', window.Telegram?.WebApp?.initData);
  console.log('🔍 initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);

  const user = getTelegramUser();
  console.log('👤 Полученные данные пользователя:', user);
  
  if (user) {
    profileData = {
      id: user.id,
      firstName: user.first_name || 'Пользователь',
      lastName: user.last_name || '',
      username: user.username || '',
      phone: localStorage.getItem('profile_phone') || '',
      businessName: localStorage.getItem('profile_business') || '',
      address: localStorage.getItem('profile_address') || ''
    };
    
    console.log('✅ Данные профиля загружены:', profileData);
    updateProfileUI();
  } else {
    console.error('❌ Не удалось получить данные пользователя из Telegram');
    console.log('ℹ️ Возможные причины:');
    console.log('1. WebApp не открыт через Telegram бота');
    console.log('2. initData пустой или не передан');
    console.log('3. Проблема с Telegram SDK');
    
    profileData = {
      firstName: 'Пользователь',
      lastName: '',
      username: '',
      phone: '',
      businessName: '',
      address: ''
    };
    updateProfileUI();
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
  document.getElementById('detail-phone').textContent = profileData.phone || 'Не указан';
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
 * Сохраняет изменения профиля
 */
function saveProfile() {
  const phone = document.getElementById('edit-phone').value.trim();
  const businessName = document.getElementById('edit-business').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  
  // Сохраняем в localStorage (временно, пока нет API)
  if (phone) localStorage.setItem('profile_phone', phone);
  if (businessName) localStorage.setItem('profile_business', businessName);
  if (address) localStorage.setItem('profile_address', address);
  
  // Обновляем данные профиля
  profileData.phone = phone;
  profileData.businessName = businessName;
  profileData.address = address;
  
  // Обновляем UI и выходим из режима редактирования
  updateProfileUI();
  toggleEditMode();
  
  // Показываем уведомление
  showNotification('Профиль успешно обновлен!');
  
  console.log('✅ Профиль сохранен:', {
    phone,
    businessName,
    address
  });
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
    saveButton.addEventListener('click', (e) => {
      e.preventDefault();
      saveProfile();
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

