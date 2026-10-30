import datetime as dt

from sqlalchemy.orm import Session

from app.models import User
from app.schemas.reports import MonthlyReport, MonthlyRow
from app.services import analytics


def monthly_report(db: Session, user: User, year: int) -> MonthlyReport:
    """Per-month totals for a calendar year, in the user's default currency.

    December of the previous year is loaded too so January can show a change vs. last month.
    """
    frame = analytics.load_frame(db, user.id, dt.date(year - 1, 12, 1), dt.date(year + 1, 1, 1))
    other = sorted({str(c) for c in frame["currency"] if c != user.default_currency})
    frame = frame[frame["currency"] == user.default_currency].copy()
    frame["month"] = frame["spent_on"].map(lambda d: d.strftime("%Y-%m"))

    totals = frame.groupby("month")["amount"].sum().to_dict()
    counts = frame.groupby("month").size().to_dict()
    by_cat = frame.groupby(["month", "category"])["amount"].sum()

    today = dt.date.today()
    rows: list[MonthlyRow] = []
    previous = round(float(totals.get(f"{year - 1}-12", 0.0)), 2)
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        total = round(float(totals.get(key, 0.0)), 2)
        top, top_total = None, 0.0
        if key in counts:
            cats = by_cat.loc[key].sort_values(ascending=False)
            top, top_total = str(cats.index[0]), round(float(cats.iloc[0]), 2)
        rows.append(
            MonthlyRow(
                month=key,
                total=total,
                expense_count=int(counts.get(key, 0)),
                change_pct=analytics.pct_change(total, previous),
                top_category=top,
                top_category_total=top_total,
            )
        )
        previous = total

    year_total = round(sum(r.total for r in rows), 2)
    # Average over months elapsed so far in the current year, otherwise over all twelve.
    elapsed = today.month if year == today.year else 12 if year < today.year else 0
    return MonthlyReport(
        year=year,
        currency=user.default_currency,
        year_total=year_total,
        average_per_month=round(year_total / elapsed, 2) if elapsed else 0.0,
        months=rows,
        other_currencies=other,
    )
