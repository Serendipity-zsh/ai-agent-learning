import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from orchestrator import Artifact, Task, delegate

class OrchestratorTest(unittest.TestCase):
    task = Task('research', frozenset({'search'}), 10)
    def test_receives_typed_artifact(self): self.assertEqual(delegate(self.task, lambda _: Artifact('ok', ('s1',), 2)).content, 'ok')
    def test_rejects_missing_evidence(self):
        with self.assertRaises(ValueError): delegate(self.task, lambda _: Artifact('claim', (), 1))
    def test_enforces_shared_budget(self):
        with self.assertRaises(ValueError): delegate(self.task, lambda _: Artifact('ok', ('s1',), 11))

if __name__ == '__main__': unittest.main()
