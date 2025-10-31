/**
 * Логика страницы профиля
 * Слой Pages - страницы приложения
 */

function loadProfileData() {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;
    
    if (user) {
      // Загружаем данные пользователя
      const firstName = user.first_name || 'Пользователь';
      const lastName = user.last_name || '';
      const username = user.username ? `@${user.username}` : 'Нет username';
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      const userId = user.id || '-';
      const languageCode = user.language_code?.toUpperCase() || 'RU';
      
      // Обновляем заголовок
      document.getElementById('profile-name').textContent = fullName;
      document.getElementById('profile-username').textContent = username;
      
      // Обновляем детали
      document.getElementById('detail-firstname').textContent = firstName;
      document.getElementById('detail-lastname').textContent = lastName || 'Не указана';
      
      // Загружаем дополнительные данные из localStorage или показываем заглушки
      loadAdditionalData();
      
      // Получаем инициалы для аватара
      const initials = getInitials(firstName, lastName);
      document.getElementById('avatar-initials').textContent = initials;
      
      // Генерируем градиент для аватара на основе ID
      if (user.id) {
        const avatarCircle = document.getElementById('avatar');
        const gradient = generateGradient(user.id);
        avatarCircle.style.background = gradient;
      }
      
      console.log('✅ Профиль загружен:', fullName);
    } else {
      // Если данных нет, показываем тестовые
      loadMockData();
    }
  } else {
    // Для тестирования без Telegram
    loadMockData();
  }
  
  // Загружаем статистику
  loadStatistics();
}

function loadMockData() {
  document.getElementById('profile-name').textContent = 'Демо Пользователь';
  document.getElementById('profile-username').textContent = '@demo_user';
  document.getElementById('detail-firstname').textContent = 'Демо';
  document.getElementById('detail-lastname').textContent = 'Пользователь';
  document.getElementById('avatar-initials').textContent = 'ДП';
  loadAdditionalData();
}

function loadAdditionalData() {
  // Загружаем данные из localStorage
  const phone = localStorage.getItem('profile_phone') || 'Не указан';
  const business = localStorage.getItem('profile_business') || 'Не указано';
  const address = localStorage.getItem('profile_address') || 'Не указан';
  
  document.getElementById('detail-phone').textContent = phone;
  document.getElementById('detail-business').textContent = business;
  document.getElementById('detail-address').textContent = address;
}

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

function generateGradient(userId) {
  // Генерируем градиент на основе ID пользователя
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

function loadStatistics() {
  // Mock данные (позже заменить на реальные из API)
  const stats = {
    records: 15,
    clients: 12,
    services: 6
  };
  
  document.getElementById('stat-records').textContent = stats.records;
  document.getElementById('stat-clients').textContent = stats.clients;
  document.getElementById('stat-services').textContent = stats.services;
}

function handleEditProfile() {
  const phone = prompt('Введите телефон:', localStorage.getItem('profile_phone') || '');
  const business = prompt('Введите название бизнеса:', localStorage.getItem('profile_business') || '');
  const address = prompt('Введите адрес:', localStorage.getItem('profile_address') || '');
  
  if (phone !== null) {
    localStorage.setItem('profile_phone', phone);
    document.getElementById('detail-phone').textContent = phone || 'Не указан';
  }
  
  if (business !== null) {
    localStorage.setItem('profile_business', business);
    document.getElementById('detail-business').textContent = business || 'Не указано';
  }
  
  if (address !== null) {
    localStorage.setItem('profile_address', address);
    document.getElementById('detail-address').textContent = address || 'Не указан';
  }
  
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.showAlert('Профиль обновлен!');
  }
}

function initProfilePage() {
  // Загружаем данные профиля
  loadProfileData();
  
  // Обработчик кнопки редактирования
  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) {
    editBtn.addEventListener('click', handleEditProfile);
  }
  
  console.log('✅ Страница профиля инициализирована');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

