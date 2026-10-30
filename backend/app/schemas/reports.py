from pydantic import BaseModel


class MonthlyRow(BaseModel):
    month: str
    total: float
    expense_count: int
    change_pct: float | None
    top_category: str | None
    top_category_total: float


class MonthlyReport(BaseModel):
    year: int
    currency: str
    year_total: float
    average_per_month: float
    months: list[MonthlyRow]
    other_currencies: list[str]
