from dataclasses import dataclass
from functools import lru_cache

from app.config import get_settings
from app.errors import LLMNotConfigured
from app.llm.base import LLMClient


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    model: str
    api_key: str = ""
    base_url: str | None = None


def build_llm_client(config: LLMConfig) -> LLMClient:
    timeout = get_settings().llm_timeout_seconds

    if config.provider == "ollama":
        from app.llm.openai_client import OpenAIClient

        # Ollama ignores the key, but the SDK requires a non-empty one.
        return OpenAIClient(config.api_key or "ollama", config.model, timeout, config.base_url)

    if not config.api_key:
        raise LLMNotConfigured("No API key is set. Add one under Settings.")

    if config.provider == "openai":
        from app.llm.openai_client import OpenAIClient

        return OpenAIClient(config.api_key, config.model, timeout, config.base_url)

    from app.llm.anthropic_client import AnthropicClient

    return AnthropicClient(config.api_key, config.model, timeout)


def server_llm_config() -> LLMConfig:
    """The provider configured through environment variables (the fallback)."""
    s = get_settings()
    if s.llm_provider == "ollama":
        return LLMConfig("ollama", s.ollama_model, base_url=s.ollama_base_url)
    if s.llm_provider == "openai":
        return LLMConfig("openai", s.openai_model, s.openai_api_key.get_secret_value())
    return LLMConfig("anthropic", s.anthropic_model, s.anthropic_api_key.get_secret_value())


@lru_cache
def get_llm_client() -> LLMClient:
    return build_llm_client(server_llm_config())
