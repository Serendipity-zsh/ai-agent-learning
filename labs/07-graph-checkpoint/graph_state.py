from dataclasses import dataclass, field

@dataclass
class Checkpoint:
    state: dict = field(default_factory=dict)
    receipts: dict = field(default_factory=dict)
    interrupted: bool = False

def plan(cp, title):
    cp.state['pending_write'] = {'title': title, 'key': f'task:{title}'}
    return cp

def execute(cp, gateway):
    pending = cp.state['pending_write']; key = pending['key']
    cp.receipts[key] = cp.receipts.get(key) or gateway(key, pending)
    cp.state['receipt'] = cp.receipts[key]; cp.state.pop('pending_write')
    return cp

def interrupt(cp): cp.interrupted = True; return cp

def resume(cp): cp.interrupted = False; return cp
