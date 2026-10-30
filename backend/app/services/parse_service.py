import datetime as dt
import logging
from decimal import Decimal, InvalidOperation

from app.constants import CATEGORY_VALUES, Category
from app.errors import InvalidExpenseError, MissingFieldsError
from app.llm.base import LLMClient
from app.llm.prompts import PARSE_SCHEMA, parse_system_prompt
from app.schemas.expense import ParsedExpense
from app.utils import dates

logger = logging.getLogger(__name__)

MAX_AMOUNT = Decimal("9999999999.99")


def _to_amount(value: object) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None
    return amount if 0 < amount <= MAX_AMOUNT else None


def _to_date(value: object, today: dt.date) -> dt.date:
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            pass
    return today


def parse_expense(llm: LLMClient, text: str, default_currency: str) -> ParsedExpense:
    """Extract and validate one expense. Only the user's own text reaches the LLM."""
    today = dates.today()
    raw = llm.complete_json(
        system=parse_system_prompt(today, default_currency),
        user=text,
        schema=PARSE_SCHEMA,
        name="record_expense",
    )

    category = raw.get("category")
    category_ok = category in CATEGORY_VALUES

    amount = _to_amount(raw.get("amount"))
    if amount is None:
        raise MissingFieldsError(["amount"] + ([] if category_ok else ["category"]))

    spent_on = _to_date(raw.get("date"), today)
    if spent_on > today + dt.timedelta(days=1):
        raise InvalidExpenseError(
            "That date is in the future. Please tell me when you actually spent the money."
        )

    currency = raw.get("currency")
    if not (isinstance(currency, str) and len(currency) == 3 and currency.isalpha()):
        currency = default_currency

    merchant = raw.get("merchant")
    merchant = merchant.strip()[:120] if isinstance(merchant, str) and merchant.strip() else None

    return ParsedExpense(
        amount=amount,
        currency=currency.upper(),
        category=Category(category) if category_ok else Category.OTHER,
        merchant=merchant,
        date=spent_on,
    )
