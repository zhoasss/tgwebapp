"""
Модели базы данных
Слой Shared - общие компоненты
"""

from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    """Модель пользователя"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    telegram_id = Column(BigInteger, nullable=True, index=True, unique=True)  # Теперь опционально
    username = Column(String(255), nullable=False, unique=True, index=True)  # Теперь обязательно и уникально
    password_hash = Column(String(255), nullable=True)  # Для обычной аутентификации
    token = Column(String(255), nullable=True, unique=True)  # JWT токен или сессионный токен

    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    business_name = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<User(telegram_id={self.telegram_id}, username={self.username})>"
    
    def to_dict(self):
        """Преобразование модели в словарь"""
        return {
            'id': self.id,
            'telegram_id': self.telegram_id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'business_name': self.business_name,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

