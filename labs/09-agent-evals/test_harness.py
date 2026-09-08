import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from harness import Trial, grade, passed
class HarnessTest(unittest.TestCase):
    def test_checks_outcome_and_process(self): self.assertTrue(passed(grade(Trial('q', ('read',), 'ok', 2), 'ok', ('write',))))
    def test_rejects_correct_result_from_forbidden_path(self): self.assertFalse(passed(grade(Trial('q', ('write',), 'ok', 2), 'ok', ('write',))))
    def test_enforces_cost_budget(self): self.assertFalse(passed(grade(Trial('q', (), 'ok', 101), 'ok')))
if __name__ == '__main__': unittest.main()
