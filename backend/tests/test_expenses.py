from app.utils import dates
from tests.conftest import add_expense


def _last_month_day() -> str:
    return dates.month_bounds(dates.previous_month(dates.current_month()))[0].isoformat()


def test_create_and_list_newest_first(client, auth):
    add_expense(client, auth, merchant="Old", date=_last_month_day())
    add_expense(client, auth, merchant="New")

    page = client.get("/expenses", headers=auth).json()

    assert page["total"] == 2
    assert [e["merchant"] for e in page["items"]] == ["New", "Old"]


def test_filter_by_month_and_category(client, auth):
    add_expense(client, auth, category="Food")
    add_expense(client, auth, category="Transport")
    add_expense(client, auth, category="Food", date=_last_month_day())

    month = dates.current_month()
    both = client.get(f"/expenses?month={month}&category=Food", headers=auth).json()
    assert both["total"] == 1
    assert client.get(f"/expenses?month={month}", headers=auth).json()["total"] == 2
    assert client.get("/expenses?category=Food", headers=auth).json()["total"] == 2


def test_invalid_filters_rejected(client, auth):
    assert client.get("/expenses?month=2026-13", headers=auth).status_code == 422
    assert client.get("/expenses?category=Nope", headers=auth).status_code == 422


def test_pagination(client, auth):
    for i in range(5):
        add_expense(client, auth, merchant=f"M{i}")
    first = client.get("/expenses?page=1&page_size=2", headers=auth).json()
    last = client.get("/expenses?page=3&page_size=2", headers=auth).json()
    assert first["total"] == 5 and len(first["items"]) == 2
    assert len(last["items"]) == 1


def test_edit_category(client, auth):
    expense = add_expense(client, auth, category="Food")
    res = client.patch(f"/expenses/{expense['id']}", json={"category": "Shopping"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["category"] == "Shopping"
    assert client.get("/expenses?category=Shopping", headers=auth).json()["total"] == 1
    assert client.get("/expenses?category=Food", headers=auth).json()["total"] == 0


def test_patch_validates(client, auth):
    expense = add_expense(client, auth)
    url = f"/expenses/{expense['id']}"
    assert client.patch(url, json={"amount": -1}, headers=auth).status_code == 422
    assert client.patch(url, json={"category": "Bogus"}, headers=auth).status_code == 422
    assert client.patch(url, json={"category": None}, headers=auth).status_code == 422


def test_delete(client, auth):
    expense = add_expense(client, auth)
    assert client.delete(f"/expenses/{expense['id']}", headers=auth).status_code == 204
    assert client.get("/expenses", headers=auth).json()["total"] == 0
    assert client.delete(f"/expenses/{expense['id']}", headers=auth).status_code == 404


def test_users_cannot_see_or_change_each_others_expenses(client, auth, other_auth):
    expense = add_expense(client, auth, merchant="Private")

    assert client.get("/expenses", headers=other_auth).json()["total"] == 0
    url = f"/expenses/{expense['id']}"
    assert client.patch(url, json={"category": "Other"}, headers=other_auth).status_code == 404
    assert client.delete(url, headers=other_auth).status_code == 404
    assert client.get("/expenses", headers=auth).json()["total"] == 1


def test_create_rejects_bad_amount(client, auth):
    body = {"amount": 0, "currency": "INR", "category": "Food", "date": dates.today().isoformat()}
    assert client.post("/expenses", json=body, headers=auth).status_code == 422
