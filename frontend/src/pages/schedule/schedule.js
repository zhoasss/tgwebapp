/**
 * Schedule Page Logic (Calendar View + Multi-select + Date Overrides)
 * @version 1.2.0
 */

import { getWorkingHours, updateWorkingDaysBulk } from '../../shared/lib/schedule-api.js?v=3.1.0';
import pageLoader from '../../shared/ui/loader/loader.js?v=3.1.0';
import { showNotification } from '../../shared/lib/telegram.js?v=3.1.0';

// Константы
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Состояние
let currentDate = new Date(); // Текущий отображаемый месяц
let selectedDates = new Set(); // Set<string> (YYYY-MM-DD)

// Данные
let weekTemplate = []; // Шаблон по дням недели (7 элементов)
let dayOverrides = {}; // Map<YYYY-MM-DD, DayConfig> - конкретные настройки дней

// Инициализация
document.addEventListener('DOMContentLoaded', initSchedulePage);

async function initSchedulePage() {
    try {
        pageLoader.show();

        // 1. Загрузка данных
        const response = await getWorkingHours();

        // Инициализируем шаблон (если есть)
        weekTemplate = initializeWeekTemplate(response.working_hours || []);

        // Инициализируем переопределения (конкретные дни)
        dayOverrides = initializeDayOverrides(response.working_days || []);

        // 2. Рендер календаря
        renderCalendar(currentDate);

        // 3. Обработчики событий
        setupEventListeners();

        pageLoader.hide();
    } catch (error) {
        console.error('Failed to init schedule page:', error);
        showNotification('Ошибка загрузки графика', 'error');
        pageLoader.hide();
    }
}

/**
 * Инициализация шаблона недели
 */
function initializeWeekTemplate(loadedData) {
    const fullSchedule = [];
    for (let i = 0; i < 7; i++) {
        const existingDay = loadedData.find(d => d.day_of_week === i);
        if (existingDay) {
            fullSchedule.push({ ...existingDay });
        } else {
            fullSchedule.push({
                day_of_week: i,
                is_working_day: false,
                start_time: '09:00',
                end_time: '18:00',
                break_start: null,
                break_end: null
            });
        }
    }
    return fullSchedule;
}

/**
 * Инициализация переопределений дней
 */
function initializeDayOverrides(loadedDays) {
    const overrides = {};
    loadedDays.forEach(day => {
        overrides[day.date] = day;
    });
    return overrides;
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    if (window.Telegram?.WebApp?.BackButton) {
        window.Telegram.WebApp.BackButton.show();
        window.Telegram.WebApp.BackButton.onClick(() => {
            window.history.back();
        });
    }

    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    document.getElementById('configure-btn').addEventListener('click', openBottomSheet);
    document.getElementById('close-sheet-btn').addEventListener('click', closeBottomSheet);
    document.getElementById('bottom-sheet-overlay').addEventListener('click', closeBottomSheet);
    document.getElementById('save-day-btn').addEventListener('click', handleSaveDays);

    document.getElementById('is-working-day').addEventListener('change', (e) => {
        const timeGroup = document.getElementById('time-settings-group');
        if (e.target.checked) {
            timeGroup.classList.remove('disabled');
        } else {
            timeGroup.classList.add('disabled');
        }
    });

    document.getElementById('has-break').addEventListener('change', (e) => {
        const breakGroup = document.getElementById('break-inputs-group');
        if (e.target.checked) {
            breakGroup.classList.remove('disabled');
        } else {
            breakGroup.classList.add('disabled');
        }
    });
}

/**
 * Рендер календаря
 */
function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    document.getElementById('current-month-label').textContent = `${MONTH_NAMES[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        grid.appendChild(emptyCell);
    }

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const dateStr = formatDateKey(cellDate);
        const dayOfWeek = (cellDate.getDay() + 6) % 7;

        // Получаем конфигурацию: Сначала ищем в overrides, потом в шаблоне
        const override = dayOverrides[dateStr];
        const template = weekTemplate[dayOfWeek];
        const config = override || template;

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;
        cell.dataset.date = dateStr;

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        // Индикатор рабочего дня
        if (config && config.is_working_day) {
            const indicator = document.createElement('div');
            indicator.className = 'work-indicator';
            cell.appendChild(indicator);
        }

        if (selectedDates.has(dateStr)) {
            cell.classList.add('selected');
        }

        cell.addEventListener('click', () => toggleDateSelection(dateStr, cell));

        grid.appendChild(cell);
    }
}

function toggleDateSelection(dateStr, cellElement) {
    if (selectedDates.has(dateStr)) {
        selectedDates.delete(dateStr);
        cellElement.classList.remove('selected');
    } else {
        selectedDates.add(dateStr);
        cellElement.classList.add('selected');
    }
    updateFabVisibility();
}

function updateFabVisibility() {
    const fabContainer = document.getElementById('fab-container');
    const fabText = document.getElementById('fab-text');
    const count = selectedDates.size;

    if (count > 0) {
        fabText.textContent = `Настроить (${count})`;
        fabContainer.classList.add('visible');
    } else {
        fabContainer.classList.remove('visible');
    }
}

function openBottomSheet() {
    if (selectedDates.size === 0) return;

    document.getElementById('sheet-day-title').textContent = 'Настройка дней';
    document.getElementById('sheet-date-subtitle').textContent = `Выбрано: ${selectedDates.size}`;

    // Берем настройки первого выбранного дня для инициализации формы
    const firstDate = Array.from(selectedDates)[0];
    const override = dayOverrides[firstDate];
    const dayOfWeek = (new Date(firstDate).getDay() + 6) % 7;
    const template = weekTemplate[dayOfWeek];
    const config = override || template;

    // Заполняем форму
    const isWorking = document.getElementById('is-working-day');
    isWorking.checked = config ? config.is_working_day : true;
    isWorking.dispatchEvent(new Event('change'));

    document.getElementById('start-time').value = (config && config.start_time) ? config.start_time.slice(0, 5) : '09:00';
    document.getElementById('end-time').value = (config && config.end_time) ? config.end_time.slice(0, 5) : '18:00';

    const hasBreak = document.getElementById('has-break');
    hasBreak.checked = !!(config && config.break_start);
    hasBreak.dispatchEvent(new Event('change'));

    document.getElementById('break-start').value = (config && config.break_start) ? config.break_start.slice(0, 5) : '13:00';
    document.getElementById('break-end').value = (config && config.break_end) ? config.break_end.slice(0, 5) : '14:00';

    document.getElementById('bottom-sheet-overlay').classList.add('active');
    document.getElementById('day-settings-sheet').classList.add('active');
}

function closeBottomSheet() {
    document.getElementById('bottom-sheet-overlay').classList.remove('active');
    document.getElementById('day-settings-sheet').classList.remove('active');
}

async function handleSaveDays() {
    if (selectedDates.size === 0) return;

    const btn = document.getElementById('save-day-btn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    try {
        const isWorking = document.getElementById('is-working-day').checked;
        const hasBreak = document.getElementById('has-break').checked;

        const startTime = formatTimeFull(document.getElementById('start-time').value);
        const endTime = formatTimeFull(document.getElementById('end-time').value);
        const breakStart = hasBreak ? formatTimeFull(document.getElementById('break-start').value) : null;
        const breakEnd = hasBreak ? formatTimeFull(document.getElementById('break-end').value) : null;

        if (isWorking) {
            if (startTime >= endTime) throw new Error('Начало работы должно быть раньше конца');
            if (hasBreak && breakStart >= breakEnd) throw new Error('Начало перерыва должно быть раньше конца');
        }

        // Формируем список обновлений для конкретных дат
        const updates = [];
        selectedDates.forEach(dateStr => {
            updates.push({
                date: dateStr,
                is_working_day: isWorking,
                start_time: startTime,
                end_time: endTime,
                break_start: breakStart,
                break_end: breakEnd
            });
        });

        // Отправляем на сервер (новый эндпоинт)
        await updateWorkingDaysBulk(updates);

        // Обновляем локальный стейт (dayOverrides)
        updates.forEach(update => {
            dayOverrides[update.date] = update;
        });

        selectedDates.clear();
        updateFabVisibility();
        closeBottomSheet();
        renderCalendar(currentDate);

        showNotification('График обновлен', 'success');

    } catch (error) {
        console.error('Save failed:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    } finally {
        btn.textContent = 'Сохранить';
        btn.disabled = false;
    }
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTimeFull(timeStr) {
    if (!timeStr) return null;
    if (timeStr.length === 5) return timeStr + ':00';
    return timeStr;
}
