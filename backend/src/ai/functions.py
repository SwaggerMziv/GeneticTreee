# -*- coding: utf-8 -*-
"""Validation functions for family relationship conflicts in AI Assistant"""

from typing import List, Dict, Any, Tuple, Set
from src.family.enums import RelationshipType, GenderType

# Relationships requiring male gender
MALE_ONLY_RELATIONSHIPS = {
    RelationshipType.FATHER,
    RelationshipType.STEPFATHER,
    RelationshipType.ADOPTIVE_FATHER,
    RelationshipType.SON,
    RelationshipType.STEPSON,
    RelationshipType.ADOPTIVE_SON,
    RelationshipType.GRANDFATHER,
    RelationshipType.GREAT_GRANDFATHER,
    RelationshipType.GRANDSON,
    RelationshipType.GREAT_GRANDSON,
    RelationshipType.BROTHER,
    RelationshipType.HALF_BROTHER,
    RelationshipType.STEPBROTHER,
    RelationshipType.HUSBAND,
    RelationshipType.EX_HUSBAND,
    RelationshipType.UNCLE,
    RelationshipType.GREAT_UNCLE,
    RelationshipType.NEPHEW,
    RelationshipType.GRAND_NEPHEW,
    RelationshipType.FATHER_IN_LAW,
    RelationshipType.SON_IN_LAW,
    RelationshipType.BROTHER_IN_LAW,
    RelationshipType.GODFATHER,
    RelationshipType.GODSON,
}

# Relationships requiring female gender
FEMALE_ONLY_RELATIONSHIPS = {
    RelationshipType.MOTHER,
    RelationshipType.STEPMOTHER,
    RelationshipType.ADOPTIVE_MOTHER,
    RelationshipType.DAUGHTER,
    RelationshipType.STEPDAUGHTER,
    RelationshipType.ADOPTIVE_DAUGHTER,
    RelationshipType.GRANDMOTHER,
    RelationshipType.GREAT_GRANDMOTHER,
    RelationshipType.GRANDDAUGHTER,
    RelationshipType.GREAT_GRANDDAUGHTER,
    RelationshipType.SISTER,
    RelationshipType.HALF_SISTER,
    RelationshipType.STEPSISTER,
    RelationshipType.WIFE,
    RelationshipType.EX_WIFE,
    RelationshipType.AUNT,
    RelationshipType.GREAT_AUNT,
    RelationshipType.NIECE,
    RelationshipType.GRAND_NIECE,
    RelationshipType.MOTHER_IN_LAW,
    RelationshipType.DAUGHTER_IN_LAW,
    RelationshipType.SISTER_IN_LAW,
    RelationshipType.GODMOTHER,
    RelationshipType.GODDAUGHTER,
}

# Mutually exclusive relationships (person cannot be both at once for someone)
MUTUALLY_EXCLUSIVE_RELATIONSHIPS = [
    # Brother and sister
    ({RelationshipType.BROTHER, RelationshipType.HALF_BROTHER, RelationshipType.STEPBROTHER},
     {RelationshipType.SISTER, RelationshipType.HALF_SISTER, RelationshipType.STEPSISTER}),
    # Father and mother
    ({RelationshipType.FATHER, RelationshipType.STEPFATHER, RelationshipType.ADOPTIVE_FATHER},
     {RelationshipType.MOTHER, RelationshipType.STEPMOTHER, RelationshipType.ADOPTIVE_MOTHER}),
    # Husband and wife
    ({RelationshipType.HUSBAND, RelationshipType.EX_HUSBAND},
     {RelationshipType.WIFE, RelationshipType.EX_WIFE}),
    # Son and daughter
    ({RelationshipType.SON, RelationshipType.STEPSON, RelationshipType.ADOPTIVE_SON},
     {RelationshipType.DAUGHTER, RelationshipType.STEPDAUGHTER, RelationshipType.ADOPTIVE_DAUGHTER}),
    # Grandfather and grandmother
    ({RelationshipType.GRANDFATHER, RelationshipType.GREAT_GRANDFATHER},
     {RelationshipType.GRANDMOTHER, RelationshipType.GREAT_GRANDMOTHER}),
    # Uncle and aunt
    ({RelationshipType.UNCLE, RelationshipType.GREAT_UNCLE},
     {RelationshipType.AUNT, RelationshipType.GREAT_AUNT}),
    # Nephew and niece
    ({RelationshipType.NEPHEW, RelationshipType.GRAND_NEPHEW},
     {RelationshipType.NIECE, RelationshipType.GRAND_NIECE}),
]

# Parent-child relationships
PARENT_RELATIONSHIPS = {
    RelationshipType.PARENT,
    RelationshipType.FATHER,
    RelationshipType.MOTHER,
    RelationshipType.STEPFATHER,
    RelationshipType.STEPMOTHER,
    RelationshipType.ADOPTIVE_FATHER,
    RelationshipType.ADOPTIVE_MOTHER,
}

CHILD_RELATIONSHIPS = {
    RelationshipType.CHILD,
    RelationshipType.SON,
    RelationshipType.DAUGHTER,
    RelationshipType.STEPSON,
    RelationshipType.STEPDAUGHTER,
    RelationshipType.ADOPTIVE_SON,
    RelationshipType.ADOPTIVE_DAUGHTER,
}

# Biological parent relationships (max 2 allowed)
BIOLOGICAL_PARENT_RELATIONSHIPS = {
    RelationshipType.PARENT,
    RelationshipType.FATHER,
    RelationshipType.MOTHER,
}


def validate_gender_relationship(
    gender: str,
    relationship_type: str
) -> Tuple[bool, str]:
    """
    Validate that gender matches the relationship type.
    Returns (is_valid, error_message)
    """
    try:
        rel_type = RelationshipType(relationship_type)
    except ValueError:
        return False, f"Unknown relationship type: {relationship_type}"

    if gender == "male" or gender == GenderType.MALE:
        if rel_type in FEMALE_ONLY_RELATIONSHIPS:
            return False, f"A male cannot be '{relationship_type}'"
    elif gender == "female" or gender == GenderType.FEMALE:
        if rel_type in MALE_ONLY_RELATIONSHIPS:
            return False, f"A female cannot be '{relationship_type}'"

    return True, ""


def validate_relationship_conflicts(
    from_relative_id: int,
    to_relative_id: int,
    new_relationship_type: str,
    existing_relationships: List[Dict[str, Any]]
) -> Tuple[bool, List[str]]:
    """
    Validate relationship conflicts between two relatives.
    Returns (is_valid, list_of_warnings)
    """
    warnings = []

    try:
        new_rel_type = RelationshipType(new_relationship_type)
    except ValueError:
        return False, [f"Unknown relationship type: {new_relationship_type}"]

    # Get all existing relationships from -> to
    existing_from_to: Set[RelationshipType] = set()
    for rel in existing_relationships:
        if rel.get('from_relative_id') == from_relative_id and rel.get('to_relative_id') == to_relative_id:
            try:
                existing_from_to.add(RelationshipType(rel.get('relationship_type')))
            except ValueError:
                pass

    # Check for mutually exclusive relationships
    for group1, group2 in MUTUALLY_EXCLUSIVE_RELATIONSHIPS:
        new_in_group1 = new_rel_type in group1
        new_in_group2 = new_rel_type in group2

        existing_in_group1 = bool(existing_from_to & group1)
        existing_in_group2 = bool(existing_from_to & group2)

        if (new_in_group1 and existing_in_group2) or (new_in_group2 and existing_in_group1):
            conflicting = existing_from_to & (group1 | group2)
            warnings.append(
                f"Conflict: cannot be both '{new_relationship_type}' "
                f"and '{', '.join(r.value for r in conflicting)}' simultaneously"
            )

    # Check for cyclic parent-child relationships
    if new_rel_type in PARENT_RELATIONSHIPS:
        for rel in existing_relationships:
            if (rel.get('from_relative_id') == to_relative_id and
                rel.get('to_relative_id') == from_relative_id):
                try:
                    existing_type = RelationshipType(rel.get('relationship_type'))
                    if existing_type in PARENT_RELATIONSHIPS:
                        warnings.append(
                            "Conflict: a person cannot be both parent and child of the same person"
                        )
                except ValueError:
                    pass

    # Check for self-relationship
    if from_relative_id == to_relative_id:
        warnings.append("Error: a person cannot have a relationship with themselves")

    return len(warnings) == 0, warnings


def validate_max_parents(
    relative_id: int,
    new_relationship_type: str,
    existing_relationships: List[Dict[str, Any]]
) -> Tuple[bool, str]:
    """
    Validate that a person does not have more than 2 biological parents.
    Returns (is_valid, warning_message)
    """
    try:
        new_rel_type = RelationshipType(new_relationship_type)
    except ValueError:
        return True, ""

    if new_rel_type not in BIOLOGICAL_PARENT_RELATIONSHIPS:
        return True, ""

    # Count existing biological parents
    parent_count = 0
    for rel in existing_relationships:
        if rel.get('to_relative_id') == relative_id:
            try:
                rel_type = RelationshipType(rel.get('relationship_type'))
                if rel_type in BIOLOGICAL_PARENT_RELATIONSHIPS:
                    parent_count += 1
            except ValueError:
                pass

    if parent_count >= 2:
        return False, "This person already has 2 biological parents"

    return True, ""


def validate_full_tree(
    relatives: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Full tree validation.
    Returns list of conflicts.
    """
    conflicts = []

    # Create relatives index
    relatives_by_id = {r.get('id'): r for r in relatives}

    for rel in relationships:
        from_id = rel.get('from_relative_id')
        to_id = rel.get('to_relative_id')
        rel_type = rel.get('relationship_type')

        from_relative = relatives_by_id.get(from_id, {})
        from_gender = from_relative.get('gender', 'other')

        # Validate gender
        is_valid, error = validate_gender_relationship(from_gender, rel_type)
        if not is_valid:
            conflicts.append({
                'relative_id': from_id,
                'relative_name': f"{from_relative.get('first_name', '')} {from_relative.get('last_name', '')}".strip(),
                'conflict_type': 'gender_mismatch',
                'conflicting_relationships': [rel_type],
                'suggestion': error
            })

        # Validate relationship conflicts
        is_valid, warnings = validate_relationship_conflicts(
            from_id, to_id, rel_type, relationships
        )
        for warning in warnings:
            conflicts.append({
                'relative_id': from_id,
                'relative_name': f"{from_relative.get('first_name', '')} {from_relative.get('last_name', '')}".strip(),
                'conflict_type': 'relationship_conflict',
                'conflicting_relationships': [rel_type],
                'suggestion': warning
            })

    return conflicts


def get_inverse_relationship(relationship_type: str, from_gender: str) -> str:
    """
    Get the inverse relationship type.
    Example: father -> son/daughter (depending on to_relative's gender)
    """
    inverse_map = {
        'father': {'male': 'son', 'female': 'daughter', 'other': 'child'},
        'mother': {'male': 'son', 'female': 'daughter', 'other': 'child'},
        'son': {'male': 'father', 'female': 'mother', 'other': 'parent'},
        'daughter': {'male': 'father', 'female': 'mother', 'other': 'parent'},
        'brother': {'male': 'brother', 'female': 'sister', 'other': 'sibling'},
        'sister': {'male': 'brother', 'female': 'sister', 'other': 'sibling'},
        'husband': {'male': 'husband', 'female': 'wife', 'other': 'partner'},
        'wife': {'male': 'husband', 'female': 'wife', 'other': 'partner'},
        'grandfather': {'male': 'grandson', 'female': 'granddaughter', 'other': 'grandchild'},
        'grandmother': {'male': 'grandson', 'female': 'granddaughter', 'other': 'grandchild'},
        'grandson': {'male': 'grandfather', 'female': 'grandmother', 'other': 'grandparent'},
        'granddaughter': {'male': 'grandfather', 'female': 'grandmother', 'other': 'grandparent'},
        'uncle': {'male': 'nephew', 'female': 'niece', 'other': 'nephew'},
        'aunt': {'male': 'nephew', 'female': 'niece', 'other': 'niece'},
        'nephew': {'male': 'uncle', 'female': 'aunt', 'other': 'uncle'},
        'niece': {'male': 'uncle', 'female': 'aunt', 'other': 'aunt'},
    }

    if relationship_type in inverse_map:
        return inverse_map[relationship_type].get(from_gender, relationship_type)

    return relationship_type
