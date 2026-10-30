import pytest
from sqlalchemy.orm import Session

from app.errors import LLMNotConfigured
from app.llm.anthropic_client import AnthropicClient
from app.llm.openai_client import OpenAIClient
from app.models import LLMSettings, User
from app.services import llm_settings_service

KEY = "sk-test-1234567890abcd"


def _put(client, auth, **body):
    payload = {"provider": "openai", "model": "gpt-4o-mini", "api_key": KEY}
    payload.update(body)
    return client.put("/settings/llm", json=payload, headers=auth)


def test_defaults_come_from_server(client, auth):
    body = client.get("/settings/llm", headers=auth).json()
    assert body["source"] == "server"
    assert body["provider"] == "anthropic"


def test_save_never_returns_the_key(client, auth):
    res = _put(client, auth)
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "user" and body["has_api_key"] and body["configured"]
    assert body["api_key_hint"] == "…abcd"
    assert KEY not in res.text
    assert KEY not in client.get("/settings/llm", headers=auth).text


def test_key_is_encrypted_at_rest(client, auth, engine):
    _put(client, auth)
    with Session(engine) as db:
        stored = db.query(LLMSettings).one().api_key_encrypted
    assert stored and KEY not in stored


def test_omitting_key_keeps_it_and_switching_provider_drops_it(client, auth):
    _put(client, auth)
    kept = _put(client, auth, api_key=None, model="gpt-4o").json()
    assert kept["has_api_key"] and kept["model"] == "gpt-4o"
    switched = _put(client, auth, provider="anthropic", api_key=None, model="m").json()
    assert not switched["has_api_key"] and not switched["configured"]


def test_ollama_needs_no_key_and_validates_url(client, auth):
    res = _put(client, auth, provider="ollama", api_key=None, base_url="http://localhost:11434/v1/")
    assert res.json()["configured"] and res.json()["base_url"] == "http://localhost:11434/v1"
    assert _put(client, auth, base_url="ftp://nope").status_code == 422


def test_settings_are_per_user_and_reset(client, auth, other_auth):
    _put(client, auth)
    assert client.get("/settings/llm", headers=other_auth).json()["source"] == "server"
    body = client.delete("/settings/llm", headers=auth).json()
    assert body["source"] == "server"


def test_requires_auth(client):
    assert client.get("/settings/llm").status_code == 401


def test_test_endpoint_uses_the_llm(client, auth, fake_llm):
    assert client.post("/settings/llm/test", headers=auth).json() == {"ok": True}
    fake_llm.fail = True
    assert client.post("/settings/llm/test", headers=auth).status_code == 502


def test_client_is_built_from_the_users_settings(client, auth, engine):
    _put(client, auth)
    with Session(engine) as db:
        user = db.query(User).one()
        assert isinstance(llm_settings_service.get_client(db, user), OpenAIClient)
        client.put(
            "/settings/llm",
            json={"provider": "anthropic", "model": "m", "api_key": KEY},
            headers=auth,
        )
        db.expire_all()
        assert isinstance(llm_settings_service.get_client(db, user), AnthropicClient)


def test_saved_provider_without_key_is_not_configured(client, auth, engine):
    _put(client, auth, api_key=None)
    with Session(engine) as db:
        user = db.query(User).one()
        with pytest.raises(LLMNotConfigured):
            llm_settings_service.get_client(db, user)
