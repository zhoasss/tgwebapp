"""
JWT аутентификация для системы управления записями
Слой Shared - общие компоненты
"""

import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import User
from ..database.connection import get_session
from ..config.env_loader import get_jwt_settings

# Схема безопасности для Bearer токенов
security = HTTPBearer(auto_error=False)

class JWTAuth:
    """Класс для работы с JWT токенами"""

    def __init__(self):
        self.settings = get_jwt_settings()

    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Создает access токен"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.settings["access_token_expire_minutes"])
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.settings["secret_key"], algorithm=self.settings["algorithm"])
        return encoded_jwt

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Создает refresh токен (срок жизни 30 дней)"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=30)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.settings["secret_key"], algorithm=self.settings["algorithm"])
        return encoded_jwt

    def decode_token(self, token: str) -> Dict[str, Any]:
        """Декодирует и валидирует токен"""
        try:
            payload = jwt.decode(token, self.settings["secret_key"], algorithms=[self.settings["algorithm"]])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Токен истек")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Неверный токен")

    def verify_token_type(self, payload: Dict[str, Any], expected_type: str) -> bool:
        """Проверяет тип токена"""
        return payload.get("type") == expected_type

# Глобальный экземпляр JWT аутентификации
jwt_auth = JWTAuth()

async def get_current_user(
    access_token: Optional[str] = Cookie(None, alias="access_token"),
    refresh_token: Optional[str] = Cookie(None, alias="refresh_token"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """
    Dependency для получения текущего пользователя из JWT токена

    Поддерживает два способа передачи токена:
    1. HTTP-only cookies (рекомендуемый способ)
    2. Authorization header (для отладки)
    """
    # Логирование для отладки
    logging.info(f"🔍 get_current_user: access_token from cookie: {access_token[:20] if access_token else 'None'}...")
    logging.info(f"🔍 get_current_user: refresh_token from cookie: {refresh_token[:20] if refresh_token else 'None'}...")
    logging.info(f"🔍 get_current_user: credentials from header: {credentials.credentials[:20] if credentials and credentials.credentials else 'None'}...")
    
    token = None

    # Сначала пытаемся получить токен из cookies
    if access_token:
        token = access_token
        token_source = "cookies"
        logging.info("✅ Токен получен из cookies")
    # Если токен в cookies отсутствует, пробуем Authorization header
    elif credentials:
        token = credentials.credentials
        token_source = "header"
        logging.info("✅ Токен получен из Authorization header")

    if not token:
        logging.error("❌ Токен отсутствует и в cookies, и в header")
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации")

    try:
        # Декодируем токен
        payload = jwt_auth.decode_token(token)

        # Проверяем тип токена
        if not jwt_auth.verify_token_type(payload, "access"):
            raise HTTPException(status_code=401, detail="Неверный тип токена")

        # Извлекаем ID пользователя
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Неверный токен: отсутствует user_id")

        # Получаем пользователя из БД
        result = await session.execute(
            User.__table__.select().where(User.id == int(user_id))
        )
        user = result.first()

        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")

        user_dict = dict(user)
        user_dict["token_source"] = token_source

        return user_dict

    except jwt.ExpiredSignatureError:
        # Если access токен истек, пробуем обновить его с помощью refresh токена
        if refresh_token:
            try:
                # Валидируем refresh токен
                refresh_payload = jwt_auth.decode_token(refresh_token)

                if not jwt_auth.verify_token_type(refresh_payload, "refresh"):
                    raise HTTPException(status_code=401, detail="Неверный refresh токен")

                refresh_user_id = refresh_payload.get("sub")
                if not refresh_user_id:
                    raise HTTPException(status_code=401, detail="Неверный refresh токен")

                # Получаем пользователя из БД
                result = await session.execute(
                    User.__table__.select().where(User.id == int(refresh_user_id))
                )
                user = result.first()

                if not user:
                    raise HTTPException(status_code=401, detail="Пользователь не найден")

                # Создаем новые токены
                user_data = {"sub": str(user.id), "telegram_id": user.telegram_id}
                new_access_token = jwt_auth.create_access_token(user_data)
                new_refresh_token = jwt_auth.create_refresh_token(user_data)

                # Возвращаем пользователя с новыми токенами (для установки в cookies)
                user_dict = dict(user)
                user_dict["new_access_token"] = new_access_token
                user_dict["new_refresh_token"] = new_refresh_token
                user_dict["token_refreshed"] = True

                return user_dict

            except Exception as e:
                raise HTTPException(status_code=401, detail=f"Ошибка обновления токена: {str(e)}")
        else:
            raise HTTPException(status_code=401, detail="Access токен истек и отсутствует refresh токен")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Ошибка валидации токена: {str(e)}")

def create_token_response(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Создает ответ с токенами для установки в cookies

    Returns:
        dict с данными пользователя и токенами
    """
    user_data = {
        "sub": str(user["id"]),
        "telegram_id": user["telegram_id"]
    }

    access_token = jwt_auth.create_access_token(user_data)
    refresh_token = jwt_auth.create_refresh_token(user_data)

    return {
        "user": user,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
