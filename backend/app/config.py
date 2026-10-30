from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://expense:expense@localhost:5432/expense"

    jwt_secret: SecretStr = SecretStr("change-me-change-me-change-me-1234")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Comma-separated list of allowed browser origins.
    frontend_origin: str = "http://localhost:3000"

    llm_provider: Literal["anthropic", "openai", "ollama"] = "anthropic"
    anthropic_api_key: SecretStr = SecretStr("")
    anthropic_model: str = "claude-sonnet-5-5"
    openai_api_key: SecretStr = SecretStr("")
    openai_model: str = "gpt-4o-mini"
    # Local models through Ollama's OpenAI-compatible API (no API key, runs on your machine).
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "qwen2.5:3b"
    llm_timeout_seconds: float = 30.0

    rate_limit_enabled: bool = True
    llm_rate_limit: str = "20/minute"
    # Per client IP on login/register, to slow password guessing.
    auth_rate_limit: str = "10/minute"

    default_currency: str = "INR"
    log_level: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]

    def secret_values(self) -> list[str]:
        values = [self.jwt_secret, self.anthropic_api_key, self.openai_api_key]
        return [v.get_secret_value() for v in values if len(v.get_secret_value()) >= 8]


@lru_cache
def get_settings() -> Settings:
    return Settings()
