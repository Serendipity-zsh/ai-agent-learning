from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class TicketChange:
    ticket_id: str
    status: str
    due_date: str


ALLOWED = {'todo', 'doing', 'done'}


def validate(payload: dict, actor_can_close: bool) -> TicketChange:
    expected = {'ticket_id', 'status', 'due_date'}
    if set(payload) != expected:
        raise ValueError('schema mismatch')
    if not all(isinstance(payload[key], str) for key in expected):
        raise ValueError('all fields must be strings')
    if payload['status'] not in ALLOWED:
        raise ValueError('invalid status')
    if payload['status'] == 'done' and not actor_can_close:
        raise PermissionError('actor cannot close ticket')
    date.fromisoformat(payload['due_date'])
    return TicketChange(**payload)
