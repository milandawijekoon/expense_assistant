from sqlalchemy.orm import Session

from app.models import User
from app.schemas.summary import CategoryBreakdown, CurrencyTotal, SummaryOut
from app.services import analytics
from app.utils import dates


def build_summary(db: Session, user: User, month: str) -> SummaryOut:
    start, end = dates.month_bounds(month)
    prev_month = dates.previous_month(month)
    prev_start, _ = dates.month_bounds(prev_month)

    frame = analytics.load_frame(db, user.id, prev_start, end)
    current_all, previous_all = analytics.split_at(frame, start)

    # Totals are reported in the user's default currency; other currencies are listed
    # separately instead of being silently converted or mixed in.
    cur = current_all[current_all["currency"] == user.default_currency]
    prev = previous_all[previous_all["currency"] == user.default_currency]

    total = analytics.total(cur)
    previous_total = analytics.total(prev)

    cur_by_cat = cur.groupby("category")["amount"].agg(total="sum", count="size")
    prev_by_cat = prev.groupby("category")["amount"].sum()

    categories = []
    for category, row in cur_by_cat.sort_values("total", ascending=False).iterrows():
        cat_total = round(float(row["total"]), 2)
        cat_prev = round(float(prev_by_cat.get(category, 0.0)), 2)
        categories.append(
            CategoryBreakdown(
                category=str(category),
                total=cat_total,
                share_pct=round(cat_total / total * 100, 1) if total else 0.0,
                count=int(row["count"]),
                previous_total=cat_prev,
                change_pct=analytics.pct_change(cat_total, cat_prev),
            )
        )

    others = current_all[current_all["currency"] != user.default_currency]
    other_currencies = [
        CurrencyTotal(currency=str(cur_code), total=round(float(amt), 2))
        for cur_code, amt in others.groupby("currency")["amount"].sum().items()
    ]

    return SummaryOut(
        month=month,
        previous_month=prev_month,
        currency=user.default_currency,
        total=total,
        previous_total=previous_total,
        change_pct=analytics.pct_change(total, previous_total),
        expense_count=len(cur),
        categories=categories,
        other_currencies=other_currencies,
    )
