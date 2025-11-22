/**
 * Schedule Page Logic (Calendar View)
 * @version 1.0.8
 */

import { getWorkingHours, updateWorkingHoursBulk } from '../../shared/lib/schedule-api.js?v=1.0.4';
import pageLoader from '../../shared/ui/loader/loader.js?v=1.0.3';
import { showNotification } from '../../shared/lib/telegram.js?v=1.0.3';

// Константы
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAYS_OF_WEEK_FULL = [
    'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
];

// Состояние
let currentDate = new Date(); // Текущий отображаемый месяц
let selectedDate = null;      // Выбранная дата
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
                is_working_day: false, // По умолчанию дни нерабочие
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

    // Закрытие Bottom Sheet
    document.getElementById('close-sheet-btn').addEventListener('click', closeBottomSheet);
    document.getElementById('bottom-sheet-overlay').addEventListener('click', closeBottomSheet);

    // Сохранение
    document.getElementById('save-day-btn').addEventListener('click', handleSaveDay);

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
        const dayOfWeek = (cellDate.getDay() + 6) % 7; // 0-Mon ... 6-Sun
        const dayConfig = scheduleData[dayOfWeek];

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;

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

        // Обработчик клика
        cell.addEventListener('click', () => openBottomSheet(cellDate));

        grid.appendChild(cell);
    }
}

/**
 * Открытие Bottom Sheet для выбранной даты
 */
function openBottomSheet(date) {
    selectedDate = date;
    const dayOfWeek = (date.getDay() + 6) % 7; // 0-Mon ... 6-Sun
    const dayConfig = scheduleData[dayOfWeek];

    // Заполняем заголовок
    document.getElementById('sheet-day-title').textContent = DAYS_OF_WEEK_FULL[dayOfWeek];
    document.getElementById('sheet-date-subtitle').textContent = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });

    // Заполняем форму данными
    const isWorking = document.getElementById('is-working-day');
    isWorking.checked = dayConfig.is_working_day;

    // Триггерим событие change для обновления UI
    isWorking.dispatchEvent(new Event('change'));

    document.getElementById('start-time').value = formatTime(dayConfig.start_time);
    document.getElementById('end-time').value = formatTime(dayConfig.end_time);

    const hasBreak = document.getElementById('has-break');
    hasBreak.checked = !!dayConfig.break_start;
    hasBreak.dispatchEvent(new Event('change'));

    if (dayConfig.break_start) {
        document.getElementById('break-start').value = formatTime(dayConfig.break_start);
        document.getElementById('break-end').value = formatTime(dayConfig.break_end);
    } else {
        // Дефолтные значения
        document.getElementById('break-start').value = '13:00';
        document.getElementById('break-end').value = '14:00';
    }

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
    selectedDate = null;
}

/**
 * Сохранение настроек дня
 */
async function handleSaveDay() {
    if (!selectedDate) return;

    const btn = document.getElementById('save-day-btn');
    btn.textContent = 'Сохранение...';
    btn.disabled = true;

    try {
        const dayOfWeek = (selectedDate.getDay() + 6) % 7;

        // Собираем данные из формы
        const isWorking = document.getElementById('is-working-day').checked;
        const hasBreak = document.getElementById('has-break').checked;

        const newData = {
            ...scheduleData[dayOfWeek],
            is_working_day: isWorking,
            start_time: formatTimeFull(document.getElementById('start-time').value),
            end_time: formatTimeFull(document.getElementById('end-time').value),
            break_start: hasBreak ? formatTimeFull(document.getElementById('break-start').value) : null,
            break_end: hasBreak ? formatTimeFull(document.getElementById('break-end').value) : null
        };

        // Валидация
        if (isWorking) {
            if (newData.start_time >= newData.end_time) {
                throw new Error('Начало работы должно быть раньше конца');
            }
            if (hasBreak && newData.break_start >= newData.break_end) {
                throw new Error('Начало перерыва должно быть раньше конца');
            }
        }

        // Обновляем локальный стейт
        scheduleData[dayOfWeek] = newData;

        // Отправляем на сервер (весь массив)
        await updateWorkingHoursBulk(scheduleData);

        // Обновляем календарь (чтобы обновились индикаторы)
        renderCalendar(currentDate);

        closeBottomSheet();
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
 * Утилиты форматирования времени
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
}

function formatTimeFull(timeStr) {
    if (!timeStr) return null;
    if (timeStr.length === 5) return timeStr + ':00';
    return timeStr;
}
