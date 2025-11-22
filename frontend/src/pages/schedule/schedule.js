/**
 * Schedule Page Logic
 * Управление графиком работы
 * @version 1.0.4
 */

import { getWorkingHours, updateWorkingHoursBulk } from '../../shared/lib/schedule-api.js?v=1.0.4';
import pageLoader from '../../shared/ui/loader/loader.js?v=1.0.3';
import { showNotification } from '../../shared/lib/telegram.js?v=1.0.3';

// Названия дней недели
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
let hasChanges = false;

/**
 * Инициализация страницы
 */
async function initSchedulePage() {
    try {
        await loadSchedule();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize schedule page:', error);
        showNotification('Ошибка инициализации страницы', 'error');
    } finally {
        pageLoader.hide();
    }
}

/**
 * Загрузка графика работы
 */
async function loadSchedule() {
    try {
        pageLoader.show();
        const response = await getWorkingHours();

        if (response && response.working_hours) {
            scheduleData = response.working_hours;

            // Если график пустой, создаем шаблон для всех дней
            if (scheduleData.length === 0) {
                scheduleData = createDefaultSchedule();
            }

            renderSchedule();
        } else {
            throw new Error('Неверный формат ответа API');
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        showError('Не удалось загрузить график работы');
    } finally {
        pageLoader.hide();
    }
}

/**
 * Создать шаблон графика по умолчанию
 */
function createDefaultSchedule() {
    const defaultSchedule = [];

    for (let day = 0; day < 7; day++) {
        defaultSchedule.push({
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            is_working_day: day < 5, // Пн-Пт рабочие дни
            break_start: null,
            break_end: null
        });
    }

    return defaultSchedule;
}

/**
 * Отрисовка графика
 */
function renderSchedule() {
    const container = document.getElementById('schedule-container');

    if (!container) return;

    // Сортируем по дням недели
    const sortedSchedule = [...scheduleData].sort((a, b) => a.day_of_week - b.day_of_week);

    container.innerHTML = `
        <div class="schedule-hint">
            <span class="schedule-hint-icon">💡</span>
            <div>
                Настройте график работы для каждого дня недели. 
                Вы можете указать рабочие часы и время перерыва.
            </div>
        </div>
        
        <div class="schedule-days">
            ${sortedSchedule.map(day => renderDayCard(day)).join('')}
        </div>
    `;

    // Добавляем обработчики событий для каждого дня
    attachDayEventListeners();
}

/**
 * Отрисовка карточки дня
 */
function renderDayCard(day) {
    const dayName = DAYS_OF_WEEK[day.day_of_week];
    const hasBreak = day.break_start && day.break_end;

    return `
        <div class="day-card ${!day.is_working_day ? 'disabled' : ''}" data-day="${day.day_of_week}">
            <div class="day-header">
                <span class="day-name">${dayName}</span>
                <label class="day-toggle">
                    <input type="checkbox" 
                           class="working-day-toggle" 
                           ${day.is_working_day ? 'checked' : ''}
                           data-day="${day.day_of_week}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="day-settings">
                <div class="time-row">
                    <div class="time-input-group">
                        <label>Начало работы</label>
                        <input type="time" 
                               class="start-time-input" 
                               value="${day.start_time || '09:00'}"
                               data-day="${day.day_of_week}"
                               ${!day.is_working_day ? 'disabled' : ''}>
                    </div>
                    <div class="time-input-group">
                        <label>Конец работы</label>
                        <input type="time" 
                               class="end-time-input" 
                               value="${day.end_time || '18:00'}"
                               data-day="${day.day_of_week}"
                               ${!day.is_working_day ? 'disabled' : ''}>
                    </div>
                </div>
                
                <div class="break-section">
                    <div class="break-toggle">
                        <input type="checkbox" 
                               class="break-enabled-toggle"
                               ${hasBreak ? 'checked' : ''}
                               data-day="${day.day_of_week}"
                               ${!day.is_working_day ? 'disabled' : ''}>
                        <label>Добавить перерыв</label>
                    </div>
                    
                    <div class="break-times" style="display: ${hasBreak ? 'grid' : 'none'}">
                        <div class="time-input-group">
                            <label>Начало перерыва</label>
                            <input type="time" 
                                   class="break-start-input" 
                                   value="${day.break_start || '13:00'}"
                                   data-day="${day.day_of_week}"
                                   ${!day.is_working_day || !hasBreak ? 'disabled' : ''}>
                        </div>
                        <div class="time-input-group">
                            <label>Конец перерыва</label>
                            <input type="time" 
                                   class="break-end-input" 
                                   value="${day.break_end || '14:00'}"
                                   data-day="${day.day_of_week}"
                                   ${!day.is_working_day || !hasBreak ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    const saveBtn = document.getElementById('save-schedule-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }
}

/**
 * Добавление обработчиков для элементов дней
 */
function attachDayEventListeners() {
    // Переключатели рабочего дня
    document.querySelectorAll('.working-day-toggle').forEach(toggle => {
        toggle.addEventListener('change', handleWorkingDayToggle);
    });

    // Время начала и конца работы
    document.querySelectorAll('.start-time-input, .end-time-input').forEach(input => {
        input.addEventListener('change', handleTimeChange);
    });

    // Переключатель перерыва
    document.querySelectorAll('.break-enabled-toggle').forEach(toggle => {
        toggle.addEventListener('change', handleBreakToggle);
    });

    // Время перерыва
    document.querySelectorAll('.break-start-input, .break-end-input').forEach(input => {
        input.addEventListener('change', handleBreakTimeChange);
    });
}

/**
 * Обработка переключения рабочего дня
 */
function handleWorkingDayToggle(e) {
    const dayIndex = parseInt(e.target.dataset.day);
    const isWorking = e.target.checked;

    // Обновляем данные
    const dayData = scheduleData.find(d => d.day_of_week === dayIndex);
    if (dayData) {
        dayData.is_working_day = isWorking;
    }

    // Обновляем UI
    const dayCard = document.querySelector(`.day-card[data-day="${dayIndex}"]`);
    if (dayCard) {
        if (isWorking) {
            dayCard.classList.remove('disabled');
        } else {
            dayCard.classList.add('disabled');
        }

        // Включаем/выключаем поля ввода
        dayCard.querySelectorAll('input[type="time"], input[type="checkbox"]').forEach(input => {
            if (!input.classList.contains('working-day-toggle')) {
                input.disabled = !isWorking;
            }
        });
    }

    markAsChanged();
}

/**
 * Обработка изменения времени работы
 */
function handleTimeChange(e) {
    const dayIndex = parseInt(e.target.dataset.day);
    const value = e.target.value;
    const isStartTime = e.target.classList.contains('start-time-input');

    const dayData = scheduleData.find(d => d.day_of_week === dayIndex);
    if (dayData) {
        if (isStartTime) {
            dayData.start_time = value;
        } else {
            dayData.end_time = value;
        }
    }

    markAsChanged();
}

/**
 * Обработка переключения перерыва
 */
function handleBreakToggle(e) {
    const dayIndex = parseInt(e.target.dataset.day);
    const enabled = e.target.checked;

    const dayCard = document.querySelector(`.day-card[data-day="${dayIndex}"]`);
    const breakTimes = dayCard.querySelector('.break-times');
    const breakInputs = breakTimes.querySelectorAll('input[type="time"]');

    if (enabled) {
        breakTimes.style.display = 'grid';
        breakInputs.forEach(input => input.disabled = false);

        // Устанавливаем значения по умолчанию
        const dayData = scheduleData.find(d => d.day_of_week === dayIndex);
        if (dayData) {
            dayData.break_start = breakInputs[0].value || '13:00';
            dayData.break_end = breakInputs[1].value || '14:00';
        }
    } else {
        breakTimes.style.display = 'none';
        breakInputs.forEach(input => input.disabled = true);

        // Удаляем время перерыва
        const dayData = scheduleData.find(d => d.day_of_week === dayIndex);
        if (dayData) {
            dayData.break_start = null;
            dayData.break_end = null;
        }
    }

    markAsChanged();
}

/**
 * Обработка изменения времени перерыва
 */
function handleBreakTimeChange(e) {
    const dayIndex = parseInt(e.target.dataset.day);
    const value = e.target.value;
    const isStartTime = e.target.classList.contains('break-start-input');

    const dayData = scheduleData.find(d => d.day_of_week === dayIndex);
    if (dayData) {
        if (isStartTime) {
            dayData.break_start = value;
        } else {
            dayData.break_end = value;
        }
    }

    markAsChanged();
}

/**
 * Отметить наличие изменений
 */
function markAsChanged() {
    hasChanges = true;
    const saveBtn = document.getElementById('save-schedule-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
    }
}

/**
 * Валидация графика
 */
function validateSchedule() {
    const errors = [];

    scheduleData.forEach(day => {
        if (!day.is_working_day) return;

        const dayName = DAYS_OF_WEEK[day.day_of_week];

        // Проверка времени работы
        if (!day.start_time || !day.end_time) {
            errors.push(`${dayName}: не указано время работы`);
            return;
        }

        const startTime = parseTime(day.start_time);
        const endTime = parseTime(day.end_time);

        if (startTime >= endTime) {
            errors.push(`${dayName}: время окончания должно быть позже времени начала`);
        }

        // Проверка перерыва
        if (day.break_start && day.break_end) {
            const breakStart = parseTime(day.break_start);
            const breakEnd = parseTime(day.break_end);

            if (breakStart >= breakEnd) {
                errors.push(`${dayName}: время окончания перерыва должно быть позже времени начала`);
            }

            if (breakStart < startTime || breakEnd > endTime) {
                errors.push(`${dayName}: перерыв должен быть в рабочее время`);
            }
        }
    });

    return errors;
}

/**
 * Парсинг времени в минуты
 */
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Сохранение графика
 */
async function handleSave() {
    // Валидация
    const errors = validateSchedule();
    if (errors.length > 0) {
        showNotification('Ошибка валидации:\n' + errors.join('\n'), 'error');
        return;
    }

    const saveBtn = document.getElementById('save-schedule-btn');

    try {
        saveBtn.classList.add('saving');
        saveBtn.textContent = 'Сохранение...';
        saveBtn.disabled = true;

        await updateWorkingHoursBulk(scheduleData);

        showNotification('График работы сохранен', 'success');
        hasChanges = false;

    } catch (error) {
        console.error('Error saving schedule:', error);
        showNotification(`Ошибка сохранения: ${error.message}`, 'error');
        saveBtn.disabled = false;
    } finally {
        saveBtn.classList.remove('saving');
        saveBtn.textContent = '💾 Сохранить';
    }
}

/**
 * Показать ошибку
 */
function showError(message) {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <p>❌ ${message}</p>
            <button id="retry-btn" class="retry-btn">Повторить</button>
        </div>
    `;

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadSchedule());
    }
}

// Предупреждение при уходе со страницы с несохраненными изменениями
window.addEventListener('beforeunload', (e) => {
    if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSchedulePage);
} else {
    initSchedulePage();
}
