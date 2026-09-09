from dataclasses import dataclass
from typing import Any


class TransientProviderError(Exception):
    pass


class PermanentProviderError(Exception):
    pass


@dataclass(frozen=True)
class AgentEvent:
    kind: str
    data: dict[str, Any]


def normalize_response(raw: dict[str, Any]) -> list[AgentEvent]:
    choice = (raw.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    events: list[AgentEvent] = []
    if message.get("content"):
        events.append(AgentEvent("message", {"content": message["content"]}))
    for call in message.get("tool_calls") or []:
        if not call.get("id") or not call.get("function", {}).get("name"):
            raise PermanentProviderError("tool call requires id and function.name")
        events.append(AgentEvent("tool_call", {
            "id": call["id"], "name": call["function"]["name"],
            "arguments": call["function"].get("arguments", "{}")
        }))
    usage = raw.get("usage")
    if usage:
        events.append(AgentEvent("usage", usage))
    return events


def call_with_retry(send, request: dict[str, Any], max_retries: int = 2) -> list[AgentEvent]:
    attempts = 0
    while True:
        try:
            return normalize_response(send(request))
        except TransientProviderError:
            if attempts >= max_retries:
                raise
            attempts += 1
