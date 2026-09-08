import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
_spec = importlib.util.spec_from_file_location('production_runtime', Path(__file__).with_name('runtime.py'))
_module = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_module)
Job, Runtime = _module.Job, _module.Runtime
class ProductionTest(unittest.TestCase):
    def test_expired_lease_is_reclaimable(self):
        r=Runtime(); j=Job('j'); self.assertTrue(r.claim(j,0)); self.assertFalse(r.claim(j,1)); self.assertTrue(r.claim(j,31))
    def test_cancelled_job_is_not_claimed(self): self.assertFalse(Runtime().claim(Job('j', cancelled=True),0))
    def test_outbox_is_idempotent(self):
        r=Runtime(); r.enqueue('k',{}); r.enqueue('k',{}); r.flush(); self.assertEqual(r.sent,{'k'})
if __name__ == '__main__': unittest.main()
