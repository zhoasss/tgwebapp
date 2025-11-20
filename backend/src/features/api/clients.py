"""
API endpoints для управления клиентами
Слой Features - функциональность
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from ...shared.database.models import Client, User
from ...shared.database.connection import get_session
from ...shared.auth.jwt_auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])

class ClientCreate(BaseModel):
    """Схема создания клиента"""
    first_name: str = Field(..., min_length=1, max_length=255, description="Имя клиента")
    last_name: Optional[str] = Field(None, max_length=255, description="Фамилия клиента")
    phone: Optional[str] = Field(None, max_length=50, description="Телефон клиента")
    email: Optional[str] = Field(None, max_length=255, description="Email клиента")
    notes: Optional[str] = Field(None, description="Заметки о клиенте")

class ClientUpdate(BaseModel):
    """Схема обновления клиента"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Имя клиента")
    last_name: Optional[str] = Field(None, max_length=255, description="Фамилия клиента")
    phone: Optional[str] = Field(None, max_length=50, description="Телефон клиента")
    email: Optional[str] = Field(None, max_length=255, description="Email клиента")
    notes: Optional[str] = Field(None, description="Заметки о клиенте")

@router.get("/")
async def get_clients(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Получить список клиентов пользователя

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Query Parameters:
        search: Поиск по имени, фамилии или телефону
        limit: Максимальное количество результатов
        offset: Смещение для пагинации

    Returns:
        Список клиентов пользователя
    """
    user_id = current_user['id']
    logging.info(f"📡 GET /api/clients/ - запрос клиентов для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Строим запрос
    query = select(Client).where(Client.user_id == user.id)

    # Добавляем поиск, если указан
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Client.first_name.ilike(search_filter)) |
            (Client.last_name.ilike(search_filter)) |
            (Client.phone.ilike(search_filter))
        )

    # Добавляем сортировку и пагинацию
    query = query.order_by(Client.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    clients = result.scalars().all()

    # Получаем общее количество для пагинации
    count_query = select(Client).where(Client.user_id == user.id)
    if search:
        count_query = count_query.where(
            (Client.first_name.ilike(search_filter)) |
            (Client.last_name.ilike(search_filter)) |
            (Client.phone.ilike(search_filter))
        )
    total_result = await session.execute(count_query)
    total = len(total_result.scalars().all())

    return {
        "clients": [client.to_dict() for client in clients],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("/")
async def create_client(
    client_data: ClientCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Создать нового клиента

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Body:
        ClientCreate: Данные нового клиента

    Returns:
        Созданный клиент
    """
    user_id = current_user['id']
    logging.info(f"📝 POST /api/clients/ - создание клиента для пользователя {telegram_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Создаем клиента
    client = Client(
        user_id=user.id,
        first_name=client_data.first_name,
        last_name=client_data.last_name,
        phone=client_data.phone,
        email=client_data.email,
        notes=client_data.notes
    )

    session.add(client)
    await session.commit()
    await session.refresh(client)

    logging.info(f"✅ Клиент '{client.first_name} {client.last_name}' создан для пользователя {telegram_id}")
    return client.to_dict()

@router.get("/{client_id}")
async def get_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получить конкретного клиента

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        client_id: ID клиента

    Returns:
        Данные клиента
    """
    user_id = current_user['id']
    logging.info(f"📡 GET /api/clients/{client_id} - запрос клиента {client_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим клиента
    result = await session.execute(
        select(Client).where(
            Client.id == client_id,
            Client.user_id == user.id
        )
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    return client.to_dict()

@router.put("/{client_id}")
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Обновить клиента

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        client_id: ID клиента

    Body:
        ClientUpdate: Данные для обновления

    Returns:
        Обновленный клиент
    """
    user_id = current_user['id']
    logging.info(f"📝 PUT /api/clients/{client_id} - обновление клиента {client_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим клиента
    result = await session.execute(
        select(Client).where(
            Client.id == client_id,
            Client.user_id == user.id
        )
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Обновляем поля
    update_data = client_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await session.commit()
    await session.refresh(client)

    logging.info(f"✅ Клиент '{client.first_name} {client.last_name}' обновлен")
    return client.to_dict()

@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Удалить клиента

    Headers:
        X-Init-Data: initData от Telegram WebApp

    Parameters:
        client_id: ID клиента

    Returns:
        Сообщение об успешном удалении
    """
    user_id = current_user['id']
    logging.info(f"🗑️ DELETE /api/clients/{client_id} - удаление клиента {client_id}")

    # Находим пользователя
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    # Если пользователя нет - создаем (автоматическая регистрация)
    if not user:
        logging.info(f"✨ Создание нового пользователя для Telegram ID: {telegram_id}")
        user = User(
            telegram_id=telegram_id,
            first_name=current_user.get('first_name', 'Пользователь'),
            last_name=current_user.get('last_name', ''),
            username=current_user.get('username', '')
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logging.info(f"✅ Новый пользователь создан (ID: {user.id})")

    # Находим клиента
    result = await session.execute(
        select(Client).where(
            Client.id == client_id,
            Client.user_id == user.id
        )
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Проверяем, есть ли активные записи у этого клиента
    # TODO: Добавить проверку активных записей перед удалением

    await session.delete(client)
    await session.commit()

    logging.info(f"✅ Клиент '{client.first_name} {client.last_name}' удален")
    return {"message": "Клиент успешно удален"}

# Экспорт роутеров
__all__ = ["router"]
