# auth_server.py
import os
import hmac
import hashlib
from pkgutil import get_data
from urllib.parse import unquote, parse_qsl
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Загружаем переменные из p.env
load_dotenv("p.env")

app = Flask(__name__)
BOT_TOKEN = os.getenv("BOT_TOKEN")

def validate_init_data(init_):
    """
    Проверяет подлинность initData из Telegram Mini App.
    Возвращает словарь с данными при успехе, иначе None.
    """
    try:
        if not get_data or not isinstance(get_data, str):
            return None

        # Декодируем URL и парсим параметры
        decoded = unquote(get_data)
        parsed = dict(parse_qsl(decoded))
        received_hash = parsed.pop('hash', None)
        
        if not received_hash or not BOT_TOKEN:
            return None

        # Собираем строку для проверки (сортируем по ключу!)
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        # Генерируем секретный ключ: HMAC-SHA256("WebAppData", BOT_TOKEN)
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=BOT_TOKEN.encode(),
            digestmod=hashlib.sha256
        ).digest()

        # Считаем хеш от данных
        computed_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        # Безопасное сравнение хешей
        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        # Декодируем JSON-объект пользователя
        if 'user' in parsed:
            import json
            parsed['user'] = json.loads(parsed['user'])

        return parsed

    except Exception as e:
        print(f"Ошибка валидации initData: {e}")
        return None


@app.route('/auth', methods=['POST'])
def auth():
    """
    Эндпоинт для авторизации Mini App.
    Принимает: { "initData": "user=...&hash=...&auth_date=..." }
    Возвращает: { "success": true, "user": { ... } }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        init_data = data.get('initData')
        if not init_data:
            return jsonify({"error": "initData is required"}), 400

        # Проверяем подлинность
        user_data = validate_init_data(init_data)
        if not user_data:
            return jsonify({"error": "Invalid hash or expired data"}), 401

        # Извлекаем данные пользователя
        user = user_data.get('user', {})
        return jsonify({
            "success": True,
            "user": {
                "id": user.get('id'),
                "first_name": user.get('first_name'),
                "last_name": user.get('last_name'),
                "username": user.get('username'),
                "photo_url": user.get('photo_url'),
                "auth_date": user_data.get('auth_date')
            }
        })

    except Exception as e:
        print(f"Ошибка в эндпоинте /auth: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    # Проверка конфигурации
    if not BOT_TOKEN:
        raise ValueError("❌ BOT_TOKEN не найден в p.env")

    print(f"✅ Сервер авторизации запущен. BOT_TOKEN загружен.")
    print(f"📡 Ожидание запросов на http://localhost:8000/auth")
    app.run(host='0.0.0.0', port=8000, debug=True)