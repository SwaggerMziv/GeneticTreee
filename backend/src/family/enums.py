from enum import Enum


class GenderType(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


# Alias for backward compatibility
Gender = GenderType


class RelationshipType(str, Enum):
    """Типы связей между родственниками"""

    # Прямые родственные связи (биологические)
    PARENT = "parent"  # Родитель (общий термин)
    CHILD = "child"    # Ребенок (общий термин)

    # Родители
    FATHER = "father"
    MOTHER = "mother"
    STEPFATHER = "stepfather"
    STEPMOTHER = "stepmother"
    ADOPTIVE_FATHER = "adoptive_father"
    ADOPTIVE_MOTHER = "adoptive_mother"

    # Дети
    SON = "son"
    DAUGHTER = "daughter"
    STEPSON = "stepson"
    STEPDAUGHTER = "stepdaughter"
    ADOPTIVE_SON = "adoptive_son"
    ADOPTIVE_DAUGHTER = "adoptive_daughter"

    # Бабушки и дедушки
    GRANDFATHER = "grandfather"
    GRANDMOTHER = "grandmother"
    GREAT_GRANDFATHER = "great_grandfather"
    GREAT_GRANDMOTHER = "great_grandmother"

    # Внуки
    GRANDSON = "grandson"
    GRANDDAUGHTER = "granddaughter"
    GREAT_GRANDSON = "great_grandson"
    GREAT_GRANDDAUGHTER = "great_granddaughter"

    # Братья и сестры
    BROTHER = "brother"
    SISTER = "sister"
    HALF_BROTHER = "half_brother"  # Сводный брат (один общий родитель)
    HALF_SISTER = "half_sister"
    STEPBROTHER = "stepbrother"    # Сводный брат (без общих родителей)
    STEPSISTER = "stepsister"

    # Супруги
    SPOUSE = "spouse"  # В браке (универсальный тип)
    HUSBAND = "husband"  # Deprecated: используйте SPOUSE
    WIFE = "wife"  # Deprecated: используйте SPOUSE
    EX_SPOUSE = "ex_spouse"  # Бывший супруг/супруга
    EX_HUSBAND = "ex_husband"  # Deprecated
    EX_WIFE = "ex_wife"  # Deprecated
    PARTNER = "partner"  # Гражданский брак

    # Тети и дяди
    UNCLE = "uncle"
    AUNT = "aunt"
    GREAT_UNCLE = "great_uncle"
    GREAT_AUNT = "great_aunt"

    # Племянники
    NEPHEW = "nephew"
    NIECE = "niece"
    GRAND_NEPHEW = "grand_nephew"
    GRAND_NIECE = "grand_niece"

    # Двоюродные родственники
    COUSIN = "cousin"  # Двоюродный брат/сестра
    SECOND_COUSIN = "second_cousin"  # Троюродный

    # Родственники супругов
    FATHER_IN_LAW = "father_in_law"
    MOTHER_IN_LAW = "mother_in_law"
    SON_IN_LAW = "son_in_law"
    DAUGHTER_IN_LAW = "daughter_in_law"
    BROTHER_IN_LAW = "brother_in_law"
    SISTER_IN_LAW = "sister_in_law"

    # Крестные
    GODFATHER = "godfather"
    GODMOTHER = "godmother"
    GODSON = "godson"
    GODDAUGHTER = "goddaughter"

    # Другое
    GUARDIAN = "guardian"  # Опекун
    WARD = "ward"  # Подопечный
    UNKNOWN = "unknown"
