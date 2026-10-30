from app.utils import dates
from tests.conftest import add_expense


def test_monthly_report_totals_and_changes(client, auth):
    add_expense(client, auth, amount=100, category="Food", date="2025-12-20")
    add_expense(client, auth, amount=300, category="Food", date="2026-01-05")
    add_expense(client, auth, amount=50, category="Bills", date="2026-01-06")
    add_expense(client, auth, amount=175, category="Travel", date="2026-03-01")
    add_expense(client, auth, amount=9, currency="USD", date="2026-03-02")

    body = client.get("/reports/monthly?year=2026", headers=auth).json()

    assert len(body["months"]) == 12
    jan, feb, mar = body["months"][:3]
    assert (jan["month"], jan["total"], jan["expense_count"]) == ("2026-01", 350.0, 2)
    assert jan["change_pct"] == 250.0  # vs December of the previous year
    assert (jan["top_category"], jan["top_category_total"]) == ("Food", 300.0)
    assert feb["total"] == 0 and feb["top_category"] is None
    assert mar["total"] == 175.0 and mar["change_pct"] is None
    assert body["year_total"] == 525.0
    assert body["other_currencies"] == ["USD"]


def test_report_is_per_user(client, auth, other_auth):
    add_expense(client, other_auth, amount=999)
    year = int(dates.current_month()[:4])
    assert client.get(f"/reports/monthly?year={year}", headers=auth).json()["year_total"] == 0


def test_report_validates_year(client, auth):
    assert client.get("/reports/monthly?year=abc", headers=auth).status_code == 422
    assert client.get("/reports/monthly", headers=auth).status_code == 422
