from app.utils import dates


def _llm_result(**overrides):
    base = {
        "amount": 1800,
        "currency": "INR",
        "category": "Food",
        "merchant": "Barista",
        "date": dates.today().isoformat(),
    }
    base.update(overrides)
    return base


def test_parse_natural_language_expense(client, auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result()
    text = "Paid 1800 rupees for lunch at Barista today"

    res = client.post("/expenses/parse", json={"text": text}, headers=auth)

    assert res.status_code == 200
    assert res.json() == {
        "amount": 1800.0,
        "currency": "INR",
        "category": "Food",
        "merchant": "Barista",
        "date": dates.today().isoformat(),
    }
    call = fake_llm.calls[0]
    assert call["user"] == text
    assert dates.today().isoformat() in call["system"]


def test_parse_does_not_save_and_full_flow_saves(client, auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result()
    parsed = client.post("/expenses/parse", json={"text": "lunch 1800"}, headers=auth).json()
    assert client.get("/expenses", headers=auth).json()["total"] == 0

    saved = client.post("/expenses", json=parsed, headers=auth)
    assert saved.status_code == 201
    assert client.get("/expenses", headers=auth).json()["items"][0]["merchant"] == "Barista"


def test_unclear_message_returns_422_asking_for_details(client, auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result(
        amount=None, category=None, merchant=None, currency=None
    )

    res = client.post("/expenses/parse", json={"text": "Spent some money yesterday"}, headers=auth)

    assert res.status_code == 422
    detail = res.json()["detail"]
    assert detail["code"] == "missing_fields"
    assert detail["missing"] == ["amount", "category"]
    assert "amount" in detail["message"] and "category" in detail["message"]
    assert client.get("/expenses", headers=auth).json()["total"] == 0


def test_zero_or_negative_amount_is_treated_as_missing(client, auth, fake_llm):
    for bad in (0, -5, "abc"):
        fake_llm.json_responses["record_expense"] = _llm_result(amount=bad)
        res = client.post("/expenses/parse", json={"text": "lunch"}, headers=auth)
        assert res.status_code == 422, bad
        assert res.json()["detail"]["missing"] == ["amount"]


def test_missing_category_falls_back_to_other_when_amount_valid(client, auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result(category=None)
    res = client.post("/expenses/parse", json={"text": "paid 50"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["category"] == "Other"


def test_future_date_rejected(client, auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result(date="2099-01-01")
    res = client.post("/expenses/parse", json={"text": "lunch 100"}, headers=auth)
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_expense"


def test_llm_failure_returns_502(client, auth, fake_llm):
    fake_llm.fail = True
    res = client.post("/expenses/parse", json={"text": "lunch 100"}, headers=auth)
    assert res.status_code == 502
    assert res.json()["detail"]["code"] == "llm_error"


def test_only_the_message_reaches_the_llm(client, auth, other_auth, fake_llm):
    fake_llm.json_responses["record_expense"] = _llm_result()
    client.post("/expenses/parse", json={"text": "lunch 1800"}, headers=auth)
    sent = " ".join(c["system"] + c["user"] for c in fake_llm.calls)
    assert "alice@example.com" not in sent and "bob@example.com" not in sent


def test_empty_text_rejected(client, auth):
    assert client.post("/expenses/parse", json={"text": "   "}, headers=auth).status_code == 422


def test_rate_limit_on_llm_endpoints(client, auth, fake_llm):
    from app.config import get_settings
    from app.rate_limit import limiter

    settings = get_settings()
    fake_llm.json_responses["record_expense"] = _llm_result()
    original = settings.llm_rate_limit
    settings.llm_rate_limit = "2/minute"
    limiter.enabled = True
    limiter.reset()
    try:
        codes = [
            client.post("/expenses/parse", json={"text": "lunch 100"}, headers=auth).status_code
            for _ in range(3)
        ]
    finally:
        limiter.enabled = False
        settings.llm_rate_limit = original
    assert codes == [200, 200, 429]
