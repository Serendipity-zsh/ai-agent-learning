import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from graph_state import Checkpoint, execute, interrupt, plan, resume

class GraphStateTest(unittest.TestCase):
    def test_resume_does_not_repeat_side_effect(self):
        calls=[]; gateway=lambda key, payload: calls.append(key) or {'id':'r1'}
        cp=plan(Checkpoint(),'a'); interrupt(cp); resume(cp); execute(cp,gateway)
        cp.state['pending_write']={'title':'a','key':'task:a'}; execute(cp,gateway)
        self.assertEqual(calls,['task:a'])
    def test_interrupt_is_durable_state(self): self.assertTrue(interrupt(Checkpoint()).interrupted)

if __name__ == '__main__': unittest.main()
