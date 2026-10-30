import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, Response

from app.constants import Category
from app.deps import LLM, CurrentUser, DbSession, MonthParam
from app.rate_limit import limiter, llm_limit
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseOut,
    ExpensePage,
    ExpenseUpdate,
    ParsedExpense,
    ParseRequest,
)
from app.services import expense_service, parse_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/parse", response_model=ParsedExpense)
@limiter.limit(llm_limit)
def parse(request: Request, body: ParseRequest, user: CurrentUser, llm: LLM) -> ParsedExpense:
    return parse_service.parse_expense(llm, body.text, user.default_currency)


@router.post("", response_model=ExpenseOut, status_code=201)
def create(body: ExpenseCreate, user: CurrentUser, db: DbSession) -> ExpenseOut:
    return ExpenseOut.model_validate(expense_service.create_expense(db, user, body))


@router.get("", response_model=ExpensePage)
def list_expenses(
    user: CurrentUser,
    db: DbSession,
    month: MonthParam | None = None,
    category: Category | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ExpensePage:
    items, total = expense_service.list_expenses(
        db,
        user,
        month=month,
        category=category.value if category else None,
        page=page,
        page_size=page_size,
    )
    return ExpensePage(
        items=[ExpenseOut.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update(
    expense_id: uuid.UUID, body: ExpenseUpdate, user: CurrentUser, db: DbSession
) -> ExpenseOut:
    expense = expense_service.get_owned(db, user, expense_id)
    return ExpenseOut.model_validate(expense_service.update_expense(db, expense, body))


@router.delete("/{expense_id}", status_code=204)
def delete(expense_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    expense_service.delete_expense(db, expense_service.get_owned(db, user, expense_id))
    return Response(status_code=204)
