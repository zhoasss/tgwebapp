/**
 * Логика страницы настроек
 * Слой Pages - страницы приложения
 */

import pageLoader from '../../shared/ui/loader/loader.js';
import { apiClient } from '../../shared/lib/api-client.js';
import { showNotification } from '../../shared/lib/telegram.js';

// Маршруты для настроек
const SETTINGS_ROUTES = {
  'Профиль': '../profile/index.html',
  'График работы': '../schedule/index.html',
  'Услуги': '../services/index.html',
  'Управление': '../management/index.html',
};

// Элементы карточки ссылки
let linkLoading, linkContent, linkEmpty, linkInput;

function initSettingsPage() {
  // Инициализация элементов карточки
  linkLoading = document.getElementById('link-loading');
  linkContent = document.getElementById('link-content');
  linkEmpty = document.getElementById('link-empty');
  linkInput = document.getElementById('booking-link-input');

  // Загружаем данные ссылки
  loadBookingLink();

  // Обработчики кнопок карточки
  document.getElementById('copy-link-btn')?.addEventListener('click', () => {
    copyBookingLink(linkInput.value);
  });



  document.getElementById('generate-link-btn')?.addEventListener('click', generateBookingLink);

  // Обработчики остальных пунктов меню
  const settingsItems = document.querySelectorAll('.settings-item');

  settingsItems.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.querySelector('h3').textContent.trim();
      // Убираем эмодзи для поиска в маршрутах
      const cleanTitle = title.replace(/^[^\w\s]+\s*/, '');

      console.log(`Клик на настройку: ${cleanTitle}`);

      // Проверяем, есть ли маршрут для этой настройки
      const route = SETTINGS_ROUTES[cleanTitle];

      // Переход на страницу настройки
      if (route) {
        // Use navigateWithLoader if available, otherwise fallback to direct navigation
        if (window.navigateWithLoader) {
          window.navigateWithLoader(route);
        } else {
          window.location.href = route;
        }
      }
    });
  });

  console.log('✅ Страница настроек инициализирована');

  // Скрываем глобальный лоадер страницы
  console.log('⚙️ Force hiding loader on settings page');
  pageLoader.forceHide();
}

/**
 * Загрузка информации о ссылке бронирования
 */
async function loadBookingLink() {
  console.log('🔗 loadBookingLink: Начало загрузки');
  try {
    showLinkLoading(true);
    console.log('🔗 loadBookingLink: Лоадер показан');

    // Получаем текущий профиль
    console.log('🔗 loadBookingLink: Запрос профиля...');
    const profile = await apiClient.get('/api/profiles/');
    console.log('🔗 loadBookingLink: Профиль получен:', profile);

    if (profile.booking_slug) {
      console.log('🔗 loadBookingLink: booking_slug найден:', profile.booking_slug);
      // Используем booking_url из API (всегда booking_cab_bot)
      if (profile.booking_url) {
        console.log('🔗 loadBookingLink: booking_url найден:', profile.booking_url);
        showLinkContent(profile.booking_url);
        console.log('🔗 loadBookingLink: Ссылка отображена');
      } else {
        console.log('🔗 loadBookingLink: booking_url отсутствует, показываем кнопку генерации');
        // Если booking_url отсутствует, показываем кнопку генерации
        showLinkEmpty();
      }
    } else {
      console.log('🔗 loadBookingLink: booking_slug отсутствует, показываем кнопку генерации');
      showLinkEmpty();
    }

  } catch (error) {
    console.error('❌ Error loading booking link:', error);
    showNotification('Не удалось загрузить ссылку', 'error');
    // Показываем кнопку создания как fallback
    showLinkEmpty();
  } finally {
    showLinkLoading(false);
    console.log('🔗 loadBookingLink: Завершено');
  }
}

/**
 * Генерация новой ссылки
 */
async function generateBookingLink() {
  try {
    showLinkLoading(true);

    const response = await apiClient.post('/api/profiles/generate-booking-link');
    const bookingUrl = response.booking_url;

    showLinkContent(bookingUrl);
    showNotification('Ссылка успешно создана', 'success');

  } catch (error) {
    console.error('❌ Error generating booking link:', error);
    showNotification('Ошибка при создании ссылки', 'error');
    showLinkEmpty();
  } finally {
    showLinkLoading(false);
  }
}

// --- UI Helpers ---

function showLinkLoading(isLoading) {
  console.log('🔄 showLinkLoading:', isLoading);
  if (isLoading) {
    linkLoading.style.display = 'flex';
    linkContent.style.display = 'none';
    linkEmpty.style.display = 'none';
  } else {
    linkLoading.style.display = 'none';
  }
}

function showLinkContent(url) {
  console.log('✅ showLinkContent:', url);
  linkLoading.style.display = 'none';
  linkInput.value = url;
  linkContent.style.display = 'block';
  linkEmpty.style.display = 'none';
}

function showLinkEmpty() {
  console.log('🆕 showLinkEmpty');
  linkLoading.style.display = 'none';
  linkContent.style.display = 'none';
  linkEmpty.style.display = 'block';
}

// --- Actions ---

/**
 * Поделиться ссылкой через Web Share API
 */
async function shareBookingLink(bookingUrl) {
  if (!bookingUrl) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Запись онлайн',
        text: 'Записаться ко мне онлайн',
        url: bookingUrl
      });
      console.log('✅ Link shared successfully');
    } else {
      // Fallback - копируем в буфер обмена
      await copyBookingLink(bookingUrl);
      showNotification('Ссылка скопирована (шеринг не поддерживается)', 'success');
    }
  } catch (error) {
    // Пользователь отменил или ошибка
    if (error.name !== 'AbortError') {
      console.error('Share error:', error);
    }
  }
}

/**
 * Копировать ссылку в буфер обмена
 */
async function copyBookingLink(bookingUrl) {
  if (!bookingUrl) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(bookingUrl);
      console.log('✅ Link copied to clipboard');
      showNotification('Ссылка скопирована', 'success');
    } else {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = bookingUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        console.log('✅ Link copied using execCommand');
        showNotification('Ссылка скопирована', 'success');
      } catch (err) {
        console.error('Failed to copy:', err);
        showNotification('Не удалось скопировать ссылку', 'error');
      }

      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Copy error:', error);
    showNotification('Ошибка копирования', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}
