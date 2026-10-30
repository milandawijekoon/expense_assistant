from functools import lru_cache

from app.config import get_settings
from app.errors import LLMNotConfigured
from app.llm.base import LLMClient


@lru_cache
def get_llm_client() -> LLMClient:
    settings = get_settings()
    if settings.llm_provider == "ollama":
        from app.llm.openai_client import OpenAIClient

        # Ollama ignores the key, but the SDK requires a non-empty one.
        return OpenAIClient(
            "ollama",
            settings.ollama_model,
            settings.llm_timeout_seconds,
            base_url=settings.ollama_base_url,
        )

    if settings.llm_provider == "openai":
        key = settings.openai_api_key.get_secret_value()
        if not key:
            raise LLMNotConfigured()
        from app.llm.openai_client import OpenAIClient

        return OpenAIClient(key, settings.openai_model, settings.llm_timeout_seconds)

    key = settings.anthropic_api_key.get_secret_value()
    if not key:
        raise LLMNotConfigured()
    from app.llm.anthropic_client import AnthropicClient

    return AnthropicClient(key, settings.anthropic_model, settings.llm_timeout_seconds)
