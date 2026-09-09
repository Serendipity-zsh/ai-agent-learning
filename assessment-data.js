const CHAPTER_ASSESSMENTS = {
  'system-boundary': ['一个系统什么时候应该用 Agent，而不是 Workflow？', '当下一步必须依据运行时 observation 动态决定，且固定流程无法枚举时。'],
  'model-foundation': ['为什么扩大 context window 不等于模型一定更可靠？', '因为 prefill 成本、噪声竞争、lost-in-the-middle 和上下文冲突仍会影响注意力与判断。'],
  'prompt-protocol': ['结构化输出通过 JSON Schema 后，为什么仍不能直接执行？', 'Schema 只保证形状；实体存在性、权限、状态迁移等业务语义仍需确定性验证。'],
  'rag-system': ['如何判断一次 RAG 失败发生在检索还是生成？', '检查期望 evidence 是否进入 top-k/context pack；没召回是 retrieval failure，召回但未支持答案才进入 generation/validation。'],
  'agent-runtime': ['写工具遇到 timeout 时为什么不能直接 retry？', '第一次请求可能已成功但响应丢失；必须用幂等键查询 receipt/read-back，再决定是否重试。'],
  'context-engineering': ['为什么 tool result 不能通过 Prompt 分隔符获得真正安全性？', '分隔符只是模型提示；强制边界必须由 actor/resource/action policy 与 tool gateway 执行。'],
  'memory-system': ['什么内容不应自动晋升为长期记忆？', '低可信、敏感、一次性、未确认或来自不可信网页/工具的内容。'],
  'graph-runtime': ['LangGraph resume 为什么要求 interrupt 前的副作用幂等？', '恢复会从 node 开始重新执行，不是从 interrupt 代码行继续执行。'],
  'multi-agent': ['多 Agent 协作的最小交付单位是什么？', '带输入来源、证据、状态、成本和质量声明的类型化 Artifact，而不是一段聊天记录。'],
  'production': ['Agent 生产化最重要的成功标准是什么？', '故障时状态可解释、任务可恢复、外部副作用不重复、权限可审计，并满足成本/延迟/SLO。'],
  'frameworks': ['MCP 的能力协商成功是否意味着工具可以被当前用户调用？', '不意味着；协议能力、schema 校验与业务授权是三个不同层次。'],
  'capstone': ['毕业项目如何证明自己不是“模型偶然答对”？', '保存 trace，分别评估 retrieval、tool policy、状态恢复、结果正确性、安全拒绝、成本和延迟。']
};
