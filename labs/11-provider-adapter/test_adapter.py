import unittest

from adapter import AgentEvent, PermanentProviderError, TransientProviderError, call_with_retry, normalize_response


class AdapterTests(unittest.TestCase):
    def test_normalizes_message_tool_call_and_usage(self):
        events = normalize_response({"choices": [{"message": {"content": "ok", "tool_calls": [{"id": "c1", "function": {"name": "search", "arguments": "{}"}}]}}], "usage": {"total_tokens": 8}})
        self.assertEqual([event.kind for event in events], ["message", "tool_call", "usage"])
        self.assertEqual(events[1].data["id"], "c1")

    def test_retries_only_within_budget(self):
        calls = []
        def send(_):
            calls.append(1)
            if len(calls) < 3:
                raise TransientProviderError("429")
            return {"choices": [{"message": {"content": "done"}}]}
        self.assertEqual(call_with_retry(send, {}, 2)[0], AgentEvent("message", {"content": "done"}))
        self.assertEqual(len(calls), 3)

    def test_bad_tool_call_is_permanent(self):
        with self.assertRaises(PermanentProviderError):
            normalize_response({"choices": [{"message": {"tool_calls": [{"function": {"name": "x"}}]}}]})


if __name__ == "__main__":
    unittest.main()
