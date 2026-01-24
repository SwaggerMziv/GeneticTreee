"""Interview FSM states."""
from aiogram.fsm.state import State, StatesGroup


class InterviewStates(StatesGroup):
    """States for interview flow."""

    waiting_answer = State()
