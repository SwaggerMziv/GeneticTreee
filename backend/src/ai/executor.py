# -*- coding: utf-8 -*-
"""Исполнитель действий над семейным деревом"""

from typing import Dict, Any, Optional, List
from src.family.schemas import (
    FamilyRelationCreateSchema,
    FamilyRelationshipCreateSchema,
    FamilyRelationUpdateSchema,
    FamilyRelationContextUpdateSchema
)
from src.family.enums import RelationshipType, GenderType
from src.ai.utils import parse_date, AIExecutionError


class TreeActionExecutor:
    """Класс для выполнения действий над семейным деревом"""

    def __init__(self, user_id: int, family_service, relationship_service):
        self.user_id = user_id
        self.family_service = family_service
        self.relationship_service = relationship_service

    async def execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Выполнить действие над деревом

        Returns:
            Dict с ключами: success (bool), id (optional), error (optional)
        """
        action_type = action.get('action_type')
        data = action.get('data', {})

        try:
            # Модифицирующие действия
            if action_type == 'create_relative':
                return await self._create_relative(data)
            elif action_type == 'update_relative':
                return await self._update_relative(data)
            elif action_type == 'delete_relative':
                return await self._delete_relative(data)
            elif action_type == 'create_relationship':
                return await self._create_relationship(data)
            elif action_type == 'delete_relationship':
                return await self._delete_relationship(data)
            elif action_type == 'add_story':
                return await self._add_story(data)
            elif action_type == 'delete_story':
                return await self._delete_story(data)

            # Read-only действия (получение информации)
            elif action_type == 'get_relative':
                return await self._get_relative(data)
            elif action_type == 'get_all_relatives':
                return await self._get_all_relatives(data)
            elif action_type == 'get_relationships':
                return await self._get_relationships(data)
            elif action_type == 'search_relatives':
                return await self._search_relatives(data)
            else:
                return {'success': False, 'error': f'Неизвестное действие: {action_type}'}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _create_relative(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать родственника"""
        schema = FamilyRelationCreateSchema(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            middle_name=data.get('middle_name'),
            gender=GenderType(data.get('gender', 'other')),
            birth_date=parse_date(data.get('birth_date')),
            death_date=parse_date(data.get('death_date')),
            generation=data.get('generation'),
            context=data.get('context', {})
        )
        relative = await self.family_service.create_relative(self.user_id, schema)
        name = f"{relative.first_name or ''} {relative.last_name or ''}".strip() or "(без имени)"
        return {'success': True, 'id': relative.id, 'name': name}

    async def _update_relative(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Обновить данные родственника"""
        relative_id = await self._resolve_relative_id(data.get('relative_id'))
        if not relative_id:
            return {'success': False, 'error': f"Родственник не найден: {data.get('relative_id')}"}

        update_data = {}
        if data.get('first_name'):
            update_data['first_name'] = data.get('first_name')
        if data.get('last_name'):
            update_data['last_name'] = data.get('last_name')
        if data.get('middle_name'):
            update_data['middle_name'] = data.get('middle_name')
        if data.get('gender'):
            update_data['gender'] = GenderType(data.get('gender'))
        if data.get('birth_date'):
            update_data['birth_date'] = parse_date(data.get('birth_date'))
        if data.get('death_date'):
            update_data['death_date'] = parse_date(data.get('death_date'))
        if 'generation' in data:
            update_data['generation'] = data.get('generation')

        if not update_data:
            return {'success': False, 'error': 'Нет данных для обновления'}

        schema = FamilyRelationUpdateSchema(**update_data)
        await self.family_service.update_relative(self.user_id, relative_id, schema)
        return {'success': True, 'id': relative_id}

    async def _delete_relative(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Удалить родственника"""
        relative_id = data.get('relative_id')

        # Если ID передан напрямую
        if isinstance(relative_id, int):
            await self.family_service.delete_relative(self.user_id, relative_id)
            return {'success': True}

        # Если передано имя
        resolved_id = await self._resolve_relative_id(relative_id)
        if resolved_id:
            await self.family_service.delete_relative(self.user_id, resolved_id)
            return {'success': True}

        return {'success': False, 'error': f'Родственник не найден: {relative_id}'}

    async def _create_relationship(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Создать связь между родственниками"""
        from_id = await self._resolve_relative_id(data.get('from_relative_id'))
        to_id = await self._resolve_relative_id(data.get('to_relative_id'))

        if not from_id or not to_id:
            return {
                'success': False,
                'error': f"Родственники не найдены: {data.get('from_relative_id')} или {data.get('to_relative_id')}"
            }

        schema = FamilyRelationshipCreateSchema(
            from_relative_id=from_id,
            to_relative_id=to_id,
            relationship_type=RelationshipType(data.get('relationship_type'))
        )
        relationship = await self.relationship_service.create_relationship(self.user_id, schema)
        return {'success': True, 'id': relationship.id}

    async def _delete_relationship(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Удалить связь между родственниками"""
        from_id = await self._resolve_relative_id(data.get('from_relative_id'))
        to_id = await self._resolve_relative_id(data.get('to_relative_id'))

        if not from_id or not to_id:
            return {'success': False, 'error': 'Родственники не найдены'}

        # Получаем все связи пользователя
        relationships = await self.relationship_service.get_user_relationships(self.user_id)

        # Ищем нужную связь (двунаправленно)
        target_rel = next(
            (r for r in relationships if
             (r.from_relative_id == from_id and r.to_relative_id == to_id) or
             (r.from_relative_id == to_id and r.to_relative_id == from_id)),
            None
        )

        if target_rel:
            await self.relationship_service.delete_relationship(self.user_id, target_rel.id)
            return {'success': True}

        return {'success': False, 'error': 'Связь не найдена'}

    async def _add_story(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Добавить историю к родственнику"""
        relative_id = await self._resolve_relative_id(data.get('relative_id'))
        if not relative_id:
            return {'success': False, 'error': f"Родственник не найден: {data.get('relative_id')}"}

        key = data.get('key')
        value = data.get('value')

        if not key or not value:
            return {'success': False, 'error': 'Требуется ключ и значение'}

        schema = FamilyRelationContextUpdateSchema(key=key, value=value)
        await self.family_service.update_relative_context(self.user_id, relative_id, schema)
        return {'success': True, 'id': relative_id}

    async def _delete_story(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Удалить историю у родственника"""
        relative_id = await self._resolve_relative_id(data.get('relative_id'))
        if not relative_id:
            return {'success': False, 'error': f"Родственник не найден: {data.get('relative_id')}"}

        key = data.get('key')
        if not key:
            return {'success': False, 'error': 'Требуется ключ истории'}

        # Получаем родственника
        relative = await self.family_service.get_relative_by_id(self.user_id, relative_id)
        if not relative:
            return {'success': False, 'error': 'Родственник не найден'}

        # Проверяем есть ли такая история
        context = relative.context or {}
        if key not in context:
            return {'success': False, 'error': f'История "{key}" не найдена'}

        # Удаляем историю (устанавливаем пустое значение или используем delete)
        # В зависимости от реализации service можно либо установить None, либо удалить ключ
        schema = FamilyRelationContextUpdateSchema(key=key, value=None)
        await self.family_service.update_relative_context(self.user_id, relative_id, schema)
        return {'success': True, 'id': relative_id, 'deleted_key': key}

    async def _resolve_relative_id(self, identifier) -> Optional[int]:
        """
        Преобразовать идентификатор в ID родственника
        Поддерживает: int, str (число), str (имя), <Имя>
        """
        if not identifier:
            return None

        # Уже число
        if isinstance(identifier, int):
            return identifier

        # Строка с числом
        if isinstance(identifier, str) and identifier.isdigit():
            return int(identifier)

        # Имя в угловых скобках или просто имя
        name = str(identifier).strip('<> ').replace('undefined', '').strip()
        if not name:
            return None

        # Поиск по имени
        relatives = await self.family_service.search_relatives_by_name(self.user_id, name)

        # Если не найдено и есть пробелы, пробуем разбить на имя и фамилию
        if not relatives and ' ' in name:
            parts = name.split()
            if len(parts) >= 2:
                first = parts[0]
                last = parts[-1]

                matches = await self.family_service.search_relatives_by_name(self.user_id, first)
                # Фильтруем по фамилии
                relatives = [
                    r for r in matches
                    if (r.last_name and last.lower() in r.last_name.lower()) or
                       (r.middle_name and last.lower() in r.middle_name.lower())
                ]

        if relatives:
            # Возвращаем последнего созданного (самый большой ID)
            relatives.sort(key=lambda x: x.id, reverse=True)
            return relatives[0].id

        return None

    # ==================== READ-ONLY ДЕЙСТВИЯ ====================

    async def _get_relative(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Получить информацию о родственнике"""
        relative_id = await self._resolve_relative_id(data.get('relative_id'))
        if not relative_id:
            return {'success': False, 'error': f"Родственник не найден: {data.get('relative_id')}"}

        try:
            relative = await self.family_service.get_relative_by_id(self.user_id, relative_id)
            return {
                'success': True,
                'data': {
                    'id': relative.id,
                    'first_name': relative.first_name,
                    'last_name': relative.last_name,
                    'middle_name': relative.middle_name,
                    'gender': relative.gender.value if relative.gender else None,
                    'birth_date': str(relative.birth_date) if relative.birth_date else None,
                    'death_date': str(relative.death_date) if relative.death_date else None,
                    'generation': relative.generation,
                    'context': relative.context or {}
                }
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _get_all_relatives(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Получить всех родственников"""
        only_active = data.get('only_active', True)

        try:
            relatives = await self.family_service.get_user_relatives(self.user_id, only_active)
            return {
                'success': True,
                'count': len(relatives),
                'data': [
                    {
                        'id': r.id,
                        'first_name': r.first_name,
                        'last_name': r.last_name,
                        'middle_name': r.middle_name,
                        'gender': r.gender.value if r.gender else None,
                        'birth_date': str(r.birth_date) if r.birth_date else None,
                        'death_date': str(r.death_date) if r.death_date else None,
                        'generation': r.generation,
                        'has_stories': bool(r.context)
                    }
                    for r in relatives
                ]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _get_relationships(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Получить связи между родственниками"""
        try:
            relationships = await self.relationship_service.get_user_relationships(
                self.user_id,
                with_details=False
            )
            return {
                'success': True,
                'count': len(relationships),
                'data': [
                    {
                        'id': r.id,
                        'from_relative_id': r.from_relative_id,
                        'to_relative_id': r.to_relative_id,
                        'relationship_type': r.relationship_type.value if r.relationship_type else None
                    }
                    for r in relationships
                ]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _search_relatives(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Поиск родственников по имени"""
        search_term = data.get('search_term', '')
        if not search_term:
            return {'success': False, 'error': 'Требуется search_term'}

        try:
            relatives = await self.family_service.search_relatives_by_name(self.user_id, search_term)
            return {
                'success': True,
                'count': len(relatives),
                'data': [
                    {
                        'id': r.id,
                        'first_name': r.first_name,
                        'last_name': r.last_name,
                        'middle_name': r.middle_name,
                        'gender': r.gender.value if r.gender else None,
                        'birth_date': str(r.birth_date) if r.birth_date else None
                    }
                    for r in relatives
                ]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
