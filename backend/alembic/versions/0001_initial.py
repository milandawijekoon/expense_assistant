"""create users and expenses

Revision ID: 0001
Revises:
Create Date: 2026-10-28
"""
import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("default_currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("merchant", sa.String(120)),
        sa.Column("spent_on", sa.Date(), nullable=False),
        sa.Column("description", sa.String(255)),
        sa.Column("raw_text", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
    )
    op.create_index("ix_expenses_user_spent_on", "expenses", ["user_id", "spent_on"])
    op.create_index(
        "ix_expenses_user_category_spent_on", "expenses", ["user_id", "category", "spent_on"]
    )


def downgrade() -> None:
    op.drop_table("expenses")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
