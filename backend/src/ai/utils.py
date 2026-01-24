# -*- coding: utf-8 -*-
"""Утилиты для AI модуля"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


def format_sse(data: Dict[str, Any]) -> str:
    """Форматировать данные для SSE (Server-Sent Events)"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def parse_date(date_str: Optional[str]):
    """Парсинг даты из строки в формате YYYY-MM-DD"""
    if not date_str:
        return None

    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def extract_json_from_response(response: str) -> Dict[str, Any]:
    """Извлечь JSON из текста ответа ИИ"""
    import re

    # Убираем markdown блоки ```json...```
    response = re.sub(r'```json\s*', '', response)
    response = re.sub(r'```\s*', '', response)

    # Ищем JSON объект
    json_match = re.search(r'\{[\s\S]*\}', response)
    if json_match:
        return json.loads(json_match.group())

    raise ValueError("JSON не найден в ответе ИИ")


def extract_actions_from_response(response: str) -> List[Dict[str, Any]]:
    """Извлечь список действий из ответа ИИ (формат [ACTION]...[/ACTION])"""
    import re
    actions = []

    # Ищем блоки [ACTION]...[/ACTION]
    pattern = r'\[ACTION\](.*?)\[/ACTION\]'
    matches = re.findall(pattern, response, re.DOTALL | re.IGNORECASE)

    for match in matches:
        try:
            # Очищаем от markdown
            clean_json = match.strip()
            clean_json = re.sub(r'```json\s*', '', clean_json)
            clean_json = re.sub(r'```\s*', '', clean_json)

            action_data = json.loads(clean_json)

            # Если это массив действий
            if isinstance(action_data, list):
                actions.extend(action_data)
            elif isinstance(action_data, dict):
                actions.append(action_data)
        except json.JSONDecodeError:
            # Пропускаем невалидный JSON
            pass

    return actions


def clean_text_from_actions(text: str) -> str:
    """Удалить блоки [ACTION]...[/ACTION] из текста"""
    import re
    return re.sub(r'\[ACTION\][\s\S]*?\[/ACTION\]', '', text, flags=re.IGNORECASE).strip()


class AIError(Exception):
    """Базовый класс для ошибок AI модуля"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class AIValidationError(AIError):
    """Ошибка валидации данных"""
    pass


class AIExecutionError(AIError):
    """Ошибка выполнения действия"""
    pass


class AIParsingError(AIError):
    """Ошибка парсинга ответа ИИ"""
    pass
