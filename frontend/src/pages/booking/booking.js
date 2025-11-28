/**
 * Public Booking Page Logic
 * @version 1.0.0
 */

// Получаем booking_slug из URL
const pathParts = window.location.pathname.split('/');
const bookingSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

// API базовый URL
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : 'https://booking-cab.ru/api';

// Состояние приложения
const state = {
    masterProfile: null,
    services: [],
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    availability: null
};

// Инициализация
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚀 Initializing booking page for slug:', bookingSlug);

    if (!bookingSlug || bookingSlug === 'booking' || bookingSlug === 'index.html') {
        showError('Неверная ссылка для бронирования');
        return;
    }

    showLoader();

    try {
        await loadMasterProfile();
        await loadServices();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Не удалось загрузить данные. Проверьте ссылку.');
    } finally {
        hideLoader();
    }
}

// Загрузка профиля мастера
async function loadMasterProfile() {
    console.log('📡 Loading master profile...');

    const response = await fetch(`${API_URL}/booking/${bookingSlug}/profile`);

    if (!response.ok) {
        throw new Error('Master not found');
    }

    state.masterProfile = await response.json();
    console.log('✅ Master profile loaded:', state.masterProfile);

    renderMasterProfile();
}

function renderMasterProfile() {
    const profile = state.masterProfile;

    // Имя
    document.getElementById('master-name').textContent =
        `${profile.first_name} ${profile.last_name || ''}`.trim();

    // Название бизнеса
    if (profile.business_name) {
        document.getElementById('master-business').textContent = profile.business_name;
        document.getElementById('master-business').style.display = 'block';
    } else {
        document.getElementById('master-business').style.display = 'none';
    }

    // Телефон
    if (profile.phone) {
        document.querySelector('#master-phone .text').textContent = profile.phone;
        document.getElementById('master-phone').style.display = 'flex';
    } else {
        document.getElementById('master-phone').style.display = 'none';
    }

    // Адрес
    if (profile.address) {
        document.querySelector('#master-address .text').textContent = profile.address;
        document.getElementById('master-address').style.display = 'flex';
    } else {
        document.getElementById('master-address').style.display = 'none';
    }

    // Аватар
    if (profile.avatar_url) {
        const img = document.getElementById('master-avatar-img');
        img.src = profile.avatar_url;
        img.onload = () => {
            img.classList.add('loaded');
            document.querySelector('.avatar-placeholder').style.display = 'none';
        };
    }
}

// Загрузка услуг
async function loadServices() {
    console.log('📡 Loading services...');

    const response = await fetch(`${API_URL}/booking/${bookingSlug}/services`);

    if (!response.ok) {
        throw new Error('Failed to load services');
    }

    const data = await response.json();
    state.services = data.services;
    console.log('✅ Services loaded:', state.services.length);

    renderServices();
}

function renderServices() {
    const servicesList = document.getElementById('services-list');
    servicesList.innerHTML = '';

    if (state.services.length === 0) {
        servicesList.innerHTML = '<p class="text-center">Нет доступных услуг</p>';
        return;
    }

    state.services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.dataset.serviceId = service.id;

        card.innerHTML = `
      <div class="service-name">${escapeHtml(service.name)}</div>
      ${service.description ? `<p>${escapeHtml(service.description)}</p>` : ''}
      <div class="service-info">
        <span>⏱️ ${service.duration_minutes} мин</span>
        <span class="service-price">${service.price} ₽</span>
      </div>
    `;

        card.addEventListener('click', () => selectService(service));
        servicesList.appendChild(card);
    });
}

// Выбор услуги
function selectService(service) {
    console.log('✅ Service selected:', service.name);

    state.selectedService = service;
    state.selectedDate = null;
    state.selectedTime = null;

    // Обновляем UI
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-service-id="${service.id}"]`).classList.add('selected');

    // Показываем секцию выбора даты
    document.getElementById('datetime-section').classList.remove('hidden');
    document.getElementById('datetime-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Устанавливаем минимальную дату (сегодня)
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date-input');
    dateInput.min = today;
    dateInput.value = '';

    // Очищаем слоты
    document.getElementById('time-slots').innerHTML = '';
    document.getElementById('contact-section').classList.add('hidden');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Выбор даты
    document.getElementById('date-input').addEventListener('change', async (e) => {
        state.selectedDate = e.target.value;
        state.selectedTime = null;

        if (state.selectedDate) {
            await loadTimeSlots();
        }
    });

    // Отправка формы
    document.getElementById('booking-form').addEventListener('submit', handleBooking);

    // Маска для телефона
    const phoneInput = document.getElementById('client-phone');
    phoneInput.addEventListener('input', formatPhoneNumber);
}

// Загрузка временных слотов
async function loadTimeSlots() {
    if (!state.selectedDate) return;

    console.log('📡 Loading time slots for:', state.selectedDate);
    showLoader();

    try {
        const response = await fetch(
            `${API_URL}/booking/${bookingSlug}/availability?date=${state.selectedDate}`
        );

        if (!response.ok) {
            throw new Error('Failed to load availability');
        }

        state.availability = await response.json();
        console.log('✅ Availability loaded:', state.availability);

        renderTimeSlots();

    } catch (error) {
        console.error('Error loading time slots:', error);
        showError('Не удалось загрузить доступное время');
    } finally {
        hideLoader();
    }
}

function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    container.innerHTML = '';

    if (!state.availability.is_working_day) {
        container.innerHTML = '<p class="time-slots-empty">😴 Выходной день</p>';
        return;
    }

    // Генерируем слоты
    const slots = generateTimeSlots(
        state.availability.working_hours.start,
        state.availability.working_hours.end,
        state.availability.break,
        state.availability.booked_slots,
        state.selectedService.duration_minutes
    );

    if (slots.length === 0) {
        container.innerHTML = '<p class="time-slots-empty">😔 Нет доступных слотов на эту дату</p>';
        return;
    }

    slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot';
        button.textContent = slot.time;

        if (slot.booked) {
            button.classList.add('disabled');
            button.disabled = true;
        } else {
            button.addEventListener('click', () => selectTime(slot.time));
        }

        container.appendChild(button);
    });
}

// Генерация временных слотов
function generateTimeSlots(startTime, endTime, breakTime, bookedSlots, serviceDuration) {
    const slots = [];
    const slotInterval = 30; // Интервал между слотами в минутах

    // Парсим время
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Парсим перерыв
    let breakStartMinutes = null;
    let breakEndMinutes = null;

    if (breakTime && breakTime.start && breakTime.end) {
        const [bsHour, bsMinute] = breakTime.start.split(':').map(Number);
        const [beHour, beMinute] = breakTime.end.split(':').map(Number);
        breakStartMinutes = bsHour * 60 + bsMinute;
        breakEndMinutes = beHour * 60 + beMinute;
    }

    while (currentMinutes + serviceDuration <= endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        // Проверяем, не попадает ли слот в перерыв
        const isInBreak = breakStartMinutes !== null &&
            currentMinutes >= breakStartMinutes &&
            currentMinutes < breakEndMinutes;

        if (!isInBreak) {
            // Проверяем, не занят ли слот
            const isBooked = bookedSlots.some(booked => {
                const bookedStart = new Date(booked.start);
                const bookedHour = bookedStart.getHours();
                const bookedMinute = bookedStart.getMinutes();
                const bookedStartMinutes = bookedHour * 60 + bookedMinute;
                const bookedEndMinutes = bookedStartMinutes + booked.duration_minutes;

                // Проверяем пересечение
                return (currentMinutes >= bookedStartMinutes && currentMinutes < bookedEndMinutes) ||
                    (currentMinutes + serviceDuration > bookedStartMinutes && currentMinutes < bookedStartMinutes);
            });

            slots.push({
                time: timeStr,
                booked: isBooked
            });
        }

        currentMinutes += slotInterval;
    }

    return slots;
}

// Выбор времени
function selectTime(time) {
    console.log('✅ Time selected:', time);

    state.selectedTime = time;

    // Обновляем UI
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Показываем форму контактов
    document.getElementById('contact-section').classList.remove('hidden');
    document.getElementById('contact-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Обработка отправки формы
async function handleBooking(e) {
    e.preventDefault();

    console.log('📝 Submitting booking...');
    showLoader();

    try {
        const formData = {
            service_id: state.selectedService.id,
            client_first_name: document.getElementById('client-name').value.trim(),
            client_last_name: document.getElementById('client-lastname').value.trim() || null,
            client_phone: document.getElementById('client-phone').value.replace(/\D/g, ''),
            client_email: document.getElementById('client-email').value.trim() || null,
            appointment_date: `${state.selectedDate}T${state.selectedTime}:00`,
            client_notes: document.getElementById('client-notes').value.trim() || null
        };

        console.log('📤 Booking data:', formData);

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
        console.log('✅ Booking created:', result);

        showSuccess(result);

    } catch (error) {
        console.error('❌ Booking error:', error);
        showError(error.message);
    } finally {
        hideLoader();
    }
}

// Показать успешное сообщение
function showSuccess(result) {
    // Скрываем все секции
    document.getElementById('services-section').classList.add('hidden');
    document.getElementById('datetime-section').classList.add('hidden');
    document.getElementById('contact-section').classList.add('hidden');

    // Показываем успех
    document.getElementById('success-section').classList.remove('hidden');

    // Форматируем дату
    const appointmentDate = new Date(result.appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Заполняем детали
    document.getElementById('booking-details').innerHTML = `
    <p>
      <strong>Услуга:</strong>
      <span>${escapeHtml(result.appointment.service_name)}</span>
    </p>
    <p>
      <strong>Дата:</strong>
      <span>${formattedDate}</span>
    </p>
    <p>
      <strong>Время:</strong>
      <span>${formattedTime}</span>
    </p>
    <p>
      <strong>Продолжительность:</strong>
      <span>${result.appointment.duration_minutes} мин</span>
    </p>
    <p>
      <strong>Цена:</strong>
      <span>${result.appointment.price} ₽</span>
    </p>
  `;

    // Прокрутка вверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Форматирование номера телефона
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 0) {
        if (value[0] === '8') {
            value = '7' + value.slice(1);
        }
        if (value[0] !== '7') {
            value = '7' + value;
        }
    }

    let formatted = '+7';
    if (value.length > 1) {
        formatted += ' (' + value.substring(1, 4);
    }
    if (value.length >= 5) {
        formatted += ') ' + value.substring(4, 7);
    }
    if (value.length >= 8) {
        formatted += '-' + value.substring(7, 9);
    }
    if (value.length >= 10) {
        formatted += '-' + value.substring(9, 11);
    }

    e.target.value = formatted;
}

// Утилиты
function showLoader() {
    document.getElementById('page-loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('page-loader').style.display = 'none';
}

function showError(message) {
    hideLoader();
    alert('❌ ' + message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('📄 Booking page script loaded');
