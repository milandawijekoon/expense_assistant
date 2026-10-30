from fastapi import APIRouter, Request

from app.deps import LLM, CurrentUser, DbSession
from app.rate_limit import limiter, llm_limit
from app.schemas.llm_settings import LLMSettingsIn, LLMSettingsOut, LLMTestResult
from app.services import llm_settings_service

router = APIRouter(prefix="/settings/llm", tags=["settings"])


@router.get("", response_model=LLMSettingsOut)
def get_llm_settings(user: CurrentUser, db: DbSession) -> LLMSettingsOut:
    return llm_settings_service.describe(db, user)


@router.put("", response_model=LLMSettingsOut)
def save_llm_settings(body: LLMSettingsIn, user: CurrentUser, db: DbSession) -> LLMSettingsOut:
    return llm_settings_service.save(db, user, body)


@router.delete("", response_model=LLMSettingsOut)
def reset_llm_settings(user: CurrentUser, db: DbSession) -> LLMSettingsOut:
    """Forget the saved settings and fall back to the server's defaults."""
    return llm_settings_service.reset(db, user)


@router.post("/test", response_model=LLMTestResult)
@limiter.limit(llm_limit)
def test_llm_settings(request: Request, user: CurrentUser, llm: LLM) -> LLMTestResult:
    llm.complete_text(system="Reply with the single word: OK", user="ping")
    return LLMTestResult()
