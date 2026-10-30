import re
from datetime import date

MONTH_PATTERN = r"^(19|20)\d{2}-(0[1-9]|1[0-2])$"
_MONTH_RE = re.compile(MONTH_PATTERN)


def today() -> date:
    return date.today()


def current_month() -> str:
    return today().strftime("%Y-%m")


def is_valid_month(value: object) -> bool:
    return isinstance(value, str) and bool(_MONTH_RE.match(value))


def month_bounds(month: str) -> tuple[date, date]:
    """First day of the month (inclusive) and first day of the next month (exclusive)."""
    year, mon = (int(p) for p in month.split("-"))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


def previous_month(month: str) -> str:
    year, mon = (int(p) for p in month.split("-"))
    return f"{year - 1}-12" if mon == 1 else f"{year}-{mon - 1:02d}"
