"""Spending Q&A.

The LLM never sees the database. Step 1 turns the question into a small structured intent,
step 2 computes the numbers with pandas for the authenticated user only, and step 3 asks the
LLM to word the reply from those computed facts. Percentages are calculated in code.
"""

import logging

from sqlalchemy.orm import Session

from app.constants import CATEGORY_VALUES
from app.errors import LLMError
from app.llm.base import LLMClient
from app.llm.prompts import (
    INTENT_SCHEMA,
    PHRASE_SYSTEM_PROMPT,
    intent_system_prompt,
    phrase_user_prompt,
)
from app.models import User
from app.schemas.assistant import ChatTurn
from app.services import analytics
from app.utils import dates

logger = logging.getLogger(__name__)

INTENTS = {"compare_months", "spending_total", "category_breakdown"}
UNSUPPORTED_REPLY = (
    "I can answer questions about your own spending: totals for a month or category, "
    "a category breakdown, or how a month compares with the previous one. "
    "Try: \"How much did I spend on food compared to last month?\""
)


def answer(db: Session, llm: LLMClient, user: User, message: str, history: list[ChatTurn]) -> str:
    intent = _classify(llm, message, history)
    facts = _compute_facts(db, user, intent)
    if facts is None:
        return UNSUPPORTED_REPLY
    try:
        reply = llm.complete_text(
            system=PHRASE_SYSTEM_PROMPT, user=phrase_user_prompt(message, facts)
        )
    except LLMError:
        logger.warning("Phrasing step failed; using template reply")
        reply = ""
    return reply or _template_reply(facts)


def _classify(llm: LLMClient, message: str, history: list[ChatTurn]) -> dict:
    lines = [f"{turn.role}: {turn.content}" for turn in history[-6:]]
    prompt = "\n".join([*lines, f"user: {message}"]) if lines else message
    raw = llm.complete_json(
        system=intent_system_prompt(dates.today()),
        user=prompt,
        schema=INTENT_SCHEMA,
        name="classify_question",
    )
    kind = raw.get("intent") if raw.get("intent") in INTENTS else None
    category = raw.get("category") if raw.get("category") in CATEGORY_VALUES else None
    month = raw.get("month") if dates.is_valid_month(raw.get("month")) else None
    return {"intent": kind, "category": category, "month": month or dates.current_month()}


def _compute_facts(db: Session, user: User, intent: dict) -> dict | None:
    kind, category, month = intent["intent"], intent["category"], intent["month"]
    if kind is None:
        return None

    start, end = dates.month_bounds(month)
    prev_month = dates.previous_month(month)
    prev_start, _ = dates.month_bounds(prev_month)

    frame = analytics.load_frame(db, user.id, prev_start, end)
    frame = frame[frame["currency"] == user.default_currency]
    cur, prev = analytics.split_at(frame, start)
    label = category or "all categories"

    if kind == "compare_months":
        current_total = analytics.total(cur, category)
        previous_total = analytics.total(prev, category)
        pct = analytics.pct_change(current_total, previous_total)
        increased = current_total > previous_total
        return {
            "type": "compare_months",
            "currency": user.default_currency,
            "category": label,
            "month": month,
            "previous_month": prev_month,
            "current_total": current_total,
            "previous_total": previous_total,
            "pct_change": pct,
            "suggested_budget": analytics.suggest_budget(previous_total) if increased else None,
        }

    if kind == "spending_total":
        subset = cur[cur["category"] == category] if category else cur
        return {
            "type": "spending_total",
            "currency": user.default_currency,
            "category": label,
            "month": month,
            "total": analytics.total(cur, category),
            "expense_count": len(subset),
        }

    grand_total = analytics.total(cur)
    by_cat = cur.groupby("category")["amount"].sum().sort_values(ascending=False).head(8)
    return {
        "type": "category_breakdown",
        "currency": user.default_currency,
        "month": month,
        "total": grand_total,
        "categories": [
            {
                "category": str(name),
                "total": round(float(amt), 2),
                "share_pct": round(float(amt) / grand_total * 100, 1) if grand_total else 0.0,
            }
            for name, amt in by_cat.items()
        ],
    }


def _template_reply(facts: dict) -> str:
    cur = facts["currency"]
    if facts["type"] == "compare_months":
        text = (
            f"You spent {facts['current_total']:.2f} {cur} on {facts['category']} in "
            f"{facts['month']} versus {facts['previous_total']:.2f} {cur} in "
            f"{facts['previous_month']}"
        )
        if facts["pct_change"] is not None:
            text += f" ({facts['pct_change']:+.1f}%)"
        text += "."
        if facts["suggested_budget"] is not None:
            text += f" Consider a budget limit of {facts['suggested_budget']:.2f} {cur}."
        return text
    if facts["type"] == "spending_total":
        return f"You spent {facts['total']:.2f} {cur} on {facts['category']} in {facts['month']}."
    parts = ", ".join(f"{c['category']} {c['total']:.2f}" for c in facts["categories"])
    return f"In {facts['month']} you spent {facts['total']:.2f} {cur}: {parts or 'nothing yet'}."
