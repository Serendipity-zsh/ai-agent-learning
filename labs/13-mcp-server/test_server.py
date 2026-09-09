import unittest

from server import McpServer


class McpServerTests(unittest.TestCase):
    def setUp(self):
        self.server = McpServer()

    def test_lifecycle_requires_initialize(self):
        self.assertIn("error", self.server.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}))
        response = self.server.handle({"jsonrpc": "2.0", "id": 2, "method": "initialize"})
        self.assertEqual(response["result"]["protocolVersion"], "2025-06-18")

    def test_list_is_not_authorization(self):
        self.server.handle({"id": 1, "method": "initialize"})
        self.server.handle({"id": 2, "method": "tools/list"})
        denied = self.server.handle({"id": 3, "method": "tools/call", "params": {"name": "lookup_task", "arguments": {"task_id": "T1"}}})
        self.assertEqual(denied["error"]["code"], -32001)

    def test_authorized_call_is_audited(self):
        self.server.handle({"id": 1, "method": "initialize"})
        result = self.server.handle({"id": 2, "method": "tools/call", "params": {"name": "lookup_task", "arguments": {"task_id": "T1"}}}, actor="alice")
        self.assertEqual(result["result"]["content"][0]["text"], "task:T1")
        self.assertEqual(self.server.audit[0]["actor"], "alice")


if __name__ == "__main__":
    unittest.main()
