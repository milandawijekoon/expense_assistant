"""pandas helpers shared by the summary endpoint and the assistant."""

import uuid
from datetime import date

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Expense

COLUMNS = ["spent_on", "category", "currency", "amount"]


def load_frame(db: Session, user_id: uuid.UUID, start: date, end: date) -> pd.DataFrame:
    """The user's expenses in [start, end). Always filtered by user_id."""
    rows = db.execute(
        select(Expense.spent_on, Expense.category, Expense.currency, Expense.amount).where(
            Expense.user_id == user_id, Expense.spent_on >= start, Expense.spent_on < end
        )
    ).all()
    df = pd.DataFrame([tuple(r) for r in rows], columns=COLUMNS)
    df["amount"] = df["amount"].astype(float)
    return df


def split_at(df: pd.DataFrame, boundary: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    """(on/after boundary, before boundary)."""
    mask = df["spent_on"] >= boundary
    return df[mask], df[~mask]


def total(df: pd.DataFrame, category: str | None = None) -> float:
    if category:
        df = df[df["category"] == category]
    return round(float(df["amount"].sum()), 2)


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def suggest_budget(previous_total: float) -> float | None:
    """A limit slightly above last month's spend, offered when spending rose."""
    return round(previous_total * 1.05, 2) if previous_total > 0 else None
