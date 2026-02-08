"""Interview FSM states."""
from aiogram.fsm.state import State, StatesGroup


class InterviewStates(StatesGroup):
    """States for interview flow."""

    waiting_answer = State()
    confirming_story = State()  # Waiting for user to confirm/reject story
    collecting_story_photos = State()  # Collecting photos for saved story (max 5)

    # States for collecting relative information from interview
    collecting_relative_info = State()  # Collecting name, age, occupation
    selecting_relative_role = State()   # Choosing relationship type (mother, father, etc.)
    confirming_relative_creation = State()  # Confirming relative profile creation
