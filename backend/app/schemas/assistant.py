from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: Text


class ChatRequest(BaseModel):
    message: Text
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)


class ChatResponse(BaseModel):
    reply: str
