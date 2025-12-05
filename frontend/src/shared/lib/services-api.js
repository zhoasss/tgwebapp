/**
 * API client for Services
 * Uses the centralized ApiClient for requests.
 */

import apiClient from './api-client.js?v=3.0.1';
import { API_ENDPOINTS } from '../config/api.js?v=3.0.1';

/**
 * Get all services
 */
export async function getServices() {
    console.log('🔍 services-api: getServices called. API_ENDPOINTS:', API_ENDPOINTS);

    const endpoints = API_ENDPOINTS || {};
    const serviceEndpoint = endpoints.SERVICES;

    if (!serviceEndpoint) {
        console.error('❌ CRITICAL: API_ENDPOINTS.SERVICES is undefined!', API_ENDPOINTS);
        throw new Error('Internal Error: Service endpoint not defined');
    }

    return await apiClient.get(serviceEndpoint);
}

/**
 * Get a specific service by ID
 */
export async function getService(serviceId) {
    return await apiClient.get(`${API_ENDPOINTS.SERVICES}${serviceId}`);
}

/**
 * Create a new service
 * @param {Object} serviceData - { name, description, price, duration_minutes, color }
 */
export async function createService(serviceData) {
    return await apiClient.post(API_ENDPOINTS.SERVICES, serviceData);
}

/**
 * Update an existing service
 * @param {number} serviceId
 * @param {Object} serviceData - { name, description, price, duration_minutes, color, is_active }
 */
export async function updateService(serviceId, serviceData) {
    return await apiClient.put(`${API_ENDPOINTS.SERVICES}${serviceId}`, serviceData);
}

/**
 * Delete a service
 * @param {number} serviceId
 */
export async function deleteService(serviceId) {
    return await apiClient.delete(`${API_ENDPOINTS.SERVICES}${serviceId}`);
}
