/**
 * API Client for Profile and Business Logic
 * Uses the centralized ApiClient for requests.
 */

import apiClient from './api-client.js';
import { API_ENDPOINTS } from '../config/api.js';

/**
 * Get user profile
 */
export async function getProfile() {
  return await apiClient.get(API_ENDPOINTS.PROFILE);
}

/**
 * Update user profile
 */
export async function updateProfile(data) {
  return await apiClient.put(API_ENDPOINTS.PROFILE, data);
}

/**
 * Get user appointments
 */
export async function getAppointments(status = null, dateFrom = null, dateTo = null, limit = 50, offset = 0) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (limit !== 50) params.append('limit', limit.toString());
  if (offset !== 0) params.append('offset', offset.toString());

  const queryString = params.toString();
  const endpoint = `${API_ENDPOINTS.APPOINTMENTS}${queryString ? '?' + queryString : ''}`;

  return await apiClient.get(endpoint);
}

/**
 * Create new appointment
 */
export async function createAppointment(appointmentData) {
  return await apiClient.post(API_ENDPOINTS.APPOINTMENTS, appointmentData);
}

/**
 * Update appointment
 */
export async function updateAppointment(appointmentId, appointmentData) {
  return await apiClient.put(`${API_ENDPOINTS.APPOINTMENTS}${appointmentId}`, appointmentData);
}

/**
 * Delete appointment
 */
export async function deleteAppointment(appointmentId) {
  return await apiClient.delete(`${API_ENDPOINTS.APPOINTMENTS}${appointmentId}`);
}

/**
 * Test API connection
 */
export async function testApiConnection() {
  return await apiClient.get(API_ENDPOINTS.TEST);
}

/**
 * Debug API connection
 */
export async function debugApiConnection() {
  return await apiClient.get(API_ENDPOINTS.DEBUG);
}
