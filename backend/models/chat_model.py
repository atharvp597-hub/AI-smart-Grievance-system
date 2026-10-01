from typing import Literal

from pydantic import BaseModel, Field, constr


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"] = Field(..., description="Conversation role")
    content: constr(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: constr(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    model: str
