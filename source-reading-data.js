const PROJECT_SOURCE_READINGS = {
  langchain: {
    ref: 'master @ e670c7a (2026-09-08 核验)',
    chain: 'create_agent → middleware hooks → model/tool nodes → compiled LangGraph',
    files: [
      ['Agent factory', 'libs/langchain/langchain/agents/factory.py', 'https://github.com/langchain-ai/langchain/blob/e670c7a03ba36fd1516f0185f7ec1186c89aa471/libs/langchain/langchain/agents/factory.py', '从 create_agent 的 state、edge 和 middleware 注入开始，避免把高层 API 当黑盒。'],
      ['Core messages', 'libs/core/langchain_core/messages', 'https://github.com/langchain-ai/langchain/tree/e670c7a03ba36fd1516f0185f7ec1186c89aa471/libs/core/langchain_core/messages', '确认内部消息模型如何承载 tool calls、tool results 与 content blocks。'],
      ['Middleware', 'libs/langchain/langchain/agents/middleware', 'https://github.com/langchain-ai/langchain/tree/e670c7a03ba36fd1516f0185f7ec1186c89aa471/libs/langchain/langchain/agents/middleware', '观察审批、重试、限制和摘要怎样成为环绕 node 的横切策略。']
    ]
  },
  langgraph: {
    ref: 'main @ 81bf17b (2026-09-08 核验)',
    chain: 'StateGraph builder → compile → Pregel tasks/channels → checkpointer → interrupt/resume',
    files: [
      ['Graph builder', 'libs/langgraph/langgraph/graph', 'https://github.com/langchain-ai/langgraph/tree/81bf17b23123e4ef8b9d5f49fa09a0122fc2edd1/libs/langgraph/langgraph/graph', '先理解 state schema、node、edge 和 reducer 的声明语义。'],
      ['Pregel runtime', 'libs/langgraph/langgraph/pregel', 'https://github.com/langchain-ai/langgraph/tree/81bf17b23123e4ef8b9d5f49fa09a0122fc2edd1/libs/langgraph/langgraph/pregel', '再追 super-step、task scheduling、writes 与 barrier；这是“图如何真的运行”。'],
      ['Checkpoint contracts', 'libs/checkpoint', 'https://github.com/langchain-ai/langgraph/tree/81bf17b23123e4ef8b9d5f49fa09a0122fc2edd1/libs/checkpoint', '最后读 serializer/store/checkpoint；重点确认 pending writes 与 thread config。']
    ]
  },
  mem0: {
    ref: 'main @ dae67f7 (2026-09-08 核验)',
    chain: 'Memory.add → fact extraction → similar-memory search → ADD/UPDATE/DELETE decision → store/history',
    files: [
      ['Memory orchestration', 'mem0/memory/main.py', 'https://github.com/mem0ai/mem0/blob/dae67f74f5cc7bf138c7d7d6f9cec5ce4b4373b3/mem0/memory/main.py', '从 add/search/update/delete 的入口确认 scope、filter 与 provider adapter 的边界。'],
      ['Extraction prompts', 'mem0/configs/prompts.py', 'https://github.com/mem0ai/mem0/blob/dae67f74f5cc7bf138c7d7d6f9cec5ce4b4373b3/mem0/configs/prompts.py', '检查模型只提出候选/操作，而不是把自然语言输出直接当作持久事实。'],
      ['Vector stores', 'mem0/vector_stores', 'https://github.com/mem0ai/mem0/tree/dae67f74f5cc7bf138c7d7d6f9cec5ce4b4373b3/mem0/vector_stores', '比较存储 adapter 的 filter/delete contract，思考调用方如何保证 tenant scope。']
    ]
  },
  openclaw: {
    ref: 'main @ 8342d35 (2026-09-08 核验)',
    chain: 'channel/Gateway → session manifest → embedded runner → agent-core loop → tool/MCP → SQLite/memory',
    files: [
      ['Agent loop', 'packages/agent-core/src/agent-loop.ts', 'https://github.com/openclaw/openclaw/blob/8342d351b280e18936bfaacf85ab4b78f4e2476c/packages/agent-core/src/agent-loop.ts', '先看一轮模型—工具—流式事件的控制边界，再看产品层如何组合它。'],
      ['Runtime architecture', 'docs/agent-runtime-architecture.md', 'https://github.com/openclaw/openclaw/blob/8342d351b280e18936bfaacf85ab4b78f4e2476c/docs/agent-runtime-architecture.md', '将 Gateway、session、runner、provider 与 tool runtime 对到架构图。'],
      ['Memory architecture', 'docs/concepts/memory-architecture.md', 'https://github.com/openclaw/openclaw/blob/8342d351b280e18936bfaacf85ab4b78f4e2476c/docs/concepts/memory-architecture.md', '重点阅读 provenance gate、episodic tier、consolidation 与 recall-loop 防护。']
    ]
  }
};
