# Lab 14：项目管理 Agent Capstone

这是最终综合项目：构建一个能查询项目进度、检索项目文档、生成计划，并在用户确认后安全写回的 Agent。

## 架构

```text
Ingress → Intent Router → Context Builder → Model
                         ↓                  ↓
                 RAG / Memory       Typed ToolCall
                                              ↓
                   Policy + Confirmation + Idempotency
                                              ↓
                 Graph Checkpoint ← Receipt / Trace / Eval
```

## 交付要求

1. 读请求走 `retrieve → answer`；写请求走 `propose → confirm → execute → read-back`。
2. 每条证据包含 `source_id`、时间和 tenant；证据不足时输出“不确定”，不能猜测。
3. 每个 tool call 记录 actor、resource、action、arguments hash、decision、receipt。
4. checkpoint 只保存可恢复状态；外部副作用必须由幂等键和 receipt 保护。
5. 评测同时覆盖答案正确性、证据覆盖率、越权拒绝、重复写入、恢复成功率、延迟和成本。

运行：

```bash
python3 -m unittest labs/14-capstone/test_capstone.py -v
```
