"""
Telegram уведомления для мастеров
Отправка сообщений о новых записях и напоминаниях
"""

import logging
from datetime import datetime
from typing import Optional
from telegram import Bot
from telegram.error import TelegramError

from ..config.env_loader import config


class TelegramNotifier:
    """Класс для отправки Telegram уведомлений"""
    
    def __init__(self, bot_token: Optional[str] = None):
        """
        Инициализация Telegram бота
        
        Args:
            bot_token: Токен бота (если не указан, берется из конфига)
        """
        self.bot_token = bot_token or config.bot_token
        self.bot = Bot(token=self.bot_token)
        self.logger = logging.getLogger(__name__)
    
    async def send_new_appointment_notification(
        self,
        telegram_id: int,
        appointment_data: dict
    ) -> bool:
        """
        Отправить уведомление о новой записи
        
        Args:
            telegram_id: Telegram ID мастера
            appointment_data: Данные о записи
            
        Returns:
            bool: True если отправлено успешно
        """
        try:
            # Форматируем дату
            appointment_date = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
            formatted_date = appointment_date.strftime('%d.%m.%Y')
            formatted_time = appointment_date.strftime('%H:%M')
            
            # Формируем сообщение
            message = (
                f"🔔 <b>Новая запись!</b>\n\n"
                f"👤 <b>Клиент:</b> {appointment_data['client_name']}\n"
                f"📞 <b>Телефон:</b> {appointment_data.get('client_phone', 'Не указан')}\n"
                f"✂️ <b>Услуга:</b> {appointment_data['service_name']}\n"
                f"📅 <b>Дата:</b> {formatted_date}\n"
                f"⏰ <b>Время:</b> {formatted_time}\n"
                f"⏱️ <b>Длительность:</b> {appointment_data['duration_minutes']} мин\n"
                f"💰 <b>Цена:</b> {appointment_data['price']} ₽\n"
            )
            
            # Добавляем email если есть
            if appointment_data.get('client_email'):
                message += f"📧 <b>Email:</b> {appointment_data['client_email']}\n"
            
            # Добавляем комментарий если есть
            if appointment_data.get('notes'):
                message += f"\n💬 <b>Комментарий:</b>\n{appointment_data['notes']}\n"
            
            message += (
                f"\n📊 <b>Статус:</b> Ожидает подтверждения\n"
                f"\n💡 Откройте приложение для подтверждения записи"
            )
            
            # Отправляем сообщение
            await self.bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='HTML'
            )
            
            self.logger.info(
                f"✅ Notification sent to user {telegram_id} "
                f"for appointment {appointment_data.get('id', 'N/A')}"
            )
            return True
            
        except TelegramError as e:
            self.logger.error(
                f"❌ Failed to send notification to user {telegram_id}: {e}"
            )
            return False
        except Exception as e:
            self.logger.error(
                f"❌ Unexpected error sending notification: {e}"
            )
            return False
    
    async def send_appointment_reminder(
        self,
        telegram_id: int,
        appointment_data: dict,
        hours_before: int = 24
    ) -> bool:
        """
        Отправить напоминание о записи
        
        Args:
            telegram_id: Telegram ID мастера
            appointment_data: Данные о записи
            hours_before: За сколько часов напомнить
            
        Returns:
            bool: True если отправлено успешно
        """
        try:
            # Форматируем дату
            appointment_date = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
            formatted_date = appointment_date.strftime('%d.%m.%Y')
            formatted_time = appointment_date.strftime('%H:%M')
            
            # Формируем сообщение
            message = (
                f"⏰ <b>Напоминание о записи</b>\n\n"
                f"Через {hours_before} часов у вас запись:\n\n"
                f"👤 <b>Клиент:</b> {appointment_data['client_name']}\n"
                f"📞 <b>Телефон:</b> {appointment_data.get('client_phone', 'Не указан')}\n"
                f"✂️ <b>Услуга:</b> {appointment_data['service_name']}\n"
                f"📅 <b>Дата:</b> {formatted_date}\n"
                f"⏰ <b>Время:</b> {formatted_time}\n"
                f"⏱️ <b>Длительность:</b> {appointment_data['duration_minutes']} мин\n"
                f"💰 <b>Цена:</b> {appointment_data['price']} ₽\n"
            )
            
            if appointment_data.get('notes'):
                message += f"\n💬 <b>Комментарий:</b>\n{appointment_data['notes']}\n"
            
            # Отправляем сообщение
            await self.bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='HTML'
            )
            
            self.logger.info(
                f"✅ Reminder sent to user {telegram_id} "
                f"for appointment {appointment_data.get('id', 'N/A')}"
            )
            return True
            
        except TelegramError as e:
            self.logger.error(
                f"❌ Failed to send reminder to user {telegram_id}: {e}"
            )
            return False
        except Exception as e:
            self.logger.error(
                f"❌ Unexpected error sending reminder: {e}"
            )
            return False
    
    async def send_appointment_status_update(
        self,
        telegram_id: int,
        appointment_data: dict,
        new_status: str
    ) -> bool:
        """
        Отправить уведомление об изменении статуса записи
        
        Args:
            telegram_id: Telegram ID клиента (если есть)
            appointment_data: Данные о записи
            new_status: Новый статус
            
        Returns:
            bool: True если отправлено успешно
        """
        try:
            status_emoji = {
                'confirmed': '✅',
                'cancelled': '❌',
                'completed': '✔️',
                'pending': '⏳'
            }
            
            status_text = {
                'confirmed': 'подтверждена',
                'cancelled': 'отменена',
                'completed': 'завершена',
                'pending': 'ожидает подтверждения'
            }
            
            emoji = status_emoji.get(new_status, '📝')
            status = status_text.get(new_status, new_status)
            
            # Форматируем дату
            appointment_date = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
            formatted_date = appointment_date.strftime('%d.%m.%Y')
            formatted_time = appointment_date.strftime('%H:%M')
            
            message = (
                f"{emoji} <b>Запись {status}</b>\n\n"
                f"✂️ <b>Услуга:</b> {appointment_data['service_name']}\n"
                f"📅 <b>Дата:</b> {formatted_date}\n"
                f"⏰ <b>Время:</b> {formatted_time}\n"
            )
            
            # Отправляем сообщение
            await self.bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='HTML'
            )
            
            self.logger.info(
                f"✅ Status update sent to user {telegram_id} "
                f"for appointment {appointment_data.get('id', 'N/A')}"
            )
            return True
            
        except TelegramError as e:
            self.logger.error(
                f"❌ Failed to send status update to user {telegram_id}: {e}"
            )
            return False
        except Exception as e:
            self.logger.error(
                f"❌ Unexpected error sending status update: {e}"
            )
            return False
    
    async def test_connection(self, telegram_id: int) -> bool:
        """
        Проверить подключение к Telegram
        
        Args:
            telegram_id: Telegram ID для тестового сообщения
            
        Returns:
            bool: True если подключение работает
        """
        try:
            await self.bot.send_message(
                chat_id=telegram_id,
                text="✅ Уведомления настроены и работают!"
            )
            return True
        except TelegramError as e:
            self.logger.error(f"❌ Connection test failed: {e}")
            return False
