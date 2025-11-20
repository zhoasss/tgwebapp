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

  // Обработка видимости клавиатуры для мобильных устройств
  // Скрываем футер при фокусе на полях ввода, чтобы освободить место
  const handleFocus = (e) => {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (isInput) {
      document.body.classList.add('keyboard-visible');
    }
  };

  const handleBlur = (e) => {
    // Небольшая задержка, чтобы проверить, не перешел ли фокус на другой инпут
    setTimeout(() => {
      if (!document.activeElement ||
        (document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA')) {
        document.body.classList.remove('keyboard-visible');
      }
    }, 100);
  };

  document.addEventListener('focusin', handleFocus);
  document.addEventListener('focusout', handleBlur);

  // Инициализируем JWT аутентификацию (асинхронно, не блокирует приложение)
  import('./../../../shared/lib/jwt-auth.js').then(({ default: jwtAuthManager }) => {
    jwtAuthManager.init().then(success => {
      if (success) {
        console.log('🔐 JWT аутентификация инициализирована успешно');
      } else {
        console.warn('⚠️ JWT аутентификация не инициализирована, приложение работает в базовом режиме');
      }
    }).catch(error => {
      console.error('❌ Ошибка инициализации JWT:', error.message);
      console.log('ℹ️ Приложение продолжит работать в автономном режиме');
    });
  }).catch(importError => {
    console.error('❌ Ошибка импорта JWT модуля:', importError.message);
    console.log('ℹ️ Приложение будет работать без JWT аутентификации');
  });

})();

