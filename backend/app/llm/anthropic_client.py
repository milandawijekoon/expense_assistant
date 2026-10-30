import logging

import anthropic

from app.errors import LLMError

logger = logging.getLogger(__name__)


class AnthropicClient:
    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self._client = anthropic.Anthropic(api_key=api_key, timeout=timeout, max_retries=2)
        self._model = model

    def complete_json(self, *, system: str, user: str, schema: dict, name: str) -> dict:
        try:
            message = self._client.messages.create(
                model=self._model,
                max_tokens=512,
                system=system,
                messages=[{"role": "user", "content": user}],
                tools=[
                    {
                        "name": name,
                        "description": "Return the structured result.",
                        "input_schema": schema,
                    }
                ],
                tool_choice={"type": "tool", "name": name},
            )
        except anthropic.APIError as exc:
            logger.error("Anthropic request failed: %s", type(exc).__name__)
            raise LLMError() from exc
        for block in message.content:
            if block.type == "tool_use":
                return dict(block.input)
        logger.error("Anthropic response contained no structured output")
        raise LLMError()

    def complete_text(self, *, system: str, user: str) -> str:
        try:
            message = self._client.messages.create(
                model=self._model,
                max_tokens=600,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
        except anthropic.APIError as exc:
            logger.error("Anthropic request failed: %s", type(exc).__name__)
            raise LLMError() from exc
        return "".join(b.text for b in message.content if b.type == "text").strip()
