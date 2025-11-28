# 🔗 Публичная страница бронирования

## ✅ Что реализовано (Backend)

### 1. Модель данных
- ✅ Добавлено поле `booking_slug` в модель User (уникальная ссылка)
- ✅ Добавлено поле `avatar_url` в модель User (фото профиля)
- ✅ Создана миграция `002_add_booking_fields.py`

### 2. API для мастера (требует авторизации)
**Файл:** `backend/src/features/api/profiles.py`

- ✅ `POST /api/profiles/generate-booking-link` - генерация уникальной ссылки
- ✅ `DELETE /api/profiles/booking-link` - удаление ссылки

### 3. Публичное API (без авторизации)
**Файл:** `backend/src/features/api/public_booking.py`

- ✅ `GET /api/booking/{slug}/profile` - профиль мастера
- ✅ `GET /api/booking/{slug}/services` - список услуг
- ✅ `GET /api/booking/{slug}/availability?date=YYYY-MM-DD` - доступные слоты
- ✅ `POST /api/booking/{slug}/book` - создание записи

### 4. Интеграция
- ✅ Роутер зарегистрирован в `api_server.py`

---

## 📋 Что нужно доделать (Frontend)

### 1. CSS стили
**Создать:** `frontend/src/pages/booking/booking.css`

```css
/* Профиль мастера */
.master-profile {
  text-align: center;
  padding: 2rem;
  background: var(--card-bg);
  border-radius: 16px;
  margin-bottom: 2rem;
}

.master-avatar {
  width: 120px;
  height: 120px;
  margin: 0 auto 1rem;
  position: relative;
}

.master-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.business-name {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0.5rem 0;
}

.master-contacts {
  margin-top: 1rem;
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

/* Услуги */
.services-list {
  display: grid;
  gap: 1rem;
}

.service-card {
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.service-card:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
}

.service-card.selected {
  border-color: var(--accent-color);
  background: var(--accent-color-alpha);
}

.service-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.service-info {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Временные слоты */
.time-slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.time-slot {
  padding: 0.75rem;
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.time-slot:hover {
  border-color: var(--accent-color);
}

.time-slot.selected {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.time-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Форма */
.booking-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-color);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* Успех */
.success-message {
  text-align: center;
  padding: 3rem 2rem;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 1rem;
}

.booking-details {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: 12px;
  text-align: left;
}

/* Утилиты */
.section {
  margin-bottom: 2rem;
}

.hidden {
  display: none !important;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 2. JavaScript логика
**Создать:** `frontend/src/pages/booking/booking.js`

```javascript
/**
 * Public Booking Page Logic
 */

// Получаем booking_slug из URL
const urlParams = new URLSearchParams(window.location.search);
const bookingSlug = urlParams.get('slug') || window.location.pathname.split('/').pop();

// Состояние
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let masterProfile = null;

// API базовый URL
const API_URL = 'https://booking-cab.ru/api';

// Инициализация
document.addEventListener('DOMContentLoaded', init);

async function init() {
  showLoader();
  
  try {
    // Загружаем профиль мастера
    await loadMasterProfile();
    
    // Загружаем услуги
    await loadServices();
    
    // Настраиваем обработчики
    setupEventListeners();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Не удалось загрузить данные');
  } finally {
    hideLoader();
  }
}

async function loadMasterProfile() {
  const response = await fetch(`${API_URL}/booking/${bookingSlug}/profile`);
  
  if (!response.ok) {
    throw new Error('Master not found');
  }
  
  masterProfile = await response.json();
  
  // Отображаем профиль
  document.getElementById('master-name').textContent = 
    `${masterProfile.first_name} ${masterProfile.last_name || ''}`;
  
  if (masterProfile.business_name) {
    document.getElementById('master-business').textContent = masterProfile.business_name;
  }
  
  if (masterProfile.phone) {
    document.querySelector('#master-phone .text').textContent = masterProfile.phone;
  } else {
    document.getElementById('master-phone').style.display = 'none';
  }
  
  if (masterProfile.address) {
    document.querySelector('#master-address .text').textContent = masterProfile.address;
  } else {
    document.getElementById('master-address').style.display = 'none';
  }
  
  if (masterProfile.avatar_url) {
    document.getElementById('master-avatar-img').src = masterProfile.avatar_url;
    document.getElementById('master-avatar-img').style.display = 'block';
    document.querySelector('.avatar-placeholder').style.display = 'none';
  }
}

async function loadServices() {
  const response = await fetch(`${API_URL}/booking/${bookingSlug}/services`);
  const data = await response.json();
  
  const servicesList = document.getElementById('services-list');
  servicesList.innerHTML = '';
  
  data.services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.serviceId = service.id;
    card.innerHTML = `
      <div class="service-name">${service.name}</div>
      ${service.description ? `<p>${service.description}</p>` : ''}
      <div class="service-info">
        <span>${service.duration_minutes} мин</span>
        <span>${service.price} ₽</span>
      </div>
    `;
    
    card.addEventListener('click', () => selectService(service));
    servicesList.appendChild(card);
  });
}

function selectService(service) {
  selectedService = service;
  
  // Обновляем UI
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-service-id="${service.id}"]`).classList.add('selected');
  
  // Показываем выбор даты
  document.getElementById('datetime-section').classList.remove('hidden');
  
  // Устанавливаем минимальную дату (сегодня)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date-input').min = today;
}

function setupEventListeners() {
  // Выбор даты
  document.getElementById('date-input').addEventListener('change', async (e) => {
    selectedDate = e.target.value;
    await loadTimeSlots();
  });
  
  // Отправка формы
  document.getElementById('booking-form').addEventListener('submit', handleBooking);
}

async function loadTimeSlots() {
  if (!selectedDate) return;
  
  showLoader();
  
  try {
    const response = await fetch(
      `${API_URL}/booking/${bookingSlug}/availability?date=${selectedDate}`
    );
    const data = await response.json();
    
    const timeSlotsContainer = document.getElementById('time-slots');
    timeSlotsContainer.innerHTML = '';
    
    if (!data.is_working_day) {
      timeSlotsContainer.innerHTML = '<p>Выходной день</p>';
      return;
    }
    
    // Генерируем слоты (каждые 30 минут)
    const slots = generateTimeSlots(
      data.working_hours.start,
      data.working_hours.end,
      data.break,
      data.booked_slots
    );
    
    slots.forEach(slot => {
      const button = document.createElement('button');
      button.className = 'time-slot';
      button.textContent = slot.time;
      button.disabled = slot.booked;
      
      if (slot.booked) {
        button.classList.add('disabled');
      }
      
      button.addEventListener('click', () => selectTime(slot.time));
      timeSlotsContainer.appendChild(button);
    });
    
  } catch (error) {
    console.error('Error loading time slots:', error);
  } finally {
    hideLoader();
  }
}

function generateTimeSlots(start, end, breakTime, bookedSlots) {
  // Упрощенная генерация слотов
  // TODO: Реализовать полную логику с учетом продолжительности услуги
  const slots = [];
  // ... логика генерации
  return slots;
}

function selectTime(time) {
  selectedTime = time;
  
  // Обновляем UI
  document.querySelectorAll('.time-slot').forEach(slot => {
    slot.classList.remove('selected');
  });
  event.target.classList.add('selected');
  
  // Показываем форму контактов
  document.getElementById('contact-section').classList.remove('hidden');
}

async function handleBooking(e) {
  e.preventDefault();
  
  showLoader();
  
  try {
    const formData = {
      service_id: selectedService.id,
      client_first_name: document.getElementById('client-name').value,
      client_last_name: document.getElementById('client-lastname').value || null,
      client_phone: document.getElementById('client-phone').value,
      client_email: document.getElementById('client-email').value || null,
      appointment_date: `${selectedDate}T${selectedTime}:00`,
      client_notes: document.getElementById('client-notes').value || null
    };
    
    const response = await fetch(`${API_URL}/booking/${bookingSlug}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка создания записи');
    }
    
    const result = await response.json();
    
    // Показываем успех
    showSuccess(result);
    
  } catch (error) {
    console.error('Booking error:', error);
    alert(error.message);
  } finally {
    hideLoader();
  }
}

function showSuccess(result) {
  // Скрываем все секции
  document.getElementById('services-section').classList.add('hidden');
  document.getElementById('datetime-section').classList.add('hidden');
  document.getElementById('contact-section').classList.add('hidden');
  
  // Показываем успех
  document.getElementById('success-section').classList.remove('hidden');
  
  // Заполняем детали
  document.getElementById('booking-details').innerHTML = `
    <p><strong>Услуга:</strong> ${result.appointment.service_name}</p>
    <p><strong>Дата:</strong> ${new Date(result.appointment.appointment_date).toLocaleString('ru-RU')}</p>
    <p><strong>Цена:</strong> ${result.appointment.price} ₽</p>
  `;
}

function showLoader() {
  document.getElementById('page-loader').style.display = 'flex';
}

function hideLoader() {
  document.getElementById('page-loader').style.display = 'none';
}

function showError(message) {
  alert(message);
}
```

### 3. Кнопка в настройках
**Обновить:** `frontend/src/pages/settings/settings.js`

Добавить кнопку "Создать ссылку для записи" которая вызывает:
```javascript
async function generateBookingLink() {
  const response = await apiClient.post('/api/profiles/generate-booking-link');
  const bookingUrl = response.booking_url;
  
  // Показать ссылку и кнопку "Поделиться"
  if (navigator.share) {
    await navigator.share({
      title: 'Запись онлайн',
      text: 'Записаться ко мне онлайн',
      url: bookingUrl
    });
  } else {
    // Копировать в буфер обмена
    await navigator.clipboard.writeText(bookingUrl);
    alert('Ссылка скопирована!');
  }
}
```

---

## 🚀 Как использовать

### 1. Мастер генерирует ссылку
```
POST /api/profiles/generate-booking-link
Authorization: Bearer {token}

Response:
{
  "booking_slug": "abc123xy",
  "booking_url": "https://booking-cab.ru/booking/abc123xy"
}
```

### 2. Мастер делится ссылкой
- Отправляет клиенту в Telegram
- Публикует в соцсетях
- Добавляет на сайт

### 3. Клиент открывает ссылку
```
https://booking-cab.ru/booking/abc123xy
```

### 4. Клиент видит:
- Профиль мастера (фото, имя, контакты)
- Список услуг
- Календарь с доступными датами
- Временные слоты
- Форму для записи

### 5. После записи:
- Запись создается со статусом `PENDING`
- Мастер видит новую запись в своем кабинете
- Мастер подтверждает или отклоняет

---

## 📝 TODO

- [ ] Доделать CSS стили
- [ ] Доделать JavaScript логику
- [ ] Добавить кнопку в настройках
- [ ] Добавить генерацию временных слотов
- [ ] Добавить валидацию формы
- [ ] Добавить маску для телефона
- [ ] Тестирование

---

## 🎨 Дизайн

Страница должна быть:
- ✨ Красивой и современной
- 📱 Адаптивной (mobile-first)
- 🎯 Простой в использовании
- ⚡ Быстрой

Используйте существующие CSS переменные из `variables.css`.
