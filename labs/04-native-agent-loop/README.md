# Lab 04：最小可控 Agent Loop

运行：`python3 -m unittest labs/04-native-agent-loop/test_runtime.py -v`

模型不是执行器。这里用确定性 model plan 演示 runtime 必须负责：工具白名单、写操作确认、最大步数、以及可回放事件。替换成真实模型时，不能移除这些 runtime 约束。
