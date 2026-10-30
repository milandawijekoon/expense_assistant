import pytest

from app.config import get_settings
from app.deps import get_llm
from app.main import app
from app.rate_limit import limiter


@pytest.fixture
def limits_on():
    settings = get_settings()
    original = settings.auth_rate_limit
    settings.auth_rate_limit = "3/minute"
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()
    settings.auth_rate_limit = original


def test_login_is_rate_limited(client, auth, limits_on):
    creds = {"email": "alice@example.com", "password": "wrong-password"}
    codes = [client.post("/auth/login", json=creds).status_code for _ in range(4)]
    assert codes == [401, 401, 401, 429]


def test_unexpected_error_returns_json_with_cors_headers(client, auth):
    def boom():
        raise RuntimeError("db exploded")

    app.dependency_overrides[get_llm] = boom
    unsafe = client.__class__(app, raise_server_exceptions=False)
    res = unsafe.post(
        "/expenses/parse",
        json={"text": "lunch 100"},
        headers={**auth, "Origin": "http://localhost:3000"},
    )
    assert res.status_code == 500
    assert res.json()["detail"]["code"] == "internal_error"
    assert "db exploded" not in res.text
    assert res.headers["access-control-allow-origin"] == "http://localhost:3000"
