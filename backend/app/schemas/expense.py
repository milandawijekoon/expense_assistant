import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_serializer,
    field_validator,
    model_validator,
)

from app.constants import Category

Amount = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


def _check_currency(v: str | None) -> str | None:
    if v is None:
        return v
    if len(v) != 3 or not v.isalpha():
        raise ValueError("Currency must be a 3-letter ISO code.")
    return v.upper()


class ParseRequest(BaseModel):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ParsedExpense(BaseModel):
    amount: Decimal
    currency: str
    category: Category
    merchant: str | None = None
    date: dt.date

    @field_serializer("amount")
    def _amount_as_number(self, v: Decimal) -> float:
        return float(v)


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    amount: Amount
    currency: str
    category: Category
    merchant: str | None = Field(default=None, max_length=120)
    date: dt.date
    description: str | None = Field(default=None, max_length=255)
    raw_text: str | None = Field(default=None, max_length=1000)

    _currency = field_validator("currency")(_check_currency)


class ExpenseUpdate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    amount: Amount | None = None
    currency: str | None = None
    category: Category | None = None
    merchant: str | None = Field(default=None, max_length=120)
    date: dt.date | None = None
    description: str | None = Field(default=None, max_length=255)

    _currency = field_validator("currency")(_check_currency)

    @model_validator(mode="after")
    def _required_fields_not_null(self) -> "ExpenseUpdate":
        for name in ("amount", "currency", "category", "date"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    currency: str
    category: Category
    merchant: str | None
    date: dt.date = Field(validation_alias="spent_on")
    description: str | None
    created_at: dt.datetime

    @field_serializer("amount")
    def _amount_as_number(self, v: Decimal) -> float:
        return float(v)


class ExpensePage(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int
