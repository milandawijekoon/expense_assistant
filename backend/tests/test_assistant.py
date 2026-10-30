import json

from app.utils import dates
from tests.conftest import add_expense


def _last_month_day() -> str:
    return dates.month_bounds(dates.previous_month(dates.current_month()))[0].isoformat()


def _facts_sent(fake_llm) -> dict:
    prompt = next(c for c in fake_llm.calls if c["kind"] == "text")["user"]
    return json.loads(prompt.split("FACTS:\n", 1)[1])


def test_compare_food_spending_with_budget_suggestion(client, auth, other_auth, fake_llm):
    add_expense(client, auth, amount=3000, category="Food", merchant="Barista")
    add_expense(client, auth, amount=2000, category="Food", date=_last_month_day())
    add_expense(client, auth, amount=500, category="Transport")
    add_expense(client, other_auth, amount=99999, category="Food", merchant="SecretShop")
    fake_llm.json_responses["classify_question"] = {
        "intent": "compare_months",
        "category": "Food",
        "month": None,
    }
    fake_llm.text_response = "Food is up 50%. Try a limit of 2100."

    res = client.post(
        "/assistant/chat",
        json={"message": "How much did I spend on food compared to last month?"},
        headers=auth,
    )

    assert res.status_code == 200
    assert res.json()["reply"] == "Food is up 50%. Try a limit of 2100."
    facts = _facts_sent(fake_llm)
    assert facts["current_total"] == 3000.0
    assert facts["previous_total"] == 2000.0
    assert facts["pct_change"] == 50.0
    assert facts["suggested_budget"] == 2100.0
    # Privacy: nothing from the other user, and no raw rows, ever reaches the LLM.
    sent = json.dumps(fake_llm.calls)
    assert "SecretShop" not in sent and "99999" not in sent and "Barista" not in sent


def test_no_budget_suggestion_when_spending_decreased(client, auth, fake_llm):
    add_expense(client, auth, amount=1000, category="Food")
    add_expense(client, auth, amount=2000, category="Food", date=_last_month_day())
    fake_llm.json_responses["classify_question"] = {
        "intent": "compare_months",
        "category": "Food",
        "month": None,
    }

    client.post("/assistant/chat", json={"message": "food vs last month?"}, headers=auth)

    facts = _facts_sent(fake_llm)
    assert facts["pct_change"] == -50.0
    assert facts["suggested_budget"] is None


def test_spending_total_and_breakdown(client, auth, fake_llm):
    add_expense(client, auth, amount=300, category="Food")
    add_expense(client, auth, amount=100, category="Transport")

    fake_llm.json_responses["classify_question"] = {
        "intent": "category_breakdown",
        "category": None,
        "month": None,
    }
    client.post("/assistant/chat", json={"message": "where does my money go?"}, headers=auth)
    facts = _facts_sent(fake_llm)
    assert facts["total"] == 400.0
    assert facts["categories"][0] == {"category": "Food", "total": 300.0, "share_pct": 75.0}


def test_unsupported_question_gets_help_without_second_llm_call(client, auth, fake_llm):
    fake_llm.json_responses["classify_question"] = {
        "intent": "unsupported",
        "category": None,
        "month": None,
    }
    res = client.post("/assistant/chat", json={"message": "write me a poem"}, headers=auth)
    assert res.status_code == 200
    assert "your own spending" in res.json()["reply"]
    assert [c["kind"] for c in fake_llm.calls] == ["classify_question"]


def test_falls_back_to_template_when_phrasing_fails(client, auth, fake_llm, monkeypatch):
    add_expense(client, auth, amount=300, category="Food")
    fake_llm.json_responses["classify_question"] = {
        "intent": "spending_total",
        "category": "Food",
        "month": None,
    }
    fake_llm.text_response = ""
    res = client.post("/assistant/chat", json={"message": "food total?"}, headers=auth)
    assert "300.00 INR" in res.json()["reply"]


def test_llm_failure_returns_502(client, auth, fake_llm):
    fake_llm.fail = True
    res = client.post("/assistant/chat", json={"message": "hi"}, headers=auth)
    assert res.status_code == 502
