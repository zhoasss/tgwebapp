/**
 * Services Page Logic
 */

import { getServices, createService, updateService, deleteService } from '../../shared/lib/services-api.js';
import pageLoader from '../../shared/ui/loader/loader.js';
import { showNotification } from '../../shared/lib/telegram.js';

// ... (rest of imports)

// ... (rest of code)

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('service-name').value,
        description: document.getElementById('service-description').value,
        price: parseFloat(document.getElementById('service-price').value),
        duration_minutes: parseInt(document.getElementById('service-duration').value),
        color: document.querySelector('input[name="service-color"]:checked').value
    };

    try {
        if (currentServiceId) {
            await updateService(currentServiceId, formData);
            showNotification('Услуга обновлена', 'success');
        } else {
            await createService(formData);
            showNotification('Услуга создана', 'success');
        }

        closeModal();
        await loadServices();

    } catch (error) {
        console.error('Error saving service:', error);
        showNotification(`Ошибка: ${error.message}`, 'error');
    }
}

/**
 * Handle service deletion
 */
async function handleDelete() {
    if (!currentServiceId) return;

    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

    try {
        await deleteService(currentServiceId);
        showNotification('Услуга удалена', 'success');
        closeModal();
        await loadServices();
    } catch (error) {
        console.error('Error deleting service:', error);
        showNotification(`Ошибка при удалении: ${error.message}`, 'error');
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServicesPage);
} else {
    initServicesPage();
}
