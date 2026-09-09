from dataclasses import dataclass, field


@dataclass
class Run:
    status: str = "proposed"
    events: list[dict] = field(default_factory=list)
    receipts: set[str] = field(default_factory=set)


def execute(run, actor, action, key, confirmed=False):
    run.events.append({"type": "policy", "actor": actor, "action": action, "confirmed": confirmed})
    if action == "update_task" and not confirmed:
        run.status = "waiting_confirmation"
        return "confirmation_required"
    if action == "update_task" and key in run.receipts:
        return "already_applied"
    if action == "update_task":
        run.receipts.add(key)
        run.status = "completed"
        run.events.append({"type": "receipt", "key": key})
        return "applied"
    run.status = "completed"
    return "read_only"
