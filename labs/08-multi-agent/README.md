# Lab 08：多 Agent 委派协议

运行：`python3 -m unittest labs/08-multi-agent/test_orchestrator.py -v`

参考实现只传递类型化 Task/Artifact，强制 evidence 与共享预算；它刻意不模拟多轮聊天，避免把“多人对话”误当作协作协议。
