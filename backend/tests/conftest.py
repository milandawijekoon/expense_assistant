import os

# Must be set before the app (and its settings) are imported.
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.update(
    {
        "DATABASE_URL": TEST_DB_URL,
        "JWT_SECRET": "test-secret-test-secret-test-secret-123",
        "RATE_LIMIT_ENABLED": "false",
        "ANTHROPIC_API_KEY": "sk-ant-test-not-a-real-key",
        "FRONTEND_ORIGIN": "http://localhost:3000",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.deps import get_llm  # noqa: E402
from app.errors import LLMError  # noqa: E402
from app.main import app  # noqa: E402


class FakeLLM:
    """Stands in for the real provider: no network, fully scripted."""

    def __init__(self) -> None:
        self.json_responses: dict[str, dict] = {}
        self.text_response = "fake reply"
        self.fail = False
        self.calls: list[dict] = []

    def complete_json(self, *, system, user, schema, name):
        self.calls.append({"kind": name, "system": system, "user": user})
        if self.fail:
            raise LLMError()
        return self.json_responses[name]

    def complete_text(self, *, system, user):
        self.calls.append({"kind": "text", "system": system, "user": user})
        if self.fail:
            raise LLMError()
        return self.text_response


@pytest.fixture
def engine():
    kwargs = {}
    if TEST_DB_URL.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    eng = create_engine(TEST_DB_URL, **kwargs)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def fake_llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def client(engine, fake_llm):
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_llm] = lambda: fake_llm
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register(client: TestClient, email: str) -> dict[str, str]:
    res = client.post("/auth/register", json={"email": email, "password": "password123"})
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def register():
    return _register


@pytest.fixture
def auth(client) -> dict[str, str]:
    return _register(client, "alice@example.com")


@pytest.fixture
def other_auth(client) -> dict[str, str]:
    return _register(client, "bob@example.com")


def add_expense(client, headers, **overrides):
    from app.utils import dates

    body = {
        "amount": 100,
        "currency": "INR",
        "category": "Food",
        "merchant": "Cafe",
        "date": dates.today().isoformat(),
    }
    body.update(overrides)
    res = client.post("/expenses", json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()
