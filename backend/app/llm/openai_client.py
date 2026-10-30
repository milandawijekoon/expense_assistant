import json
import logging

import openai

from app.errors import LLMError

logger = logging.getLogger(__name__)


class OpenAIClient:
    def __init__(
        self, api_key: str, model: str, timeout: float, base_url: str | None = None
    ) -> None:
        # base_url lets the same client talk to any OpenAI-compatible server (e.g. Ollama).
        self._client = openai.OpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout, max_retries=2
        )
        self._model = model

    def complete_json(self, *, system: str, user: str, schema: dict, name: str) -> dict:
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": name, "schema": schema, "strict": True},
                },
            )
            return json.loads(response.choices[0].message.content or "")
        except openai.OpenAIError as exc:
            logger.error("OpenAI request failed: %s", type(exc).__name__)
            raise LLMError() from exc
        except (json.JSONDecodeError, IndexError) as exc:
            logger.error("OpenAI returned unparseable structured output")
            raise LLMError() from exc

    def complete_text(self, *, system: str, user: str) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
        except openai.OpenAIError as exc:
            logger.error("OpenAI request failed: %s", type(exc).__name__)
            raise LLMError() from exc
        return (response.choices[0].message.content or "").strip()
