import pytest

from app.config import get_settings
from app.errors import LLMNotConfigured
from app.llm.factory import get_llm_client
from app.llm.openai_client import OpenAIClient


@pytest.fixture
def provider():
    settings = get_settings()
    saved = settings.model_copy()
    get_llm_client.cache_clear()
    yield settings
    for name in ("llm_provider", "openai_api_key", "ollama_base_url", "ollama_model"):
        setattr(settings, name, getattr(saved, name))
    get_llm_client.cache_clear()


def test_ollama_provider_needs_no_api_key(provider):
    provider.llm_provider = "ollama"
    provider.ollama_base_url = "http://localhost:11434/v1"
    provider.ollama_model = "qwen2.5:3b"

    client = get_llm_client()

    assert isinstance(client, OpenAIClient)
    assert str(client._client.base_url).startswith("http://localhost:11434/v1")
    assert client._model == "qwen2.5:3b"


def test_openai_without_key_is_not_configured(provider):
    from pydantic import SecretStr

    provider.llm_provider = "openai"
    provider.openai_api_key = SecretStr("")
    with pytest.raises(LLMNotConfigured):
        get_llm_client()
