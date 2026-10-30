from fastapi import APIRouter, Request

from app.deps import LLM, CurrentUser, DbSession
from app.rate_limit import limiter, llm_limit
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services import assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(llm_limit)
def chat(
    request: Request, body: ChatRequest, user: CurrentUser, db: DbSession, llm: LLM
) -> ChatResponse:
    reply = assistant_service.answer(db, llm, user, body.message, body.history)
    return ChatResponse(reply=reply)
