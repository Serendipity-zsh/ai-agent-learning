from dataclasses import dataclass


@dataclass(frozen=True)
class Segment:
    id: str
    lane: str
    text: str
    priority: int
    trust: str
    authorized: bool = True


LANE_ORDER = {'policy': 0, 'task': 1, 'state': 2, 'evidence': 3, 'memory': 4, 'history': 5}


def tokens(text): return max(1, (len(text) + 3) // 4)


def compile_context(segments, window, reserve):
    remaining, selected, manifest = window - reserve, [], []
    if remaining <= 0: raise ValueError('no input budget')
    for s in sorted(segments, key=lambda x: (LANE_ORDER[x.lane], -x.priority)):
        if not s.authorized:
            manifest.append((s.id, 'drop', 'unauthorized')); continue
        if s.lane == 'policy' and s.trust != 'trusted':
            raise ValueError('only trusted policy may enter policy lane')
        cost = tokens(s.text)
        if cost <= remaining:
            selected.append(s); remaining -= cost; manifest.append((s.id, 'keep', s.lane))
        else:
            manifest.append((s.id, 'externalize', s.lane))
    return selected, manifest
