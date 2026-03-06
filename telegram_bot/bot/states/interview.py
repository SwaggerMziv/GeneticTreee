"""Interview FSM states."""
from aiogram.fsm.state import State, StatesGroup


class InterviewStates(StatesGroup):
    """States for interview flow (kept for state cleanup compatibility)."""

    waiting_answer = State()
    confirming_story = State()
