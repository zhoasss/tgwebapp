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
    
    try:
        # Определяем путь к директории backend
        backend_dir = Path(__file__).parent.parent.parent.parent
        log_path = backend_dir / log_file
        
        # Создаём директорию если её нет
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
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
        
        # Получаем root logger и очищаем существующие handlers
        root_logger = logging.getLogger()
        root_logger.handlers.clear()
        root_logger.setLevel(logging.DEBUG)
        
        # Добавляем наши handlers
        root_logger.addHandler(console)
        root_logger.addHandler(file_handler)
        
        # Уменьшаем уровень логирования для внешних библиотек
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('telegram.ext').setLevel(logging.WARNING)
        
        return root_logger
        
    except Exception as e:
        # Fallback на консольное логирование если что-то пошло не так
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logging.error(f"❌ Ошибка при настройке логирования: {e}")
        return logging.getLogger()

