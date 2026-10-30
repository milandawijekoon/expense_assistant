class AppError(Exception):
    """Domain error that maps to an HTTP response with a machine-readable body."""

    status_code = 500
    code = "internal_error"
    message = "Something went wrong."
    headers: dict[str, str] | None = None

    def __init__(self, message: str | None = None, **extra: object) -> None:
        self.message = message or self.message
        self.extra = extra
        super().__init__(self.message)

    def to_detail(self) -> dict:
        return {"code": self.code, "message": self.message, **self.extra}


class AuthError(AppError):
    status_code = 401
    code = "unauthorized"
    message = "Not authenticated."
    headers = {"WWW-Authenticate": "Bearer"}


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Not found."


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "Conflict."


class MissingFieldsError(AppError):
    status_code = 422
    code = "missing_fields"
    message = (
        "I couldn't find a valid amount in that message. Please include the amount and "
        "the category, for example: 'Paid 1800 rupees for lunch at Barista'."
    )

    def __init__(self, missing: list[str], message: str | None = None) -> None:
        super().__init__(message, missing=missing)


class InvalidExpenseError(AppError):
    status_code = 422
    code = "invalid_expense"
    message = "The expense details are not valid."


class LLMError(AppError):
    status_code = 502
    code = "llm_error"
    message = "The AI service had a problem. Please try again in a moment."


class LLMNotConfigured(LLMError):
    status_code = 503
    code = "llm_not_configured"
    message = "No AI provider is set up yet. Add your API key under Settings."
