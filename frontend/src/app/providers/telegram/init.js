/**
 * Инициализация Telegram Web App
 * Слой App - отвечает за глобальную настройку приложения
 */

(function initTelegramWebApp() {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;

    // Гарантируем, что ready() вызван один раз
    if (!tg.isReady) {
      tg.ready();
      tg.isReady = true;
    }

    // Настройка отображения
    tg.expand();
    tg.enableClosingConfirmation();

    console.log('✅ Telegram WebApp инициализирован');
  } else {
    console.warn('⚠️ Telegram WebApp SDK не загружен');
  }
})();

