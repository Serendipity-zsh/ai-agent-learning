import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from hybrid_retrieval import lexical, retrieve, rrf


class HybridRetrievalTest(unittest.TestCase):
    docs = {'a': 'agent tool protocol', 'b': 'rag retrieval context', 'c': 'agent memory'}
    def test_lexical_recall(self): self.assertEqual(lexical('agent protocol', self.docs)[0], 'a')
    def test_rrf_rewards_agreement(self): self.assertEqual(rrf(['a', 'b'], ['b', 'a'])[0], 'a')
    def test_hybrid_uses_both_channels(self): self.assertIn('c', retrieve('agent', self.docs, ['c', 'b']))


if __name__ == '__main__': unittest.main()
