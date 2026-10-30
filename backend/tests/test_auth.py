CREDS = {"email": "alice@example.com", "password": "password123"}
CREDS_MIXED = {**CREDS, "email": "Alice@Example.com"}


def test_register_login_and_me(client):
    res = client.post("/auth/register", json=CREDS_MIXED)
    assert res.status_code == 201

    res = client.post("/auth/login", json=CREDS)
    assert res.status_code == 200
    token = res.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"
    assert me.json()["default_currency"] == "INR"


def test_duplicate_email_conflicts(client, auth):
    res = client.post("/auth/register", json=CREDS)
    assert res.status_code == 409


def test_wrong_password_and_unknown_user_are_indistinguishable(client, auth):
    bad_pw = client.post("/auth/login", json={**CREDS, "password": "nope-nope"})
    unknown = client.post(
        "/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"}
    )
    assert bad_pw.status_code == unknown.status_code == 401
    assert bad_pw.json() == unknown.json()


def test_short_password_rejected(client):
    res = client.post("/auth/register", json={"email": "a@example.com", "password": "short"})
    assert res.status_code == 422


def test_passwords_are_hashed(client, engine, auth):
    from sqlalchemy import text

    with engine.connect() as conn:
        stored = conn.execute(text("select password_hash from users")).scalar_one()
    assert stored.startswith("$2") and "password123" not in stored


def test_protected_routes_require_token(client):
    for method, path in [
        ("get", "/expenses"),
        ("get", "/summary?month=2026-10"),
        ("post", "/expenses/parse"),
        ("post", "/assistant/chat"),
    ]:
        assert getattr(client, method)(path).status_code == 401
    bad = client.get("/expenses", headers={"Authorization": "Bearer garbage"})
    assert bad.status_code == 401


def test_cors_allows_frontend_origin(client):
    res = client.options(
        "/expenses",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert res.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_update_default_currency(client, auth):
    res = client.patch("/auth/me", json={"default_currency": "usd"}, headers=auth)
    assert res.status_code == 200 and res.json()["default_currency"] == "USD"
    assert client.get("/auth/me", headers=auth).json()["default_currency"] == "USD"
    assert client.get("/summary?month=2026-01", headers=auth).json()["currency"] == "USD"


def test_update_default_currency_validates(client, auth):
    for bad in ("US", "USDX", "12$", "ÄÖÜ"):
        res = client.patch("/auth/me", json={"default_currency": bad}, headers=auth)
        assert res.status_code == 422
    assert client.patch("/auth/me", json={"default_currency": "USD"}).status_code == 401
