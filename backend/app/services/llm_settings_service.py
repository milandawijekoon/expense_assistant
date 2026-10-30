from sqlalchemy.orm import Session

from app import crypto
from app.config import get_settings
from app.llm.base import LLMClient
from app.llm.factory import LLMConfig, build_llm_client, server_llm_config
from app.models import LLMSettings, User
from app.schemas.llm_settings import LLMSettingsIn, LLMSettingsOut

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5-5",
    "openai": "gpt-4o-mini",
    "ollama": "qwen2.5:3b",
}


def _stored_key(row: LLMSettings | None) -> str:
    return (crypto.decrypt(row.api_key_encrypted) or "") if row and row.api_key_encrypted else ""


def resolve_config(db: Session, user: User) -> tuple[LLMConfig, str]:
    """The user's saved settings if any, otherwise the server's. Returns (config, source)."""
    row = db.get(LLMSettings, user.id)
    if row is None:
        return server_llm_config(), "server"
    base_url = row.base_url
    if row.provider == "ollama" and not base_url:
        base_url = get_settings().ollama_base_url
    return LLMConfig(row.provider, row.model, _stored_key(row), base_url), "user"


def get_client(db: Session, user: User) -> LLMClient:
    return build_llm_client(resolve_config(db, user)[0])


def describe(db: Session, user: User) -> LLMSettingsOut:
    config, source = resolve_config(db, user)
    return LLMSettingsOut(
        provider=config.provider,  # type: ignore[arg-type]
        model=config.model,
        base_url=config.base_url if config.provider != "anthropic" else None,
        has_api_key=bool(config.api_key),
        api_key_hint=f"…{config.api_key[-4:]}" if len(config.api_key) >= 8 else None,
        configured=config.provider == "ollama" or bool(config.api_key),
        source=source,  # type: ignore[arg-type]
    )


def save(db: Session, user: User, body: LLMSettingsIn) -> LLMSettingsOut:
    row = db.get(LLMSettings, user.id)
    if row is None:
        row = LLMSettings(user_id=user.id, provider=body.provider, model=body.model)
        db.add(row)

    # A key belongs to one provider: switching provider without a new key drops the old one.
    if body.api_key:
        row.api_key_encrypted = crypto.encrypt(body.api_key)
    elif row.provider != body.provider:
        row.api_key_encrypted = None

    row.provider = body.provider
    row.model = body.model
    row.base_url = None if body.provider == "anthropic" else body.base_url
    db.commit()
    return describe(db, user)


def reset(db: Session, user: User) -> LLMSettingsOut:
    row = db.get(LLMSettings, user.id)
    if row is not None:
        db.delete(row)
        db.commit()
    return describe(db, user)
