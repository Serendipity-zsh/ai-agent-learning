from dataclasses import dataclass, replace
from datetime import datetime, timezone

@dataclass(frozen=True)
class Memory:
    key: str; value: str; trust: int; expires_at: datetime | None; version: int = 1; locked_by_user: bool = False

class Store:
    def __init__(self): self.rows, self.history = {}, []
    def apply(self, candidate, reason):
        old = self.rows.get(candidate.key)
        if candidate.trust < 2: return 'NOOP:low_trust'
        if old and old.locked_by_user and candidate.trust <= old.trust: return 'NOOP:user_lock'
        next_row = replace(candidate, version=(old.version + 1 if old else 1))
        self.rows[candidate.key] = next_row; self.history.append((old, next_row, reason)); return 'UPDATE' if old else 'ADD'
    def recall(self, now): return [row for row in self.rows.values() if not row.expires_at or row.expires_at > now]
