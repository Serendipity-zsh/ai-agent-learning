from dataclasses import dataclass

@dataclass
class Job: id: str; lease_until: int = 0; cancelled: bool = False
class Runtime:
    def __init__(self): self.outbox, self.sent = [], set()
    def claim(self, job, now, lease=30):
        if job.cancelled or job.lease_until > now: return False
        job.lease_until = now + lease; return True
    def enqueue(self, key, payload): self.outbox.append((key, payload))
    def flush(self):
        for key, _ in self.outbox:
            if key not in self.sent: self.sent.add(key)
