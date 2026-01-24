# -*- coding: utf-8 -*-
"""OpenAI Function/Tool definitions for AI Assistant"""

from src.family.enums import RelationshipType

# Собираем список типов связей
RELATIONSHIP_TYPES = [rt.value for rt in RelationshipType]

# Определения инструментов для OpenAI Function Calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_all_relatives",
            "description": "Получить список ВСЕХ родственников пользователя. Используй это ВСЕГДА, когда пользователь просит показать/получить/найти родственников.",
            "parameters": {
                "type": "object",
                "properties": {
                    "only_active": {
                        "type": "boolean",
                        "description": "Показывать только активных родственников (по умолчанию true)",
                        "default": True
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_relatives",
            "description": "Поиск родственников по имени или фамилии",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_term": {
                        "type": "string",
                        "description": "Имя, фамилия или часть имени для поиска"
                    }
                },
                "required": ["search_term"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_relative",
            "description": "Получить детальную информацию о конкретном родственнике",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID родственника или его полное имя"
                    }
                },
                "required": ["relative_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_relative",
            "description": "Создать нового родственника",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {
                        "type": "string",
                        "description": "Имя"
                    },
                    "last_name": {
                        "type": "string",
                        "description": "Фамилия"
                    },
                    "middle_name": {
                        "type": "string",
                        "description": "Отчество (для русских имён)"
                    },
                    "gender": {
                        "type": "string",
                        "enum": ["male", "female", "other"],
                        "description": "Пол"
                    },
                    "birth_date": {
                        "type": "string",
                        "description": "Дата рождения в формате YYYY-MM-DD"
                    },
                    "death_date": {
                        "type": "string",
                        "description": "Дата смерти в формате YYYY-MM-DD"
                    },
                    "generation": {
                        "type": "integer",
                        "description": "Поколение: 0=пользователь, 1=родители, 2=бабушки/дедушки, -1=дети"
                    }
                },
                "required": ["first_name", "last_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_relative",
            "description": "Обновить данные существующего родственника",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника"
                    },
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "middle_name": {"type": "string"},
                    "gender": {
                        "type": "string",
                        "enum": ["male", "female", "other"]
                    },
                    "birth_date": {"type": "string"},
                    "death_date": {"type": "string"},
                    "generation": {"type": "integer"}
                },
                "required": ["relative_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_relative",
            "description": "Удалить родственника",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника для удаления"
                    }
                },
                "required": ["relative_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_relationships",
            "description": "Получить все связи между родственниками",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_relationship",
            "description": "Создать связь между двумя родственниками",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника (источник связи)"
                    },
                    "to_relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника (цель связи)"
                    },
                    "relationship_type": {
                        "type": "string",
                        "enum": RELATIONSHIP_TYPES,
                        "description": "Тип связи"
                    }
                },
                "required": ["from_relative_id", "to_relative_id", "relationship_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_relationship",
            "description": "Удалить связь между родственниками",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя первого родственника"
                    },
                    "to_relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя второго родственника"
                    }
                },
                "required": ["from_relative_id", "to_relative_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_story",
            "description": "Добавить историю/биографию к родственнику",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника"
                    },
                    "key": {
                        "type": "string",
                        "description": "Заголовок истории (например 'Биография', 'Военная служба')"
                    },
                    "value": {
                        "type": "string",
                        "description": "Текст истории"
                    }
                },
                "required": ["relative_id", "key", "value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_story",
            "description": "Удалить историю у родственника",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_id": {
                        "type": ["integer", "string"],
                        "description": "ID или имя родственника"
                    },
                    "key": {
                        "type": "string",
                        "description": "Заголовок истории для удаления"
                    }
                },
                "required": ["relative_id", "key"]
            }
        }
    }
]
