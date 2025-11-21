/**
 * Navigation utility with loader support
 * Shows loader before page transition
 */

/**
 * Navigate to a new page with loader
 * @param {string} url - Target URL
 * @param {number} delay - Delay before navigation (ms)
 */
export function navigateWithLoader(url, delay = 100) {
    // Try to use existing page loader if available
    const existingLoader = document.getElementById('page-loader');

    if (existingLoader) {
        // Show existing loader
        existingLoader.classList.remove('hidden');
    } else {
        // Fallback: create temporary loader if page-loader doesn't exist yet
        const loaderHTML = `
        <div class="loader-container" id="navigation-loader">
          <div class="loader"></div>
        </div>
      `;

        if (!document.getElementById('navigation-loader')) {
            document.body.insertAdjacentHTML('beforeend', loaderHTML);
        }
    }

    // Mark that we're navigating (so next page knows loader is already visible)
    sessionStorage.setItem('isNavigating', 'true');

    // Navigate after short delay
    setTimeout(() => {
        window.location.href = url;
    }, delay);
}

/**
 * Setup navigation for footer buttons
 */
export function setupFooterNavigation() {
    const footerButtons = document.querySelectorAll('.footer-btn[data-href]');

    footerButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const url = button.getAttribute('data-href');
            if (url) {
                navigateWithLoader(url);
            }
        });
    });
}

// Make navigateWithLoader globally available
window.navigateWithLoader = navigateWithLoader;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFooterNavigation);
} else {
    // DOM is already ready
    setupFooterNavigation();
}
