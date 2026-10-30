from typing import Protocol


class LLMClient(Protocol):
    """Minimal provider-agnostic surface the services depend on."""

    def complete_json(self, *, system: str, user: str, schema: dict, name: str) -> dict:
        """Return an object conforming to `schema` (structured output)."""
        ...

    def complete_text(self, *, system: str, user: str) -> str: ...
