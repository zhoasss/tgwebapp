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

function initSettingsPage() {
  const settingsItems = document.querySelectorAll('.settings-item');

  settingsItems.forEach(item => {
    item.addEventListener('click', async () => {
      const title = item.querySelector('h3').textContent.trim();
      // Убираем эмодзи для поиска в маршрутах
      const cleanTitle = title.replace(/^[^\w\s]+\s*/, '');

      console.log(`Клик на настройку: ${cleanTitle}`);

      // Специальная обработка для "Ссылка для записи"
      if (cleanTitle === 'Ссылка для записи') {
        await handleBookingLink();
        return;
      }

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

  // Скрываем лоадер, так как страница загружена
  // Используем forceHide, чтобы гарантированно скрыть лоадер, даже если счетчик сбился
  console.log('⚙️ Force hiding loader on settings page');
  pageLoader.forceHide();
}

/**
 * Обработка клика на "Ссылка для записи"
 */
async function handleBookingLink() {
  try {
    pageLoader.show();

    // Получаем текущий профиль
    const profile = await apiClient.get('/api/profiles/');

    let bookingUrl;

    // Если ссылка уже есть, используем её
    if (profile.booking_slug) {
      bookingUrl = `https://booking-cab.ru/booking/${profile.booking_slug}`;
      console.log('✅ Existing booking link:', bookingUrl);
    } else {
      // Генерируем новую ссылку
      console.log('🔗 Generating new booking link...');
      const response = await apiClient.post('/api/profiles/generate-booking-link');
      bookingUrl = response.booking_url;
      console.log('✅ New booking link generated:', bookingUrl);
    }

    pageLoader.hide();

    // Показываем диалог с ссылкой
    await showBookingLinkDialog(bookingUrl);

  } catch (error) {
    console.error('❌ Error handling booking link:', error);
    pageLoader.hide();
    showNotification('Ошибка при создании ссылки', 'error');
  }
}

/**
 * Показать диалог с ссылкой для бронирования
 */
async function showBookingLinkDialog(bookingUrl) {
  // Проверяем поддержку Web Share API
  const canShare = navigator.share !== undefined;

  const message = `Ваша ссылка для записи:\n\n${bookingUrl}\n\nКлиенты смогут записаться к вам онлайн по этой ссылке.`;

  // Используем Telegram WebApp для показа диалога
  if (window.Telegram?.WebApp) {
    const buttons = canShare
      ? [
        { text: '📤 Поделиться', action: () => shareBookingLink(bookingUrl) },
        { text: '📋 Копировать', action: () => copyBookingLink(bookingUrl) }
      ]
      : [
        { text: '📋 Копировать', action: () => copyBookingLink(bookingUrl) }
      ];

    // Показываем popup с кнопками
    if (canShare) {
      window.Telegram.WebApp.showPopup({
        title: '🔗 Ссылка для записи',
        message: message,
        buttons: [
          { id: 'share', type: 'default', text: '📤 Поделиться' },
          { id: 'copy', type: 'default', text: '📋 Копировать' },
          { id: 'close', type: 'cancel', text: 'Закрыть' }
        ]
      }, async (buttonId) => {
        if (buttonId === 'share') {
          await shareBookingLink(bookingUrl);
        } else if (buttonId === 'copy') {
          await copyBookingLink(bookingUrl);
        }
      });
    } else {
      window.Telegram.WebApp.showPopup({
        title: '🔗 Ссылка для записи',
        message: message,
        buttons: [
          { id: 'copy', type: 'default', text: '📋 Копировать' },
          { id: 'close', type: 'cancel', text: 'Закрыть' }
        ]
      }, async (buttonId) => {
        if (buttonId === 'copy') {
          await copyBookingLink(bookingUrl);
        }
      });
    }
  } else {
    // Fallback для обычного браузера
    if (canShare) {
      const shouldShare = confirm(message + '\n\nПоделиться ссылкой?');
      if (shouldShare) {
        await shareBookingLink(bookingUrl);
      } else {
        await copyBookingLink(bookingUrl);
      }
    } else {
      alert(message);
      await copyBookingLink(bookingUrl);
    }
  }
}

/**
 * Поделиться ссылкой через Web Share API
 */
async function shareBookingLink(bookingUrl) {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Запись онлайн',
        text: 'Записаться ко мне онлайн',
        url: bookingUrl
      });
      console.log('✅ Link shared successfully');
      showNotification('Ссылка отправлена', 'success');
    } else {
      // Fallback - копируем в буфер обмена
      await copyBookingLink(bookingUrl);
    }
  } catch (error) {
    // Пользователь отменил или ошибка
    if (error.name !== 'AbortError') {
      console.error('Share error:', error);
      await copyBookingLink(bookingUrl);
    }
  }
}

/**
 * Копировать ссылку в буфер обмена
 */
async function copyBookingLink(bookingUrl) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(bookingUrl);
      console.log('✅ Link copied to clipboard');
      showNotification('Ссылка скопирована в буфер обмена', 'success');
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
