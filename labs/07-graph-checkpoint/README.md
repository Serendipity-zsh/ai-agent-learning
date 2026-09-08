# Lab 07：图状态与 Checkpoint

实现 `StateGraph` 的最小版本：每个 node 返回 state patch；持久化 snapshot；副作用节点先读取 idempotency key；interrupt 保存 pending state，resume 再推进。这个实验对应 LangGraph checkpoint/interrupt 的关键工程边界。下一轮将提供参考实现与测试。
