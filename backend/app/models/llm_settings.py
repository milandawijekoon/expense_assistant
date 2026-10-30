import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LLMSettings(Base):
    """A user's own LLM provider choice. The API key is stored encrypted."""

    __tablename__ = "llm_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    provider: Mapped[str] = mapped_column(String(16))
    model: Mapped[str] = mapped_column(String(120))
    base_url: Mapped[str | None] = mapped_column(String(255))
    api_key_encrypted: Mapped[str | None] = mapped_column(String(1024))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
