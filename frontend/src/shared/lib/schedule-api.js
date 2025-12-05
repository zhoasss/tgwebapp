/**
 * API клиент для работы с графиком работы
 * Слой Shared - переиспользуемый код
 * @version 1.0.4
 */

import apiClient from './api-client.js?v=3.1.0';
import { API_ENDPOINTS } from '../config/api.js?v=3.1.0';

/**
 * Получить график работы пользователя
 * @returns {Promise<Object>} График работы по дням недели
 */
export async function getWorkingHours() {
    try {
        const response = await apiClient.get('/api/schedule');
        return response;
    } catch (error) {
        console.error('❌ Ошибка получения графика работы:', error);
        throw error;
    }
}

/**
 * Массово обновить график работы
 * @param {Array} workingHours - Массив объектов с графиком работы
 * @returns {Promise<Object>} Обновленный график работы
 */
export async function updateWorkingHoursBulk(workingHours) {
    try {
        const response = await apiClient.put('/api/schedule', {
            working_hours: workingHours
        });
        return response;
    } catch (error) {
        console.error('❌ Ошибка обновления графика работы:', error);
        throw error;
    }
}

/**
 * Массовое обновление конкретных рабочих дней
 * @param {Array} workingDays - Массив объектов дней
 */
export async function updateWorkingDaysBulk(workingDays) {
    try {
        const response = await apiClient.put('/api/schedule/days', {
            working_days: workingDays
        });
        return response;
    } catch (error) {
        console.error('Failed to update working days:', error);
        throw error;
    }
}

/**
 * Проверка доступности времени
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {number} duration - Длительность в минутах
 */
export async function checkAvailability(date, duration) {
    try {
        const response = await apiClient.get('/api/schedule/availability', {
            params: { date, duration }
        });
        return response;
    } catch (error) {
        console.error('Failed to check availability:', error);
        throw error;
    }
}

/**
 * Получить доступные временные слоты на указанную дату
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {Promise<Object>} Доступные временные слоты
 */
export async function getAvailability(date) {
    try {
        const response = await apiClient.get(`/api/schedule/availability?date=${date}`);
        return response;
    } catch (error) {
        console.error('❌ Ошибка получения доступных слотов:', error);
        throw error;
    }
}
