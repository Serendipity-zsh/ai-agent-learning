import unittest

from capstone import Run, execute


class CapstoneTests(unittest.TestCase):
    def test_write_requires_confirmation(self):
        run = Run()
        self.assertEqual(execute(run, "alice", "update_task", "k1"), "confirmation_required")
        self.assertEqual(run.status, "waiting_confirmation")

    def test_idempotent_after_resume(self):
        run = Run()
        self.assertEqual(execute(run, "alice", "update_task", "k1", True), "applied")
        self.assertEqual(execute(run, "alice", "update_task", "k1", True), "already_applied")
        self.assertEqual(len(run.receipts), 1)

    def test_read_does_not_need_confirmation(self):
        run = Run()
        self.assertEqual(execute(run, "alice", "list_tasks", "k2"), "read_only")


if __name__ == "__main__":
    unittest.main()
