from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class AIActionType(str, Enum):
    CREATE_RELATIVE = "create_relative"
    UPDATE_RELATIVE = "update_relative"
    DELETE_RELATIVE = "delete_relative"
    CREATE_RELATIONSHIP = "create_relationship"
    UPDATE_RELATIONSHIP = "update_relationship"
    DELETE_RELATIONSHIP = "delete_relationship"
    GET_INFO = "get_info"
    VALIDATE = "validate"


class AIMode(str, Enum):
    GENERATE = "generate"
    EDIT = "edit"


class ChatMessageSchema(BaseModel):
    role: str = Field(...)
    content: str = Field(...)


class AIGenerateRequestSchema(BaseModel):
    description: str = Field(..., min_length=1, max_length=5000)


class AIEditRequestSchema(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessageSchema] = Field(default=[])
    mode: Optional[str] = Field(default=None, description="base | smart (выбор модели)")
    auto_accept: Optional[bool] = Field(default=None, description="Автопринятие действий (True/False)")


class AIChatRequestSchema(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessageSchema] = Field(default=[])


class AIStreamChunkSchema(BaseModel):
    type: str = Field(..., description="text, action, error, done")
    content: str = Field(default="")
    action: Optional[Dict[str, Any]] = Field(default=None)


class RelativeFromAISchema(BaseModel):
    temp_id: str = Field(...)
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: str = Field(..., min_length=1, max_length=64)
    middle_name: Optional[str] = Field(default=None, max_length=64)
    gender: str = Field(default="other")
    birth_date: Optional[str] = Field(default=None)
    death_date: Optional[str] = Field(default=None)
    is_user: bool = Field(default=False)


class RelationshipFromAISchema(BaseModel):
    from_temp_id: str = Field(...)
    to_temp_id: str = Field(...)
    relationship_type: str = Field(...)


class AIGenerateResultSchema(BaseModel):
    relatives: List[RelativeFromAISchema] = Field(default=[])
    relationships: List[RelationshipFromAISchema] = Field(default=[])
    validation_warnings: List[str] = Field(default=[])


class AIActionResultSchema(BaseModel):
    success: bool = Field(...)
    action_type: AIActionType = Field(...)
    message: str = Field(...)
    data: Optional[Dict[str, Any]] = Field(default=None)


class ValidationConflictSchema(BaseModel):
    relative_id: int = Field(...)
    relative_name: str = Field(...)
    conflict_type: str = Field(...)
    conflicting_relationships: List[str] = Field(...)
    suggestion: str = Field(...)
