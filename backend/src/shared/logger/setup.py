import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging(log_file='app.log', max_bytes=10*1024*1024, backup_count=5):
    """
    Настраивает логирование с ротацией файлов
    
    Args:
        log_file: Имя файла лога
        max_bytes: Максимальный размер файла (по умолчанию 10MB)
        backup_count: Количество резервных копий
    """
    
    # Определяем путь к директории backend
    backend_dir = Path(__file__).parent.parent.parent.parent
    log_path = backend_dir / log_file
    
    # Console handler - выводим все логи начиная с INFO
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)

    # File handler с ротацией - сохраняем все логи начиная с DEBUG
    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Формат логов
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    # Настройка root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[console, file_handler],
        force=True  # Перезаписывает существующую конфигурацию
    )
    
    # Уменьшаем уровень логирования для httpx (слишком много INFO)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('telegram.ext').setLevel(logging.WARNING)
    
    return logging.getLogger()

