/**
 * Schedule Page Logic (Calendar View + Multi-select)
 * @version 1.1.0
 */

import { getWorkingHours, updateWorkingHoursBulk } from '../../shared/lib/schedule-api.js?v=1.0.4';
import pageLoader from '../../shared/ui/loader/loader.js?v=1.0.7';
import { showNotification } from '../../shared/lib/telegram.js?v=1.0.3';

// Константы
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Состояние
let currentDate = new Date(); // Текущий отображаемый месяц
let selectedDates = new Set(); // Set<string> (YYYY-MM-DD)
let scheduleData = [];        // Данные графика (7 дней)

// Инициализация
document.addEventListener('DOMContentLoaded', initSchedulePage);

async function initSchedulePage() {
    try {
        pageLoader.show();

        // 1. Загрузка данных
        const response = await getWorkingHours();
        scheduleData = initializeScheduleData(response.working_hours || []);

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
 * Инициализация данных графика (заполнение пропусков)
 */
function initializeScheduleData(loadedData) {
    const fullSchedule = [];
    for (let i = 0; i < 7; i++) {
        const existingDay = loadedData.find(d => d.day_of_week === i);
        if (existingDay) {
            fullSchedule.push({ ...existingDay });
        } else {
            fullSchedule.push({
                day_of_week: i,
                is_working_day: false, // По умолчанию нерабочие
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
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопка "Назад" в Telegram
    if (window.Telegram?.WebApp?.BackButton) {
        window.Telegram.WebApp.BackButton.show();
        window.Telegram.WebApp.BackButton.onClick(() => {
            window.history.back();
        });
    }

    // Навигация по месяцам
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    // FAB
    document.getElementById('configure-btn').addEventListener('click', openBottomSheet);

    // Закрытие Bottom Sheet
    document.getElementById('close-sheet-btn').addEventListener('click', closeBottomSheet);
    document.getElementById('bottom-sheet-overlay').addEventListener('click', closeBottomSheet);

    // Сохранение
    document.getElementById('save-day-btn').addEventListener('click', handleSaveDays);

    // Тогглы в Bottom Sheet
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

    // Обновляем заголовок
    document.getElementById('current-month-label').textContent = `${MONTH_NAMES[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Первый день месяца
    const firstDayOfMonth = new Date(year, month, 1);
    // Количество дней в месяце
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // День недели первого дня (0-Sun, 1-Mon). Нам нужно 0-Mon, 6-Sun
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    // Пустые ячейки до начала месяца
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        grid.appendChild(emptyCell);
    }

    // Дни месяца
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const dateStr = formatDateKey(cellDate);
        const dayOfWeek = (cellDate.getDay() + 6) % 7; // 0-Mon ... 6-Sun
        const dayConfig = scheduleData[dayOfWeek];

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;
        cell.dataset.date = dateStr;

        // Проверка на сегодня
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        // Индикатор рабочего дня
        if (dayConfig && dayConfig.is_working_day) {
            const indicator = document.createElement('div');
            indicator.className = 'work-indicator';
            cell.appendChild(indicator);
        }

        // Состояние выбора
        if (selectedDates.has(dateStr)) {
            cell.classList.add('selected');
        }

        // Обработчик клика
        cell.addEventListener('click', () => toggleDateSelection(dateStr, cell));

        grid.appendChild(cell);
    }
}

/**
 * Переключение выбора даты
 */
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

/**
 * Обновление видимости FAB
 */
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

/**
 * Открытие Bottom Sheet для выбранных дней
 */
function openBottomSheet() {
    if (selectedDates.size === 0) return;

    // Заполняем заголовок
    document.getElementById('sheet-day-title').textContent = 'Настройка графика';
    document.getElementById('sheet-date-subtitle').textContent = `Выбрано дней: ${selectedDates.size}`;

    // Сброс формы к дефолтным значениям (или значениям первого выбранного дня)
    // Для простоты берем дефолтные значения, так как это массовая настройка
    const isWorking = document.getElementById('is-working-day');
    isWorking.checked = true; // По умолчанию предлагаем сделать рабочими
    isWorking.dispatchEvent(new Event('change'));

    document.getElementById('start-time').value = '09:00';
    document.getElementById('end-time').value = '18:00';

    const hasBreak = document.getElementById('has-break');
    hasBreak.checked = false;
    hasBreak.dispatchEvent(new Event('change'));

    document.getElementById('break-start').value = '13:00';
    document.getElementById('break-end').value = '14:00';

    // Показываем Sheet
    document.getElementById('bottom-sheet-overlay').classList.add('active');
    document.getElementById('day-settings-sheet').classList.add('active');
}

/**
 * Закрытие Bottom Sheet
 */
function closeBottomSheet() {
    document.getElementById('bottom-sheet-overlay').classList.remove('active');
    document.getElementById('day-settings-sheet').classList.remove('active');
}

/**
 * Сохранение настроек для выбранных дней
 */
async function handleSaveDays() {
    if (selectedDates.size === 0) return;

    const btn = document.getElementById('save-day-btn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    try {
        // Собираем уникальные дни недели из выбранных дат
        const uniqueDaysOfWeek = new Set();
        selectedDates.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayOfWeek = (date.getDay() + 6) % 7;
            uniqueDaysOfWeek.add(dayOfWeek);
        });

        // Собираем данные из формы
        const isWorking = document.getElementById('is-working-day').checked;
        const hasBreak = document.getElementById('has-break').checked;

        const startTime = formatTimeFull(document.getElementById('start-time').value);
        const endTime = formatTimeFull(document.getElementById('end-time').value);
        const breakStart = hasBreak ? formatTimeFull(document.getElementById('break-start').value) : null;
        const breakEnd = hasBreak ? formatTimeFull(document.getElementById('break-end').value) : null;

        // Валидация
        if (isWorking) {
            if (startTime >= endTime) {
                throw new Error('Начало работы должно быть раньше конца');
            }
            if (hasBreak && breakStart >= breakEnd) {
                throw new Error('Начало перерыва должно быть раньше конца');
            }
        }

        // Обновляем локальный стейт для всех уникальных дней недели
        uniqueDaysOfWeek.forEach(dayIndex => {
            scheduleData[dayIndex] = {
                ...scheduleData[dayIndex],
                is_working_day: isWorking,
                start_time: startTime,
                end_time: endTime,
                break_start: breakStart,
                break_end: breakEnd
            };
        });

        // Отладка: считаем рабочие дни
        const workingDaysCount = scheduleData.filter(d => d.is_working_day).length;
        const workingDaysIndices = scheduleData
            .filter(d => d.is_working_day)
            .map(d => DAYS_OF_WEEK_FULL[d.day_of_week])
            .join(', ');

        // alert(`Сохранение...\nВсего дней: 7\nРабочих: ${workingDaysCount}\n(${workingDaysIndices})`);

        // Отправляем на сервер
        await updateWorkingHoursBulk(scheduleData);

        // Сбрасываем выбор
        selectedDates.clear();
        updateFabVisibility();
        closeBottomSheet();

        // Обновляем календарь
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

/**
 * Утилиты
 */
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
