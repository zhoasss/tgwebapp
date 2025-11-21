/**
 * Loader utility for managing page loading states
 * Implements a request counter pattern to ensure loader stays visible
 * until all concurrent operations are completed.
 */

class PageLoader {
    constructor() {
        this.loaderElement = null;
        this.startTime = null;
        this.minDisplayTime = 500; // Reduced to 500ms for snappier feel, but enough to prevent flicker
        this.requestCount = 0;
        this.hideTimeout = null;
        this.init();
    }

    init() {
        // Create loader HTML structure (hidden by default)
        const loaderHTML = `
      <div class="loader-container hidden" id="page-loader">
        <div class="loader"></div>
      </div>
    `;

        // Insert loader at the beginning of body
        if (document.body) {
            this._insertLoader(loaderHTML);
        } else {
            // If body is not ready, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                this._insertLoader(loaderHTML);
            });
        }
    }

    _insertLoader(html) {
        // Check if loader already exists
        if (document.getElementById('page-loader')) {
            this.loaderElement = document.getElementById('page-loader');
            return;
        }

        document.body.insertAdjacentHTML('afterbegin', html);
        this.loaderElement = document.getElementById('page-loader');
        this.detectTheme();
    }

    detectTheme() {
        // Detect system theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        console.log(`🎨 Loader theme: ${theme}`);

        // Listen for theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            console.log(`🎨 Theme changed to: ${newTheme}`);
        });
    }

    /**
     * Show loader and increment request counter
     */
    show() {
        this.requestCount++;

        if (this.loaderElement && this.loaderElement.classList.contains('hidden')) {
            this.loaderElement.classList.remove('hidden');
            this.startTime = Date.now();

            // Clear any pending hide timeout
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }
    }

    /**
     * Decrement request counter and hide if zero
     */
    hide() {
        if (this.requestCount > 0) {
            this.requestCount--;
        }

        if (this.requestCount === 0) {
            this._scheduleHide();
        }
    }

    /**
     * Force hide regardless of counter (use with caution)
     */
    forceHide() {
        this.requestCount = 0;
        this._scheduleHide();
    }

    _scheduleHide() {
        if (!this.loaderElement || !this.startTime) {
            return;
        }

        const elapsed = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.minDisplayTime - elapsed);

        // Clear existing timeout if any
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            if (this.loaderElement && this.requestCount === 0) {
                this.loaderElement.classList.add('hidden');
                this.startTime = null;
            }
        }, remainingTime);
    }
}

// Create global instance
const pageLoader = new PageLoader();

// Check if we're coming from navigation
const isNavigating = sessionStorage.getItem('isNavigating') === 'true';
sessionStorage.removeItem('isNavigating');

if (!isNavigating) {
    // Initial page load - show loader immediately
    // We increment counter to 1, expecting the page logic to call hide() when data is ready
    // or we can rely on a timeout fallback if no data fetching happens
    pageLoader.show();

    // Fallback: if nothing calls hide() within 3 seconds, force hide
    // This prevents infinite loader if page has no JS logic
    setTimeout(() => {
        if (pageLoader.requestCount > 0) {
            console.warn('⚠️ Loader force hidden due to timeout (no data fetch detected)');
            pageLoader.forceHide();
        }
    }, 3000);
} else {
    // If navigating, the previous page should have set the loader visible
    // We just ensure it's visible and set the counter
    pageLoader.show();
}

// Export for use in modules
export default pageLoader;
