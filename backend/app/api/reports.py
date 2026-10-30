from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUser, DbSession
from app.schemas.reports import MonthlyReport
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/monthly", response_model=MonthlyReport)
def monthly(
    user: CurrentUser, db: DbSession, year: Annotated[int, Query(ge=1900, le=2100)]
) -> MonthlyReport:
    return report_service.monthly_report(db, user, year)
