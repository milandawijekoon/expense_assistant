from enum import StrEnum


class Category(StrEnum):
    FOOD = "Food"
    GROCERIES = "Groceries"
    TRANSPORT = "Transport"
    SHOPPING = "Shopping"
    BILLS = "Bills"
    ENTERTAINMENT = "Entertainment"
    HEALTH = "Health"
    TRAVEL = "Travel"
    OTHER = "Other"


CATEGORY_VALUES: list[str] = [c.value for c in Category]
