import sys, unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from memory import Memory, Store

class MemoryTest(unittest.TestCase):
    def test_untrusted_candidate_is_not_written(self): self.assertEqual(Store().apply(Memory('lang','English',1,None),'web'), 'NOOP:low_trust')
    def test_user_lock_prevents_weaker_overwrite(self):
        s=Store(); s.apply(Memory('lang','中文',3,None,locked_by_user=True),'user'); self.assertEqual(s.apply(Memory('lang','English',2,None),'model'),'NOOP:user_lock')
    def test_expired_memory_is_not_recalled(self):
        s=Store(); s.apply(Memory('city','Shanghai',3,datetime.now(timezone.utc)-timedelta(seconds=1)),'user'); self.assertEqual(s.recall(datetime.now(timezone.utc)),[])

if __name__ == '__main__': unittest.main()
