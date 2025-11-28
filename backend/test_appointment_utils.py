"""
Тестовый скрипт для проверки утилит работы с записями
"""

import asyncio
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.shared.utils.appointment_utils import (
    format_appointment_time_range,
    calculate_appointment_end_time
)


def test_format_time_range():
    """Тест форматирования временного диапазона"""
    print("🧪 Тест форматирования временного диапазона...")
    
    appointment_date = datetime(2025, 11, 28, 14, 0)
    duration = 90  # 1.5 часа
    
    result = format_appointment_time_range(appointment_date, duration)
    expected = "14:00 - 15:30"
    
    assert result == expected, f"Ожидалось '{expected}', получено '{result}'"
    print(f"✅ Результат: {result}")


def test_calculate_end_time():
    """Тест вычисления времени окончания"""
    print("\n🧪 Тест вычисления времени окончания...")
    
    appointment_date = datetime(2025, 11, 28, 14, 0)
    duration = 60
    
    result = calculate_appointment_end_time(appointment_date, duration)
    expected = datetime(2025, 11, 28, 15, 0)
    
    assert result == expected, f"Ожидалось {expected}, получено {result}"
    print(f"✅ Результат: {result}")


def main():
    """Запуск всех тестов"""
    print("=" * 60)
    print("🚀 Запуск тестов утилит для работы с записями")
    print("=" * 60)
    
    try:
        test_format_time_range()
        test_calculate_end_time()
        
        print("\n" + "=" * 60)
        print("✅ Все тесты пройдены успешно!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ Тест провален: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
