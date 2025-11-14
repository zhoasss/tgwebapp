/**
 * Инициализация Telegram Web App
 * Слой App - отвечает за глобальную настройку приложения
 */

(function initTelegramWebApp() {
  if (!window.Telegram?.WebApp) {
    console.warn('⚠️ Telegram WebApp SDK не загружен');
    return;
  }

  const tg = window.Telegram.WebApp;

  // Сообщаем Telegram, что Mini App готово к отображению
  tg.ready();

  // Разворачиваем приложение на весь экран
  tg.expand();

  // Отключаем вертикальные свайпы (доступно с версии 7.7)
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
  }

  // Включаем возможность закрытия приложения через свайп (опционально)
  if (typeof tg.enableClosingConfirmation === 'function') {
    tg.enableClosingConfirmation();
  }

  // Устанавливаем цвет заголовка
  if (typeof tg.setHeaderColor === 'function') {
    tg.setHeaderColor('bg_color'); // Используем цвет фона из темы
  }

  // Устанавливаем цвет фона
  if (typeof tg.setBackgroundColor === 'function') {
    tg.setBackgroundColor('bg_color'); // Используем цвет фона из темы
  }

  console.log('✅ Telegram WebApp инициализирован');
  console.log('📱 Версия:', tg.version);
  console.log('🎨 Тема:', tg.colorScheme);
  console.log('👤 Пользователь:', tg.initDataUnsafe?.user);
})();

