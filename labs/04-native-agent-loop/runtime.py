from dataclasses import dataclass


@dataclass
class Event:
    type: str
    payload: dict


def run(plan: list[dict], tools: dict, confirmed: bool, max_steps: int = 6) -> list[Event]:
    events = []
    for step, action in enumerate(plan):
        if step >= max_steps:
            events.append(Event('stop', {'reason': 'budget'})); break
        if action['type'] == 'final':
            events.append(Event('final', {'text': action['text']})); break
        tool = action['tool']
        if tool not in tools:
            events.append(Event('deny', {'tool': tool, 'reason': 'unknown_tool'})); continue
        if action.get('write') and not confirmed:
            events.append(Event('deny', {'tool': tool, 'reason': 'confirmation_required'})); continue
        events.append(Event('tool_call', {'tool': tool, 'args': action.get('args', {})}))
        events.append(Event('tool_result', {'tool': tool, 'result': tools[tool](**action.get('args', {}))}))
    return events
