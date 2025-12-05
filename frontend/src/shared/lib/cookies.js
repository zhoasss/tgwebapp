/**
 * Utilities for cookie management
 * Used to replace localStorage for auth tokens
 */

/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default 30)
 */
export function setCookie(name, value, days = 30) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // Using SameSite=Lax by default, or None; Secure if needed for iframes
    // For Telegram WebApps, strictly speaking, they are in an iframe.
    // If the backend is on the same domain (booking-cab.ru) as the frontend, Lax is fine.
    // But if we are in an iframe, Safari/iOS might need None; Secure.
    // We will use SameSite=None; Secure which is the most compatible for WebApps.
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=None; Secure";
}

/**
 * Get a cookie by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
}
