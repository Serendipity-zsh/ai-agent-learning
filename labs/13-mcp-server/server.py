import json


class McpServer:
    def __init__(self):
        self.initialized = False
        self.audit = []

    def handle(self, request, actor="anonymous"):
        method, request_id = request.get("method"), request.get("id")
        if method == "initialize":
            self.initialized = True
            return {"jsonrpc": "2.0", "id": request_id, "result": {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}}}}
        if not self.initialized:
            return self.error(request_id, -32000, "server is not initialized")
        if method == "tools/list":
            return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": [{"name": "lookup_task", "description": "Read a task", "inputSchema": {"type": "object", "required": ["task_id"]}}]}}
        if method == "tools/call":
            params = request.get("params") or {}
            name, arguments = params.get("name"), params.get("arguments") or {}
            self.audit.append({"id": request_id, "actor": actor, "tool": name})
            if name != "lookup_task":
                return self.error(request_id, -32602, "unknown tool")
            if not arguments.get("task_id"):
                return self.error(request_id, -32602, "task_id is required")
            if actor == "anonymous":
                return self.error(request_id, -32001, "authorization denied")
            return {"jsonrpc": "2.0", "id": request_id, "result": {"content": [{"type": "text", "text": f"task:{arguments['task_id']}"}]}}
        return self.error(request_id, -32601, "method not found")

    @staticmethod
    def error(request_id, code, message):
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def encode(request):
    return json.dumps(request, ensure_ascii=False)
