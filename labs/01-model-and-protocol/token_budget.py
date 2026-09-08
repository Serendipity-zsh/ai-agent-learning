from dataclasses import dataclass


@dataclass(frozen=True)
class Segment:
    name: str
    text: str
    priority: int
    required: bool = False


def estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4)


def build_context(segments: list[Segment], window: int, reserve_output: int) -> tuple[list[Segment], list[str]]:
    budget = window - reserve_output
    if budget <= 0:
        raise ValueError('output reservation exhausts context window')
    selected, decisions, used = [], [], 0
    for segment in sorted(segments, key=lambda item: (not item.required, -item.priority)):
        cost = estimate_tokens(segment.text)
        if used + cost <= budget:
            selected.append(segment); used += cost; decisions.append(f'keep:{segment.name}')
        elif segment.required:
            raise ValueError(f'required segment does not fit: {segment.name}')
        else:
            decisions.append(f'drop:{segment.name}:budget')
    return selected, decisions
