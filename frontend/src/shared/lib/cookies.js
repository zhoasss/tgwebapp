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
    // Определяем SameSite в зависимости от протокола и контекста
    // Для Telegram WebApps (https iframe) используем SameSite=None; Secure
    // Для локальной разработки используем SameSite=Lax
    const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const sameSite = window.location.protocol === 'https:' ? 'SameSite=None; Secure' : 'SameSite=Lax';
    
    const cookieString = name + "=" + (value || "") + expires + "; path=/" + (sameSite ? "; " + sameSite : "");
    console.log(`🍪 setCookie: ${name}`);
    console.log(`   - protocol: ${window.location.protocol}`);
    console.log(`   - sameSite: ${sameSite}`);
    console.log(`   - value: ${value ? value.substring(0, 30) + '...' : 'empty'}`);
    console.log(`   - cookie string: ${cookieString}`);
    document.cookie = cookieString;
    
    // Проверяем, что cookie установлена
    const checkCookie = getCookie(name);
    console.log(`   - verification: ${checkCookie ? '✅ установлена' : '❌ НЕ установлена'}`);
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
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            console.log(`🔍 getCookie: ${name} = ${value ? value.substring(0, 30) + '...' : 'empty'}`);
            return value;
        }
    }
    console.log(`🔍 getCookie: ${name} = NOT FOUND (available: ${document.cookie})`);
    return null;
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
}
