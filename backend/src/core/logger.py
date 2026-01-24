"""
Минимальное логирование для сервисного слоя с использованием декоратора.
"""

import logging
import time
from functools import wraps


# Настройка базового логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)


def get_logger(name: str) -> logging.Logger:
    """
    Получить логгер для модуля.

    Args:
        name: Имя модуля (обычно __name__)

    Returns:
        Настроенный логгер
    """
    return logging.getLogger(name)


def log_service_operation(func):
    """
    Декоратор для автоматического логирования операций сервисного слоя.
    Логирует начало, успешное завершение и ошибки операций.

    Usage:
        class MyService:
            @log_service_operation
            async def my_method(self, arg1: int, arg2: str):
                # ваш код
                return result
    """
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        # Получаем logger
        logger = get_logger(self.__class__.__name__)
        operation_name = func.__name__

        # Логируем начало операции
        logger.info(f"Starting operation: {operation_name}")

        start_time = time.time()

        try:
            # Выполняем операцию
            result = await func(self, *args, **kwargs)

            # Измеряем время выполнения
            duration_ms = (time.time() - start_time) * 1000

            # Логируем успешное завершение
            logger.info(f"Completed operation: {operation_name} (duration: {duration_ms:.2f}ms)")

            return result

        except Exception as e:
            # Логируем ошибку
            logger.error(
                f"Failed operation: {operation_name} | Error: {type(e).__name__}: {str(e)}",
                exc_info=True
            )
            # Пробрасываем исключение дальше
            raise

    return wrapper


__all__ = [
    "get_logger",
    "log_service_operation",
]
