/**
 * Loader utility for managing page loading states
 */

class PageLoader {
    constructor() {
        this.loaderElement = null;
        this.startTime = null;
        this.minDisplayTime = 1500; // Minimum 1.5 seconds
        this.maxDisplayTime = 2000; // Maximum 2 seconds
        this.init();
    }

    init() {
        // Check if we're coming from navigation (loader might already be visible)
        const isNavigating = sessionStorage.getItem('isNavigating') === 'true';
        sessionStorage.removeItem('isNavigating');

        // Create loader HTML structure
        const loaderHTML = `
      <div class="loader-container${isNavigating ? '' : ''}" id="page-loader">
        <div class="loader"></div>
      </div>
    `;

        // Insert loader at the beginning of body
        if (document.body) {
            document.body.insertAdjacentHTML('afterbegin', loaderHTML);
            this.loaderElement = document.getElementById('page-loader');
            this.startTime = Date.now();
            this.detectTheme();
        } else {
            // If body is not ready, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                document.body.insertAdjacentHTML('afterbegin', loaderHTML);
                this.loaderElement = document.getElementById('page-loader');
                this.startTime = Date.now();
                this.detectTheme();
            });
        }
    }

    detectTheme() {
        // Detect system theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';

        // Log theme for debugging
        console.log(`🎨 Loader theme: ${theme}`);

        // Listen for theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            console.log(`🎨 Theme changed to: ${newTheme}`);
        });
    }

    show() {
        if (this.loaderElement) {
            this.loaderElement.classList.remove('hidden');
            this.startTime = Date.now();
        }
    }

    hide() {
        if (!this.loaderElement || !this.startTime) {
            return;
        }

        const elapsed = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.minDisplayTime - elapsed);

        // Ensure loader is shown for at least minDisplayTime
        setTimeout(() => {
            if (this.loaderElement) {
                this.loaderElement.classList.add('hidden');
            }
        }, remainingTime);
    }

    // Hide loader after a delay (useful for minimum loading time)
    hideAfter(delay = 300) {
        if (!this.loaderElement || !this.startTime) {
            return;
        }

        const elapsed = Date.now() - this.startTime;
        const totalDelay = Math.max(this.minDisplayTime - elapsed, delay);

        setTimeout(() => {
            this.hide();
        }, totalDelay);
    }
}

// Create global instance
const pageLoader = new PageLoader();

// Auto-hide loader when page is fully loaded
// Use random time between 1.5-2 seconds for natural feel
window.addEventListener('load', () => {
    const randomDelay = Math.floor(Math.random() * 500) + 1500; // 1500-2000ms
    pageLoader.hideAfter(randomDelay);
});

// Export for use in modules
export default pageLoader;
