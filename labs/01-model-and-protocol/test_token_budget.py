import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from token_budget import Segment, build_context, estimate_tokens


class TokenBudgetTest(unittest.TestCase):
    def test_required_policy_and_task_survive(self):
        selected, decisions = build_context([
            Segment('history', 'x' * 80, 1), Segment('policy', 'never write without approval', 100, True),
            Segment('task', 'create a report', 90, True)], window=40, reserve_output=10)
        self.assertEqual({'policy', 'task'}, {item.name for item in selected})
        self.assertIn('drop:history:budget', decisions)

    def test_required_segment_fails_loudly(self):
        with self.assertRaises(ValueError):
            build_context([Segment('policy', 'x' * 200, 1, True)], window=10, reserve_output=2)

    def test_estimate_is_positive(self): self.assertGreater(estimate_tokens(''), 0)


if __name__ == '__main__': unittest.main()
