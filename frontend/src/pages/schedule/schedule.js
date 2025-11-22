/**
 * Schedule Page Logic
 * Управление графиком работы (Date Picker UI)
 * @version 1.0.5
 */

import { getWorkingHours, updateWorkingHoursBulk } from '../../shared/lib/schedule-api.js?v=1.0.4';
import pageLoader from '../../shared/ui/loader/loader.js?v=1.0.3';
import { showNotification } from '../../shared/lib/telegram.js?v=1.0.3';

// Названия дней недели (0 = Понедельник, 6 = Воскресенье)
const DAYS_OF_WEEK = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье'
];

// Состояние
let scheduleData = [];
let currentDayIndex = 0; // 0-6 (Mon-Sun)

// Инициализация
document.addEventListener('DOMContentLoaded', initSchedulePage);

async function initSchedulePage() {
    try {
        pageLoader.show();

        // 1. Загрузка данных
        const response = await getWorkingHours();

        // Инициализируем массив из 7 дней, если данных нет или они неполные
        scheduleData = initializeScheduleData(response.working_hours || []);

        // 2. Настройка Date Picker
        const datePicker = document.getElementById('date-picker');
        const today = new Date();
        datePicker.valueAsDate = today;

        // Определяем текущий день недели
        updateSelectedDay(today);

        // 3. Обработчики событий
        datePicker.addEventListener('change', handleDateChange);
        document.getElementById('save-schedule-btn').addEventListener('click', handleSave);

        // 4. Рендер редактора
        renderDayEditor();

        pageLoader.hide();
    } catch (error) {
        console.error('Failed to init schedule page:', error);
        showNotification('Ошибка загрузки графика', 'error');
        pageLoader.hide();
    }
}

/**
 * Создает полный массив из 7 дней, заполняя пропуски дефолтными значениями
 */
function initializeScheduleData(loadedData) {
    const fullSchedule = [];

    for (let i = 0; i < 7; i++) {
        const existingDay = loadedData.find(d => d.day_of_week === i);
        if (existingDay) {
            fullSchedule.push({ ...existingDay });
        } else {
            // Дефолтные настройки для нового дня
            fullSchedule.push({
                day_of_week: i,
                is_working_day: true,
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
 * Обработка изменения даты
 */
function handleDateChange(event) {
    const date = new Date(event.target.value);
    if (isNaN(date.getTime())) return; // Invalid date

    updateSelectedDay(date);
    renderDayEditor();
}

/**
 * Обновляет текущий индекс дня недели на основе даты
 */
function updateSelectedDay(date) {
    // JS: 0=Sun, 1=Mon...
    // DB: 0=Mon, 6=Sun
    const jsDay = date.getDay();
    currentDayIndex = (jsDay + 6) % 7;

    const dayName = DAYS_OF_WEEK[currentDayIndex];
    document.getElementById('selected-day-info').textContent = dayName;
}

/**
 * Рендерит форму редактора для текущего дня
 */
function renderDayEditor() {
    const container = document.getElementById('day-editor-container');
    const dayData = scheduleData[currentDayIndex];

    container.innerHTML = `
        <div class="day-editor-card">
            <div class="day-header">
                <span class="day-title">${DAYS_OF_WEEK[currentDayIndex]}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="is-working-day" ${dayData.is_working_day ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="time-settings ${!dayData.is_working_day ? 'disabled' : ''}" id="time-settings">
                <div class="time-group">
                    <span class="time-label">Рабочее время</span>
                    <div class="time-inputs-row">
                        <input type="time" class="time-input" id="start-time" value="${formatTime(dayData.start_time)}">
                        <span class="time-separator">—</span>
                        <input type="time" class="time-input" id="end-time" value="${formatTime(dayData.end_time)}">
                    </div>
                </div>

                <div class="break-section">
                    <div class="break-header">
                        <span class="break-title">Перерыв</span>
                        <label class="toggle-switch" style="transform: scale(0.8);">
                            <input type="checkbox" id="has-break" ${dayData.break_start ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="time-group ${!dayData.break_start ? 'disabled' : ''}" id="break-inputs">
                        <div class="time-inputs-row">
                            <input type="time" class="time-input" id="break-start" value="${formatTime(dayData.break_start) || '13:00'}">
                            <span class="time-separator">—</span>
                            <input type="time" class="time-input" id="break-end" value="${formatTime(dayData.break_end) || '14:00'}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Привязываем обработчики к новым элементам
    attachEditorListeners();

    // Активируем кнопку сохранения
    document.getElementById('save-schedule-btn').disabled = false;
}

/**
 * Привязывает обработчики событий к элементам формы
 */
function attachEditorListeners() {
    const isWorkingDayParams = document.getElementById('is-working-day');
    const hasBreakParams = document.getElementById('has-break');

    // Toggle Working Day
    isWorkingDayParams.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const timeSettings = document.getElementById('time-settings');

        if (isChecked) {
            timeSettings.classList.remove('disabled');
        } else {
            timeSettings.classList.add('disabled');
        }

        updateDayData('is_working_day', isChecked);
    });

    // Toggle Break
    hasBreakParams.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const breakInputs = document.getElementById('break-inputs');

        if (isChecked) {
            breakInputs.classList.remove('disabled');
            // Устанавливаем дефолтное время перерыва, если его нет
            if (!scheduleData[currentDayIndex].break_start) {
                updateDayData('break_start', '13:00:00');
                updateDayData('break_end', '14:00:00');
                document.getElementById('break-start').value = '13:00';
                document.getElementById('break-end').value = '14:00';
            }
        } else {
            breakInputs.classList.add('disabled');
            updateDayData('break_start', null);
            updateDayData('break_end', null);
        }
    });

    // Time Inputs
    ['start-time', 'end-time', 'break-start', 'break-end'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', (e) => {
                const field = id.replace('-', '_'); // start-time -> start_time
                updateDayData(field, e.target.value);
            });
        }
    });
}

/**
 * Обновляет данные в массиве scheduleData
 */
function updateDayData(field, value) {
    // Если это время, добавляем секунды если их нет
    if (typeof value === 'string' && value.match(/^\d{2}:\d{2}$/)) {
        value = value + ':00';
    }

    scheduleData[currentDayIndex][field] = value;
}

/**
 * Сохранение графика
 */
async function handleSave() {
    const btn = document.getElementById('save-schedule-btn');

    try {
        btn.disabled = true;
        btn.textContent = '⏳ Сохранение...';

        // Валидация перед отправкой
        if (!validateSchedule(scheduleData)) {
            btn.disabled = false;
            btn.textContent = '💾 Сохранить график';
            return;
        }

        await updateWorkingHoursBulk(scheduleData);

        showNotification('График успешно сохранен', 'success');
        btn.textContent = '✅ Сохранено';

        setTimeout(() => {
            btn.textContent = '💾 Сохранить график';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Save failed:', error);
        showNotification('Ошибка сохранения', 'error');
        btn.textContent = '💾 Сохранить график';
        btn.disabled = false;
    }
}

/**
 * Валидация данных
 */
function validateSchedule(data) {
    for (const day of data) {
        if (day.is_working_day) {
            if (day.start_time >= day.end_time) {
                showNotification(`Ошибка в ${DAYS_OF_WEEK[day.day_of_week]}: начало работы должно быть раньше конца`, 'error');
                return false;
            }

            if (day.break_start && day.break_end) {
                if (day.break_start >= day.break_end) {
                    showNotification(`Ошибка в ${DAYS_OF_WEEK[day.day_of_week]}: начало перерыва должно быть раньше конца`, 'error');
                    return false;
                }
                // Проверка вхождения перерыва в рабочее время (упрощенно)
                if (day.break_start < day.start_time || day.break_end > day.end_time) {
                    showNotification(`Ошибка в ${DAYS_OF_WEEK[day.day_of_week]}: перерыв должен быть в рабочее время`, 'error');
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Форматирование времени (HH:MM:SS -> HH:MM)
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
}
