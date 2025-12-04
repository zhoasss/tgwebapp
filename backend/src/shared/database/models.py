"""
Модели базы данных для системы управления записями
Слой Shared - общие компоненты
"""

from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Text, Float, Boolean, ForeignKey, Time, Enum, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class User(Base):
    """Модель пользователя (владельца бизнеса)"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    telegram_id = Column(BigInteger, nullable=True, index=True, unique=True)
    username = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    token = Column(String(255), nullable=True, unique=True)

    # Профиль пользователя
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    business_name = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)  # URL фото профиля
    
    # Публичная страница бронирования
    booking_slug = Column(String(100), nullable=True, unique=True, index=True)  # Уникальная ссылка

    # Настройки бизнеса
    timezone = Column(String(50), default='Europe/Moscow', nullable=False)
    currency = Column(String(10), default='RUB', nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    services = relationship("Service", back_populates="user", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="user", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="user", cascade="all, delete-orphan")
    working_hours = relationship("WorkingHours", back_populates="user", cascade="all, delete-orphan")
    working_days = relationship("WorkingDay", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, business={self.business_name})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        # Генерируем booking_url если есть booking_slug
        booking_url = None
        if self.booking_slug:
            booking_url = f"https://t.me/booking_cab_bot?start=booking_{self.booking_slug}"
        
        return {
            'id': self.id,
            'telegram_id': self.telegram_id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'business_name': self.business_name,
            'address': self.address,
            'avatar_url': self.avatar_url,
            'booking_slug': self.booking_slug,
            'booking_url': booking_url,  # Готовая ссылка для клиентов
            'timezone': self.timezone,
            'currency': self.currency,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Service(Base):
    """Модель услуги"""
    __tablename__ = 'services'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Основная информация
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)  # Продолжительность в минутах

    # Настройки
    is_active = Column(Boolean, default=True, nullable=False)
    color = Column(String(7), default='#4CAF50', nullable=False)  # Hex цвет для UI

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    user = relationship("User", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")

    def __repr__(self):
        return f"<Service(id={self.id}, name={self.name}, price={self.price})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'duration_minutes': self.duration_minutes,
            'is_active': self.is_active,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Client(Base):
    """Модель клиента"""
    __tablename__ = 'clients'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Контактная информация
    telegram_id = Column(BigInteger, nullable=True, index=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    # Дополнительная информация
    notes = Column(Text, nullable=True)

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    user = relationship("User", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client")

    def __repr__(self):
        return f"<Client(id={self.id}, name={self.first_name} {self.last_name})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'telegram_id': self.telegram_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'email': self.email,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class AppointmentStatus(enum.Enum):
    """Статус записи"""
    PENDING = "pending"      # Ожидает подтверждения
    CONFIRMED = "confirmed"  # Подтверждена
    CANCELLED = "cancelled"  # Отменена
    COMPLETED = "completed"  # Завершена


class Appointment(Base):
    """Модель записи/бронирования"""
    __tablename__ = 'appointments'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)

    # Время и дата
    appointment_date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)  # Может отличаться от услуги

    # Статус и информация
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING, nullable=False)
    notes = Column(Text, nullable=True)  # Заметки к записи
    client_notes = Column(Text, nullable=True)  # Заметки клиента

    # Цена (может отличаться от базовой цены услуги)
    price = Column(Float, nullable=True)

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    user = relationship("User", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")

    def __repr__(self):
        return f"<Appointment(id={self.id}, date={self.appointment_date}, status={self.status.value})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'service_id': self.service_id,
            'client_id': self.client_id,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'duration_minutes': self.duration_minutes,
            'status': self.status.value if self.status else None,
            'notes': self.notes,
            'client_notes': self.client_notes,
            'price': self.price,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Включаем связанные объекты
            'service': self.service.to_dict() if self.service else None,
            'client': self.client.to_dict() if self.client else None
        }


class WorkingHours(Base):
    """Модель рабочего графика"""
    __tablename__ = 'working_hours'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # День недели (0-6, где 0=понедельник, 6=воскресенье)
    day_of_week = Column(Integer, nullable=False)

    # Время работы
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Настройки на день
    is_working_day = Column(Boolean, default=True, nullable=False)
    break_start = Column(Time, nullable=True)  # Начало перерыва
    break_end = Column(Time, nullable=True)   # Конец перерыва

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    user = relationship("User", back_populates="working_hours")

    def __repr__(self):
        return f"<WorkingHours(day={self.day_of_week}, start={self.start_time}, end={self.end_time})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_working_day': self.is_working_day,
            'break_start': self.break_start.isoformat() if self.break_start else None,
            'break_end': self.break_end.isoformat() if self.break_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class WorkingDay(Base):
    """Модель рабочего дня (конкретная дата)"""
    __tablename__ = 'working_days'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    date = Column(Date, nullable=False, index=True)  # YYYY-MM-DD

    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    is_working_day = Column(Boolean, default=True, nullable=False)

    break_start = Column(Time, nullable=True)
    break_end = Column(Time, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Связи
    user = relationship("User", back_populates="working_days")

    def __repr__(self):
        return f"<WorkingDay(date={self.date}, is_working={self.is_working_day})>"

    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_working_day': self.is_working_day,
            'break_start': self.break_start.isoformat() if self.break_start else None,
            'break_end': self.break_end.isoformat() if self.break_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

