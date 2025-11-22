/**
 * API Client Wrapper
 * Centralizes API requests, auth headers, and loader management.
 * @version 1.0.3
 */

import { API_BASE_URL } from '../config/api.js?v=1.0.3';
import pageLoader from '../ui/loader/loader.js?v=1.0.3';

class ApiClient {
    /**
     * Make an API request
     * @param {string} endpoint - API endpoint (e.g., '/api/users')
     * @param {object} options - Fetch options
     * @param {boolean} useLoader - Whether to show global loader (default: true)
     */
    async request(endpoint, options = {}, useLoader = true) {
        if (useLoader) {
            pageLoader.show();
        }

        try {
            // Debug logging
            console.log('🔍 API Request:', { endpoint, type: typeof endpoint, options });

            // Validate endpoint parameter
            if (!endpoint || typeof endpoint !== 'string') {
                const errorMsg = `Invalid endpoint: ${JSON.stringify(endpoint)}. Expected a non-empty string.`;
                console.error('❌', errorMsg);
                throw new Error(errorMsg);
            }

            const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

            // Add auth header
            const token = localStorage.getItem('access_token');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const config = {
                ...options,
                headers
            };

            const response = await fetch(url, config);

            // Handle 401 (Unauthorized) - try to refresh token
            if (response.status === 401 && !options._retry) {
                console.warn('⚠️ Unauthorized request (401), trying to refresh token...');

                try {
                    const { default: jwtAuthManager } = await import('./jwt-auth.js');
                    const refreshSuccess = await jwtAuthManager.refreshTokens();

                    if (refreshSuccess) {
                        console.log('✅ Token refreshed, retrying request...');
                        // Retry request with new token (recursive call)
                        // We pass useLoader=false to avoid double counting/flickering,
                        // as the outer loader is still active
                        return this.request(endpoint, { ...options, _retry: true }, false);
                    } else {
                        console.warn('❌ Token refresh failed');
                    }
                } catch (refreshError) {
                    console.error('❌ Error refreshing token:', refreshError);
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || errorMessage;
                } catch (e) {
                    // Not JSON
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();

            // Check for server-side token refresh
            if (responseData.token_refreshed && responseData.new_access_token) {
                console.log('🔄 Server refreshed tokens');
                localStorage.setItem('access_token', responseData.new_access_token);
                if (responseData.new_refresh_token) {
                    localStorage.setItem('refresh_token', responseData.new_refresh_token);
                }
            }

            return responseData;
        } catch (error) {
            console.error('❌ API Request failed:', error);
            throw error;
        } finally {
            if (useLoader) {
                pageLoader.hide();
            }
        }
    }

    async get(endpoint, options = {}, useLoader = true) {
        return this.request(endpoint, { ...options, method: 'GET' }, useLoader);
    }

    async post(endpoint, data, options = {}, useLoader = true) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        }, useLoader);
    }

    async put(endpoint, data, options = {}, useLoader = true) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        }, useLoader);
    }

    async delete(endpoint, options = {}, useLoader = true) {
        return this.request(endpoint, { ...options, method: 'DELETE' }, useLoader);
    }
}

export const apiClient = new ApiClient();
export default apiClient;
