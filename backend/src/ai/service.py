# -*- coding: utf-8 -*-
"""AI сервис для работы с семейным деревом через GPT-4"""

from typing import AsyncGenerator, List, Dict, Any
from openai import AsyncOpenAI
import json

from src.config import settings
from src.ai.prompts import (
    get_generate_system_prompt,
    get_unified_system_prompt,
    format_tree_context
)
from src.ai.schemas import AIGenerateRequestSchema, AIEditRequestSchema
from src.ai.utils import (
    format_sse,
    extract_json_from_response,
    AIError
)
from src.ai.executor import TreeActionExecutor
from src.ai.validator import ActionValidator
from src.ai.tool_definitions import TOOL_DEFINITIONS


class AIService:
    """Сервис для взаимодействия с GPT-4 и управления семейным деревом"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        # Используем gpt-4o-mini для лучшего следования инструкциям
        self.model = "gpt-4o-mini"  # Можно изменить на gpt-4o для еще лучшего качества

    # ==================== ГЕНЕРАЦИЯ ДЕРЕВА ИЗ ТЕКСТА ====================

    async def generate_tree_stream(
        self,
        request: AIGenerateRequestSchema
    ) -> AsyncGenerator[str, None]:
        """
        Генерация семейного дерева из текстового описания (стриминг)
        """
        system_prompt = get_generate_system_prompt()

        try:
            yield format_sse({"type": "status", "content": "Анализирую описание семьи..."})

            # Запрос к GPT-4
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.description}
                ],
                temperature=0.8,
                max_tokens=3000,
                stream=True
            )

            # Собираем полный ответ
            full_response = ""
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield format_sse({"type": "text", "content": content})

            yield format_sse({"type": "status", "content": "Обрабатываю результат..."})

            # Парсим результат
            try:
                result = extract_json_from_response(full_response)
                yield format_sse({
                    "type": "result",
                    "content": json.dumps(result, ensure_ascii=False)
                })
            except Exception as e:
                yield format_sse({
                    "type": "error",
                    "content": f"Ошибка парсинга: {str(e)}"
                })

            yield format_sse({"type": "done", "content": ""})

        except Exception as e:
            yield format_sse({
                "type": "error",
                "content": f"Ошибка ИИ: {str(e)}"
            })
            yield format_sse({"type": "done", "content": ""})

    # ==================== УНИФИЦИРОВАННЫЙ ЧАТ (ОСНОВНОЙ ENDPOINT) ====================

    async def unified_stream(
        self,
        request: AIEditRequestSchema,
        relatives: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        user_id: int,
        family_service,
        relationship_service,
        mode: str | None = None,
        auto_accept: bool | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Унифицированный ИИ-ассистент с поддержкой рекурсивного выполнения инструментов (Loop).
        """
        # Формируем контекст дерева
        tree_context = format_tree_context(relatives, relationships)
        system_prompt = get_unified_system_prompt(tree_context)

        # Собираем сообщения
        messages = [{"role": "system", "content": system_prompt}]
        for msg in request.history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # Создаём исполнителя и валидатора
        executor = TreeActionExecutor(user_id, family_service, relationship_service)
        validator = ActionValidator(relatives, relationships)

        # Максимальное количество итераций цикла (защита от бесконечного цикла)
        MAX_TURNS = 10
        turn_count = 0

        model_to_use = "gpt-4o" if (mode == "smart") else self.model

        while turn_count < MAX_TURNS:
            turn_count += 1
            try:
                # Запрос к GPT
                response = await self.client.chat.completions.create(
                    model=model_to_use,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2000,
                    stream=True,
                    tools=TOOL_DEFINITIONS,
                    tool_choice="auto"
                )

                tool_calls_buffer = {}
                final_content = ""
                has_tool_calls = False

                async for chunk in response:
                    if not chunk.choices:
                        continue

                    delta = chunk.choices[0].delta

                    # 1. Стриминг текста пользователю
                    if delta.content:
                        final_content += delta.content
                        yield format_sse({"type": "text", "content": delta.content})

                    # 2. Сбор tool_calls
                    if delta.tool_calls:
                        has_tool_calls = True
                        for tool_call in delta.tool_calls:
                            index = tool_call.index
                            if index not in tool_calls_buffer:
                                tool_calls_buffer[index] = {
                                    "id": tool_call.id,
                                    "name": tool_call.function.name if tool_call.function.name else "",
                                    "arguments": tool_call.function.arguments if tool_call.function.arguments else ""
                                }
                            else:
                                if tool_call.function.arguments:
                                    tool_calls_buffer[index]["arguments"] += tool_call.function.arguments

                # Добавляем ответ ассистента в историю (даже если он пустой, но есть тул коллы)
                assistant_msg = {"role": "assistant"}
                if final_content:
                    assistant_msg["content"] = final_content
                
                # Если были вызовы инструментов, добавляем их в сообщение
                if has_tool_calls:
                    assistant_msg["tool_calls"] = []
                    for index in sorted(tool_calls_buffer.keys()):
                        data = tool_calls_buffer[index]
                        assistant_msg["tool_calls"].append({
                            "id": data["id"],
                            "type": "function",
                            "function": {
                                "name": data["name"],
                                "arguments": data["arguments"]
                            }
                        })
                
                messages.append(assistant_msg)

                # Если нет вызовов инструментов, значит ИИ закончил мысль -> выходим из цикла
                if not has_tool_calls:
                    break

                # === ОБРАБОТКА ИНСТРУМЕНТОВ ===
                
                yield format_sse({"type": "status", "content": "Выполняю операции..."})

                for index in sorted(tool_calls_buffer.keys()):
                    tool_data = tool_calls_buffer[index]
                    function_name = tool_data["name"]
                    call_id = tool_data["id"]
                    
                    try:
                        args = json.loads(tool_data["arguments"])

                        # Формируем событие для фронтенда (карточка)
                        action_for_frontend = {
                            "action_type": function_name,
                            "data": args
                        }

                        # Валидация
                        validation = await validator.validate_action(action_for_frontend)
                        if validation['warnings']:
                            for w in validation['warnings']:
                                yield format_sse({"type": "warning", "content": w})

                        # Определяем, является ли действие безопасным (read-only)
                        is_read_only = function_name in [
                            'get_relative', 'get_all_relatives', 
                            'get_relationships', 'search_relatives'
                        ]

                        if auto_accept is False and not is_read_only:
                            # Не исполняем, только отдаём в pending
                            result = {
                                "success": False,
                                "pending": True,
                                "warnings": validation.get("warnings", []),
                                "message": "Ожидает подтверждения пользователя"
                            }
                        else:
                            result = {"success": False, "error": "Validation failed"}
                            if validation['valid']:
                                result = await executor.execute_action(action_for_frontend)
                        
                        action_for_frontend['result'] = result
                        
                        # Отправляем карточку на фронт
                        yield format_sse({
                            "type": "action",
                            "content": json.dumps(action_for_frontend, ensure_ascii=False)
                        })

                        # Добавляем результат в историю сообщений (для следующего шага цикла)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": call_id,
                            "content": json.dumps(result, ensure_ascii=False)
                        })

                    except Exception as e:
                        # В случае ошибки всё равно добавляем в историю, чтобы ИИ знал об ошибке
                        error_msg = f"Error executing {function_name}: {str(e)}"
                        messages.append({
                            "role": "tool",
                            "tool_call_id": call_id,
                            "content": json.dumps({"success": False, "error": error_msg}, ensure_ascii=False)
                        })
                        yield format_sse({"type": "error", "content": error_msg})

                # После выполнения всех инструментов цикл while продолжается,
                # и мы снова вызываем API с обновленной историей messages
                yield format_sse({"type": "status", "content": "Размышляю..."})

            except Exception as e:
                yield format_sse({"type": "error", "content": f"Ошибка в цикле ИИ: {str(e)}"})
                break

        yield format_sse({"type": "done", "content": ""})

    # ==================== ПРИМЕНЕНИЕ РЕЗУЛЬТАТА ГЕНЕРАЦИИ ====================

    async def apply_generate_result(
        self,
        result: Dict[str, Any],
        user_id: int,
        family_service,
        relationship_service
    ) -> Dict[str, Any]:
        """Применить результат генерации"""
        from src.family.schemas import FamilyRelationCreateSchema, FamilyRelationshipCreateSchema
        from src.family.enums import GenderType, RelationshipType
        from src.ai.utils import parse_date

        created_relatives = []
        created_relationships = []
        errors = []
        id_mapping = {}

        for rel_data in result.get('relatives', []):
            try:
                schema = FamilyRelationCreateSchema(
                    first_name=rel_data.get('first_name', 'Неизвестно'),
                    last_name=rel_data.get('last_name', 'Неизвестно'),
                    middle_name=rel_data.get('middle_name'),
                    gender=GenderType(rel_data.get('gender', 'other')),
                    birth_date=parse_date(rel_data.get('birth_date')),
                    death_date=parse_date(rel_data.get('death_date')),
                )
                relative = await family_service.create_relative(user_id, schema)
                id_mapping[rel_data['temp_id']] = relative.id
                created_relatives.append({
                    'temp_id': rel_data['temp_id'],
                    'id': relative.id,
                    'name': f"{relative.first_name} {relative.last_name}"
                })
            except Exception as e:
                errors.append(f"Error creating relative: {str(e)}")

        for rel_data in result.get('relationships', []):
            try:
                from_id = id_mapping.get(rel_data['from_temp_id'])
                to_id = id_mapping.get(rel_data['to_temp_id'])
                if from_id and to_id:
                    schema = FamilyRelationshipCreateSchema(
                        from_relative_id=from_id,
                        to_relative_id=to_id,
                        relationship_type=RelationshipType(rel_data['relationship_type'])
                    )
                    await relationship_service.create_relationship(user_id, schema)
            except Exception as e:
                errors.append(f"Error creating relationship: {str(e)}")

        return {
            'created_relatives': created_relatives,
            'created_relationships': created_relationships,
            'errors': errors,
            'warnings': result.get('validation_warnings', [])
        }
