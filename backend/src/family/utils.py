
from typing import Any
from src.family.exceptions import InvalidDateRangeError



def validate_date_range(birth_date: Any, death_date: Any) -> None:
    if birth_date and death_date and death_date < birth_date:
        raise InvalidDateRangeError("birth_date", "death_date")
