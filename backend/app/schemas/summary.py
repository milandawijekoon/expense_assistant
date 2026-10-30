from pydantic import BaseModel


class CategoryBreakdown(BaseModel):
    category: str
    total: float
    share_pct: float
    count: int
    previous_total: float
    change_pct: float | None


class CurrencyTotal(BaseModel):
    currency: str
    total: float


class SummaryOut(BaseModel):
    month: str
    previous_month: str
    currency: str
    total: float
    previous_total: float
    change_pct: float | None
    expense_count: int
    categories: list[CategoryBreakdown]
    other_currencies: list[CurrencyTotal]
