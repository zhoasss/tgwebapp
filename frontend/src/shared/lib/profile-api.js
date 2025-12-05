import apiClient from './api-client.js?v=3.0.4';
import { API_ENDPOINTS } from '../config/api.js?v=3.0.4';

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
  console.log('🔍 profile-api: getAppointments called. API_ENDPOINTS:', API_ENDPOINTS);

  const endpoints = API_ENDPOINTS || {};
  const appointmentsEndpoint = endpoints.APPOINTMENTS;

  if (!appointmentsEndpoint) {
    console.error('❌ CRITICAL: API_ENDPOINTS.APPOINTMENTS is undefined!', API_ENDPOINTS);
    throw new Error('Internal Error: Appointments endpoint not defined');
  }

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (limit !== 50) params.append('limit', limit.toString());
  if (offset !== 0) params.append('offset', offset.toString());

  const queryString = params.toString();
  const endpoint = `${appointmentsEndpoint}${queryString ? '?' + queryString : ''}`;

  return await apiClient.get(endpoint);
}

/**
 * Create new appointment
 */
function getAppointmentsEndpoint() {
  if (!API_ENDPOINTS?.APPOINTMENTS) {
    throw new Error('API_ENDPOINTS.APPOINTMENTS is undefined');
  }
  return API_ENDPOINTS.APPOINTMENTS;
}

/**
 * Create new appointment
 */
export async function createAppointment(appointmentData) {
  return await apiClient.post(getAppointmentsEndpoint(), appointmentData);
}

/**
 * Update appointment
 */
export async function updateAppointment(appointmentId, appointmentData) {
  return await apiClient.put(`${getAppointmentsEndpoint()}${appointmentId}`, appointmentData);
}

/**
 * Delete appointment
 */
export async function deleteAppointment(appointmentId) {
  return await apiClient.delete(`${getAppointmentsEndpoint()}${appointmentId}`);
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
