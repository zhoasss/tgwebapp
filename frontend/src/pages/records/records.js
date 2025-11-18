/**
 * Логика страницы записей
 * Слой Pages - страницы приложения
 */

import { showNotification } from '../../shared/lib/telegram.js';
import { getAppointments } from '../../shared/lib/profile-api.js';

// Состояние страницы
let records = [];
let isLoading = false;
let currentStatus = null; // null = все, 'pending', 'confirmed', 'completed'

/**
 * Форматирование даты и времени
 */
function formatDateTime(dateString) {
  try {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return { date: formattedDate, time: formattedTime };
  } catch (error) {
    console.error('❌ Ошибка форматирования даты:', error);
    return { date: 'Неизвестно', time: 'Неизвестно' };
  }
}

/**
 * Получение полного имени клиента
 */
function getClientFullName(client) {
  if (!client) return 'Клиент не указан';

  const firstName = client.first_name || '';
  const lastName = client.last_name || '';

  return `${firstName} ${lastName}`.trim() || 'Клиент';
}

/**
 * Получение цвета статуса
 */
function getStatusColor(status) {
  switch (status) {
    case 'pending': return '#FF9800'; // Оранжевый
    case 'confirmed': return '#4CAF50'; // Зеленый
    case 'cancelled': return '#F44336'; // Красный
    case 'completed': return '#2196F3'; // Синий
    default: return '#9E9E9E'; // Серый
  }
}

/**
 * Получение текста статуса на русском
 */
function getStatusText(status) {
  switch (status) {
    case 'pending': return 'Ожидает';
    case 'confirmed': return 'Подтверждена';
    case 'cancelled': return 'Отменена';
    case 'completed': return 'Завершена';
    default: return 'Неизвестен';
  }
}

/**
 * Показать состояние загрузки
 */
function showLoading(show) {
  isLoading = show;
  const container = document.getElementById('records-list');
  const loadingElement = document.getElementById('loading-indicator');

  if (!container) return;

  if (show) {
    container.innerHTML = '<div class="loading-placeholder">Загрузка записей...</div>';
    if (loadingElement) loadingElement.style.display = 'flex';
  } else {
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

/**
 * Показать сообщение об ошибке
 */
function showError(message) {
  const container = document.getElementById('records-list');
  if (!container) return;

  container.innerHTML = `
    <div class="error-message">
      <p>❌ ${message}</p>
      <button id="retry-btn" class="retry-btn">Повторить</button>
    </div>
  `;

  // Добавляем обработчик для кнопки повтора
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => loadRecords());
  }
}

/**
 * Отрисовка записей
 */
function renderRecords() {
  const container = document.getElementById('records-list');

  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = '<p class="no-records">📅 Нет записей</p>';
    return;
  }

  container.innerHTML = records.map(record => {
    const { date, time } = formatDateTime(record.appointment_date);
    const clientName = getClientFullName(record.client);
    const serviceName = record.service?.name || 'Услуга не указана';
    const statusColor = getStatusColor(record.status);
    const statusText = getStatusText(record.status);
    const price = record.price || record.service?.price;

    return `
      <div class="record-item" data-id="${record.id}">
        <div class="record-header">
          <h3 class="client-name">${clientName}</h3>
          <span class="status-badge" style="background-color: ${statusColor}">
            ${statusText}
          </span>
        </div>

        <div class="record-details">
          <p class="service-info">
            <span class="service-name">✂️ ${serviceName}</span>
            ${price ? `<span class="price">${price} ₽</span>` : ''}
          </p>

          <p class="datetime-info">
            📅 ${date} в ${time}
          </p>

          ${record.notes ? `<p class="notes">📝 ${record.notes}</p>` : ''}
          ${record.client_notes ? `<p class="client-notes">💬 ${record.client_notes}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  console.log('✅ Записи отрисованы:', records.length);
}

/**
 * Загрузка записей из API
 */
async function loadRecords() {
  console.log('📡 Загрузка записей из API...');

  // Проверяем авторизацию
  if (!window.Telegram?.WebApp?.initData) {
    showError('Не удалось получить данные авторизации. Пожалуйста, перезапустите приложение.');
    return;
  }

  showLoading(true);

  try {
    const response = await getAppointments(currentStatus, null, null, 50, 0);

    if (response && response.appointments) {
      records = response.appointments;
      console.log('✅ Записи получены из API:', records.length);

      // Сортируем по дате (новые сверху)
      records.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateB - dateA;
      });

      renderRecords();
    } else {
      throw new Error('Неверный формат ответа API');
    }

  } catch (error) {
    console.error('❌ Ошибка загрузки записей:', error);

    if (error.message && error.message.includes('Failed to fetch')) {
      showError('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
    } else if (error.message && error.message.includes('401')) {
      showError('Ошибка авторизации. Пожалуйста, перезапустите приложение.');
    } else if (error.message && error.message.includes('404')) {
      showError('Сервис временно недоступен.');
    } else {
      showError(`Не удалось загрузить записи: ${error.message || 'Неизвестная ошибка'}`);
    }
  } finally {
    showLoading(false);
  }
}

/**
 * Фильтрация записей по статусу
 */
function filterRecords(status) {
  currentStatus = status;

  // Обновляем активную кнопку фильтра
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    }
  });

  // Перезагружаем записи с новым фильтром
  loadRecords();
}

/**
 * Инициализация страницы записей
 */
function initRecordsPage() {
  console.log('🚀 Инициализация страницы записей...');

  // Проверяем авторизацию
  if (!window.Telegram?.WebApp) {
    showError('Это приложение работает только в Telegram. Пожалуйста, запустите его через бота.');
    return;
  }

  // Ждем загрузки Telegram WebApp
  if (!window.Telegram.WebApp.initData) {
    console.log('⏳ Ожидание инициализации Telegram WebApp...');
    setTimeout(initRecordsPage, 100);
    return;
  }

  console.log('✅ Telegram WebApp готов, загружаем записи...');

  // Загружаем записи
  loadRecords();

  // Настраиваем фильтры (если есть)
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const status = e.target.dataset.status;
      filterRecords(status);
    });
  });

  console.log('✅ Страница записей инициализирована');
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecordsPage);
} else {
  initRecordsPage();
}

