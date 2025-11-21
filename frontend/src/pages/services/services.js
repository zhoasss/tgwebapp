/**
 * Services Page Logic
 */

import { getServices, createService, updateService, deleteService } from '../../shared/lib/services-api.js';
import pageLoader from '../../shared/ui/loader/loader.js';
import { showNotification } from '../../shared/lib/telegram.js';

// DOM Elements
const servicesList = document.getElementById('services-list');
const addServiceBtn = document.getElementById('add-service-btn');
const serviceModal = document.getElementById('service-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const serviceForm = document.getElementById('service-form');
const modalTitle = document.getElementById('modal-title');
const deleteServiceBtn = document.getElementById('delete-service-btn');

// State
let services = [];
let currentServiceId = null;

/**
 * Initialize the page
 */
async function initServicesPage() {
    try {
        setupEventListeners();
        await loadServices();
    } catch (error) {
        console.error('Failed to initialize services page:', error);
        showNotification('Ошибка инициализации страницы', 'error');
    } finally {
        // Hide loader after initialization (clears navigation loader)
        pageLoader.hide();
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Open modal for new service
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => openModal());
    }

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal on outside click
    if (serviceModal) {
        serviceModal.addEventListener('click', (e) => {
            if (e.target === serviceModal) closeModal();
        });
    }

    // Form submission
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleFormSubmit);
    }

    // Delete service
    if (deleteServiceBtn) {
        deleteServiceBtn.addEventListener('click', handleDelete);
    }
}

/**
 * Load and display services
 */
async function loadServices() {
    try {
        const data = await getServices();
        services = data.services || [];
        renderServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
        if (servicesList) {
            servicesList.innerHTML = `
            <div class="no-services">
                <div class="no-services-icon">⚠️</div>
                <p>Не удалось загрузить услуги</p>
                <button class="btn primary" onclick="window.location.reload()" style="margin-top: 16px;">Повторить</button>
            </div>
            `;
        }
        showNotification('Не удалось загрузить услуги', 'error');
    }
}

/**
 * Render services list
 */
function renderServices(items) {
    if (!servicesList) return;

    if (!items.length) {
        servicesList.innerHTML = `
      <div class="no-services">
        <div class="no-services-icon">✂️</div>
        <p>У вас пока нет услуг</p>
        <p style="font-size: 14px; margin-top: 8px;">Нажмите +, чтобы добавить первую услугу</p>
      </div>
    `;
        return;
    }

    servicesList.innerHTML = items.map(service => `
    <div class="service-card" data-id="${service.id}">
      <div class="service-color-indicator" style="background-color: ${service.color || '#4CAF50'}">
        ✂️
      </div>
      <div class="service-info">
        <div class="service-name">${service.name}</div>
        <div class="service-meta">
          <span class="service-price">${service.price} ₽</span>
          <span>•</span>
          <span>${service.duration_minutes} мин</span>
        </div>
      </div>
      <div class="service-arrow">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `).join('');

    // Add click listeners to cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const service = services.find(s => s.id === id);
            if (service) openModal(service);
        });
    });
}

/**
 * Open modal for create or edit
 */
function openModal(service = null) {
    currentServiceId = service ? service.id : null;

    if (service) {
        // Edit mode
        modalTitle.textContent = 'Редактирование услуги';
        document.getElementById('service-id').value = service.id;
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-description').value = service.description || '';
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-duration').value = service.duration_minutes;

        // Set color
        const colorInput = document.querySelector(`input[name="service-color"][value="${service.color}"]`);
        if (colorInput) colorInput.checked = true;

        deleteServiceBtn.classList.remove('hidden');
    } else {
        // Create mode
        modalTitle.textContent = 'Новая услуга';
        serviceForm.reset();
        document.getElementById('service-id').value = '';
        // Default color
        document.querySelector('input[name="service-color"][value="#4CAF50"]').checked = true;

        deleteServiceBtn.classList.add('hidden');
    }

    serviceModal.classList.remove('hidden');

    // Animate content
    requestAnimationFrame(() => {
        serviceModal.querySelector('.modal-content').style.transform = 'translateY(0)';
    });
}

/**
 * Close modal
 */
function closeModal() {
    const content = serviceModal.querySelector('.modal-content');
    content.style.transform = 'translateY(100%)';

    setTimeout(() => {
        serviceModal.classList.add('hidden');
        currentServiceId = null;
        serviceForm.reset();
    }, 300);
}

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
