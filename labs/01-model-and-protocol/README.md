# Lab 01：上下文预算器

运行：`python3 -m unittest labs/01-model-and-protocol/test_token_budget.py -v`

这个实验故意用估算 token 数而非 provider tokenizer。目标是验证预算和裁剪契约：系统规则、当前任务和输出预留不能被静默挤掉；其他片段必须记录保留或丢弃原因。接入真实模型时，只替换 `estimate_tokens`，不要改变选择策略。
