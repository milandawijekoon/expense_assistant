import logging
import re

from app.config import get_settings

_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9_\-]{8,}"), "[REDACTED]"),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=\-]+"), "Bearer [REDACTED]"),
    (
        re.compile(r"(?i)\b(api[_-]?key|x-api-key|authorization)\b([\"'=:\s]+)(?!\[REDACTED\])[^\s\"',}]+"),
        r"\1\2[REDACTED]",
    ),
]


def redact(text: str, secrets: list[str] | None = None) -> str:
    for secret in secrets or []:
        text = text.replace(secret, "[REDACTED]")
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RedactingFormatter(logging.Formatter):
    """Scrubs API keys, tokens and configured secrets from every line, tracebacks included."""

    def format(self, record: logging.LogRecord) -> str:
        return redact(super().format(record), get_settings().secret_values())


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        RedactingFormatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    for noisy in ("httpx", "httpcore", "anthropic", "openai"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
