from app.utils import dates
from tests.conftest import add_expense


def _last_month_day() -> str:
    return dates.month_bounds(dates.previous_month(dates.current_month()))[0].isoformat()


def test_monthly_summary_with_comparison(client, auth):
    add_expense(client, auth, amount=1800, category="Food")
    add_expense(client, auth, amount=200, category="Transport")
    add_expense(client, auth, amount=1000, category="Food", date=_last_month_day())
    add_expense(client, auth, amount=10, currency="USD", category="Food")

    res = client.get(f"/summary?month={dates.current_month()}", headers=auth)

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2000.0
    assert body["previous_total"] == 1000.0
    assert body["change_pct"] == 100.0
    assert body["currency"] == "INR"
    assert body["expense_count"] == 2
    food, transport = body["categories"]
    assert (food["category"], food["total"], food["share_pct"]) == ("Food", 1800.0, 90.0)
    assert food["previous_total"] == 1000.0 and food["change_pct"] == 80.0
    assert transport["change_pct"] is None
    assert body["other_currencies"] == [{"currency": "USD", "total": 10.0}]


def test_empty_month(client, auth):
    body = client.get("/summary?month=2020-01", headers=auth).json()
    assert body["total"] == 0 and body["categories"] == [] and body["change_pct"] is None


def test_summary_is_per_user(client, auth, other_auth):
    add_expense(client, other_auth, amount=999)
    body = client.get(f"/summary?month={dates.current_month()}", headers=auth).json()
    assert body["total"] == 0


def test_summary_requires_valid_month(client, auth):
    assert client.get("/summary", headers=auth).status_code == 422
    assert client.get("/summary?month=oct", headers=auth).status_code == 422
