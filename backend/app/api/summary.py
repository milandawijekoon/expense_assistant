from fastapi import APIRouter

from app.deps import CurrentUser, DbSession, MonthParam
from app.schemas.summary import SummaryOut
from app.services import summary_service

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=SummaryOut)
def summary(month: MonthParam, user: CurrentUser, db: DbSession) -> SummaryOut:
    return summary_service.build_summary(db, user, month)
