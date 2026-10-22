# Lab 13：从零实现 MCP Server

> 版本边界：本实验固定 2025-06-18，只有内存 JSON-RPC 风格 handler，未实现完整传输或真实鉴权。2026-07-28 核心规范已移除 initialize 握手；请结合网站“MCP 2026”专题对照学习，不将此代码当作新版合规 Server。

目标：把 MCP 当作协议学习，而不是 SDK 调用。服务端实现 JSON-RPC 2.0 的 `initialize`、`tools/list` 和 `tools/call`，并区分生命周期、能力协商、schema 校验和业务授权。

```bash
python3 -m unittest discover -s labs/13-mcp-server -p 'test_*.py' -v
```

调用链：`initialize → tools/list → policy check → schema check → execute → audit event`。能力协商成功只表示双方能理解协议，不表示当前 actor 获得了业务权限。
