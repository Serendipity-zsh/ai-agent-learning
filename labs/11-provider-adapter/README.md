# Lab 11：真实模型 Provider 适配层

目标：理解 Agent Runtime 不应该知道 OpenAI、Anthropic 或本地模型的原始 JSON。适配层将请求、响应、工具调用、流式 delta 和错误归一化成稳定的内部 contract。

## 运行

```bash
python3 -m unittest labs/11-provider-adapter/test_adapter.py -v
```

## 核心边界

```text
Runtime → ProviderRequest → adapter → provider HTTP
Runtime ← AgentEvent ← adapter ← response / stream
```

只对连接重置、429、502 等 transient error 使用有限重试；400 schema error、401 credential error 和 policy denial 不应重试。生产实现还应记录 provider、model、request id、token usage、latency 和 retry count，但不得记录 secret 或未经脱敏的敏感 prompt。

先读 `adapter.py`，再故意让 tool call 缺少 id、让重试次数超过预算，并解释为什么测试必须失败。
