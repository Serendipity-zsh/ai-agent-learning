from dataclasses import dataclass

@dataclass(frozen=True)
class Task:
    goal: str; tools: frozenset[str]; budget: int
@dataclass(frozen=True)
class Artifact:
    content: str; evidence: tuple[str, ...]; spent: int

def delegate(task, worker):
    artifact = worker(task)
    if artifact.spent > task.budget: raise ValueError('budget exceeded')
    if not artifact.evidence: raise ValueError('artifact lacks evidence')
    return artifact
