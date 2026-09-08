import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from runtime import run


class RuntimeTest(unittest.TestCase):
    def test_write_requires_confirmation(self):
        events = run([{'type': 'tool', 'tool': 'create', 'write': True}], {'create': lambda: 'ok'}, False)
        self.assertEqual(events[0].payload['reason'], 'confirmation_required')
    def test_tool_call_is_replayable(self):
        events = run([{'type': 'tool', 'tool': 'read'}], {'read': lambda: 'value'}, True)
        self.assertEqual([event.type for event in events], ['tool_call', 'tool_result'])
    def test_step_budget_stops(self):
        events = run([{'type': 'tool', 'tool': 'read'}] * 3, {'read': lambda: 'v'}, True, max_steps=2)
        self.assertEqual(events[-1].type, 'stop')


if __name__ == '__main__': unittest.main()
