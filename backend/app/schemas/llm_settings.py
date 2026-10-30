from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, StringConstraints, field_validator

Provider = Literal["anthropic", "openai", "ollama"]


class LLMSettingsIn(BaseModel):
    provider: Provider
    model: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    # None keeps the stored key; an empty string is rejected so a key is never cleared by accident.
    api_key: (
        Annotated[
            str,
            StringConstraints(strip_whitespace=True, min_length=8, max_length=500),
        ]
        | None
    ) = None
    base_url: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)] | None
    ) = Field(
        default=None,
        description="OpenAI-compatible endpoint (Ollama, OpenAI-compatible proxies).",
    )

    @field_validator("base_url")
    @classmethod
    def _http_url(cls, v: str | None) -> str | None:
        if not v:
            return None
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Base URL must start with http:// or https://")
        return v.rstrip("/")


class LLMSettingsOut(BaseModel):
    provider: Provider
    model: str
    base_url: str | None
    has_api_key: bool
    api_key_hint: str | None
    configured: bool
    # "user" = saved in the app, "server" = from server environment variables.
    source: Literal["user", "server"]


class LLMTestResult(BaseModel):
    ok: bool = True
