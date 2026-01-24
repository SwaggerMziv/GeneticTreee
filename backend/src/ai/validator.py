# -*- coding: utf-8 -*-
"""Валидатор действий над семейным деревом"""

from typing import Dict, Any, List


class ActionValidator:
    """Валидатор действий ИИ над деревом"""

    def __init__(self, relatives: List[Dict[str, Any]], relationships: List[Dict[str, Any]]):
        self.relatives = relatives
        self.relationships = relationships

    async def validate_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Валидировать действие перед выполнением

        Returns:
            {
                "valid": bool,
                "warnings": List[str]
            }
        """
        warnings = []
        action_type = action.get('action_type', '')
        data = action.get('data', {})

        if action_type == 'create_relationship':
            warnings.extend(self._validate_relationship(data))
        elif action_type == 'create_relative':
            warnings.extend(self._validate_relative(data))
        elif action_type == 'update_relative':
            if not data.get('relative_id'):
                warnings.append("ID родственника обязателен для обновления")
        elif action_type == 'add_story':
            if not data.get('relative_id') or not data.get('key') or not data.get('value'):
                warnings.append("ID родственника, ключ и значение обязательны для истории")
        elif action_type == 'delete_story':
            # Для удаления истории НЕ требуется value, только relative_id и key
            if not data.get('relative_id') or not data.get('key'):
                warnings.append("ID родственника и ключ обязательны для удаления истории")

        return {
            'valid': len(warnings) == 0,
            'warnings': warnings
        }

    def _validate_relationship(self, data: Dict[str, Any]) -> List[str]:
        """Валидировать создание связи"""
        warnings = []

        from_id = data.get('from_relative_id')
        to_id = data.get('to_relative_id')
        rel_type = data.get('relationship_type')

        if not from_id or not to_id or not rel_type:
            warnings.append("ID родственников и тип связи обязательны")
            return warnings

        # Проверка на гендерные несоответствия
        # ВАЖНО: проверяем to_relative, а не from_relative!
        # Если from=Иван, to=Мария, type=mother -> Мария должна быть женщиной
        to_relative = next((r for r in self.relatives if r.get('id') == to_id), None)
        if to_relative:
            gender = to_relative.get('gender', 'other')
            gender_warning = self._check_gender_relationship(gender, rel_type)
            if gender_warning:
                warnings.append(gender_warning)

        # Проверка на дубликаты связей
        existing_rel = next(
            (r for r in self.relationships if
             (r.get('from_relative_id') == from_id and r.get('to_relative_id') == to_id)),
            None
        )
        if existing_rel:
            warnings.append(f"Связь уже существует между этими родственниками")

        # Проверка на максимум родителей
        if rel_type in ['father', 'mother', 'parent']:
            parent_count = sum(
                1 for r in self.relationships
                if r.get('to_relative_id') == to_id and
                   r.get('relationship_type') in ['father', 'mother', 'parent']
            )
            if parent_count >= 2:
                warnings.append("У человека не может быть более 2 биологических родителей")

        return warnings

    def _validate_relative(self, data: Dict[str, Any]) -> List[str]:
        """Валидировать создание родственника"""
        warnings = []

        if not data.get('first_name') or not data.get('last_name'):
            warnings.append("Имя и фамилия обязательны")

        return warnings

    def _check_gender_relationship(self, gender: str, relationship_type: str) -> str:
        """Проверить соответствие пола и типа связи"""
        male_only = ['father', 'brother', 'grandfather', 'uncle', 'husband', 'son', 'grandson', 'nephew']
        female_only = ['mother', 'sister', 'grandmother', 'aunt', 'wife', 'daughter', 'granddaughter', 'niece']

        if gender == 'male' and relationship_type in female_only:
            return f"Мужчина не может быть {relationship_type}"
        elif gender == 'female' and relationship_type in male_only:
            return f"Женщина не может быть {relationship_type}"

        return ""
