import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Expense, User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.utils import dates


def create_expense(db: Session, user: User, data: ExpenseCreate) -> Expense:
    expense = Expense(
        user_id=user.id,
        amount=data.amount,
        currency=data.currency,
        category=data.category,
        merchant=data.merchant,
        spent_on=data.date,
        description=data.description,
        raw_text=data.raw_text,
    )
    db.add(expense)
    db.commit()
    return expense


def list_expenses(
    db: Session,
    user: User,
    *,
    month: str | None,
    category: str | None,
    page: int,
    page_size: int,
) -> tuple[list[Expense], int]:
    stmt = select(Expense).where(Expense.user_id == user.id)
    if month:
        start, end = dates.month_bounds(month)
        stmt = stmt.where(Expense.spent_on >= start, Expense.spent_on < end)
    if category:
        stmt = stmt.where(Expense.category == category)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.order_by(Expense.spent_on.desc(), Expense.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(items), total


def get_owned(db: Session, user: User, expense_id: uuid.UUID) -> Expense:
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id)
    )
    if expense is None:
        raise NotFoundError("Expense not found.")
    return expense


def update_expense(db: Session, expense: Expense, data: ExpenseUpdate) -> Expense:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, "spent_on" if field == "date" else field, value)
    db.commit()
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()
