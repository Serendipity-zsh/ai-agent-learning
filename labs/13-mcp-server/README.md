# Lab 13：从零实现 MCP Server

目标：把 MCP 当作协议学习，而不是 SDK 调用。服务端实现 JSON-RPC 2.0 的 `initialize`、`tools/list` 和 `tools/call`，并区分生命周期、能力协商、schema 校验和业务授权。

```bash
python3 -m unittest labs/13-mcp-server/test_server.py -v
```

调用链：`initialize → tools/list → policy check → schema check → execute → audit event`。能力协商成功只表示双方能理解协议，不表示当前 actor 获得了业务权限。
