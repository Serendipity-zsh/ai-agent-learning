from dataclasses import dataclass

@dataclass(frozen=True)
class Trial: task: str; transcript: tuple[str, ...]; outcome: str; cost: int
def grade(trial, expected, forbidden=()):
    return {'outcome': trial.outcome == expected, 'forbidden': not any(x in trial.transcript for x in forbidden), 'budget': trial.cost <= 100}
def passed(result): return all(result.values())
