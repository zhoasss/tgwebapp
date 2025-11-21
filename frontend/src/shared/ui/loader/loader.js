/**
 * Loader utility for managing page loading states
 */

class PageLoader {
    constructor() {
        this.loaderElement = null;
        this.init();
    }

    init() {
        // Create loader HTML structure
        const loaderHTML = `
      <div class="loader-container" id="page-loader">
        <div class="loader"></div>
      </div>
    `;

        // Insert loader at the beginning of body
        if (document.body) {
            document.body.insertAdjacentHTML('afterbegin', loaderHTML);
            this.loaderElement = document.getElementById('page-loader');
        } else {
            // If body is not ready, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                document.body.insertAdjacentHTML('afterbegin', loaderHTML);
                this.loaderElement = document.getElementById('page-loader');
            });
        }
    }

    show() {
        if (this.loaderElement) {
            this.loaderElement.classList.remove('hidden');
        }
    }

    hide() {
        if (this.loaderElement) {
            this.loaderElement.classList.add('hidden');
        }
    }

    // Hide loader after a delay (useful for minimum loading time)
    hideAfter(delay = 300) {
        setTimeout(() => {
            this.hide();
        }, delay);
    }
}

// Create global instance
const pageLoader = new PageLoader();

// Auto-hide loader when page is fully loaded
window.addEventListener('load', () => {
    pageLoader.hideAfter(300);
});

// Export for use in modules
export default pageLoader;
