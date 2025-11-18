/**
 * Логика страницы записей
 * Слой Pages - страницы приложения
 */

import { isAuthenticated, logout } from '../../shared/lib/auth-api.js';

// Проверяем авторизацию при загрузке страницы
if (!isAuthenticated()) {
  console.log('❌ Пользователь не авторизован, перенаправляем на login');
  window.location.href = '../login/index.html';
  // Прерываем выполнение скрипта
  throw new Error('User not authenticated');
}

// Функция выхода
window.handleLogout = function() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    logout();
  }
};

// Пример данных (потом заменить на API)
const mockRecords = [
  {
    id: 1,
    clientName: 'Иван Иванов',
    service: 'Стрижка',
    date: '2025-11-01',
    time: '14:00'
  },
  {
    id: 2,
    clientName: 'Мария Петрова',
    service: 'Окрашивание',
    date: '2025-11-02',
    time: '10:30'
  },
  {
    id: 3,
    clientName: 'Александр Сидоров',
    service: 'Маникюр',
    date: '2025-11-03',
    time: '16:00'
  }
];

function renderRecords() {
  const container = document.getElementById('records-list');
  
  if (!container) return;
  
  if (mockRecords.length === 0) {
    container.innerHTML = '<p>Нет записей</p>';
    return;
  }
  
  container.innerHTML = mockRecords.map(record => `
    <div class="record-item">
      <h3>${record.clientName}</h3>
      <p>Услуга: ${record.service}</p>
      <p>Дата: ${record.date}</p>
      <p>Время: ${record.time}</p>
    </div>
  `).join('');
  
  console.log('✅ Записи загружены:', mockRecords.length);
}

// Загружаем записи при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderRecords);
} else {
  renderRecords();
}

