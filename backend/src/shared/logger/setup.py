import logging

def setup_logging():
    """Настраивает логирование приложения"""
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        level=logging.INFO
    )

