/**
 * Navigation utility with loader support
 * Shows loader before page transition
 */

/**
 * Navigate to a new page with loader
 * @param {string} url - Target URL
 * @param {number} delay - Delay before navigation (ms)
 */
export function navigateWithLoader(url, delay = 300) {
    // Show loader immediately
    const loaderHTML = `
    <div class="loader-container" id="navigation-loader" style="z-index: 10000;">
      <div class="loader"></div>
    </div>
  `;

    // Insert loader if it doesn't exist
    if (!document.getElementById('navigation-loader')) {
        document.body.insertAdjacentHTML('beforeend', loaderHTML);
    }

    // Navigate after delay
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
