import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from contract import validate


class ContractTest(unittest.TestCase):
    valid = {'ticket_id': 'T-1', 'status': 'doing', 'due_date': '2026-09-08'}
    def test_valid_contract(self): self.assertEqual(validate(self.valid, False).ticket_id, 'T-1')
    def test_unknown_field_rejected(self):
        with self.assertRaises(ValueError): validate({**self.valid, 'owner': 'x'}, False)
    def test_semantic_permission_rejected(self):
        with self.assertRaises(PermissionError): validate({**self.valid, 'status': 'done'}, False)


if __name__ == '__main__': unittest.main()
