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
  },
  autogen: {
    ref: 'main @ 027ecf0 (2026-09-09 核验)',
    chain: 'AgentChat → Team/GroupChat → message routing → termination condition → runtime events',
    files: [
      ['AgentChat runtime', 'python/packages/autogen-agentchat/src/autogen_agentchat', 'https://github.com/microsoft/autogen/tree/027ecf0a379bcc1d09956d46d12d44a3ad9cee14/python/packages/autogen-agentchat/src/autogen_agentchat', '沿 AgentChat 的消息协议、事件和异步生命周期阅读，不把多 Agent 对话误认为共享黑板。'],
      ['GroupChat team', 'python/packages/autogen-agentchat/src/autogen_agentchat/teams', 'https://github.com/microsoft/autogen/tree/027ecf0a379bcc1d09956d46d12d44a3ad9cee14/python/packages/autogen-agentchat/src/autogen_agentchat/teams', '检查 manager 如何选择 speaker、广播消息并执行终止条件。'],
      ['Core model client', 'python/packages/autogen-ext/src/autogen_ext/models', 'https://github.com/microsoft/autogen/tree/027ecf0a379bcc1d09956d46d12d44a3ad9cee14/python/packages/autogen-ext/src/autogen_ext/models', '对照 provider adapter 与 AgentChat contract 的边界。']
    ]
  },
  llamaindex: {
    ref: 'main @ 5be4479 (2026-09-09 核验)',
    chain: 'Workflow/Agent → Retriever → QueryPipeline → ResponseSynthesizer → observability callbacks',
    files: [
      ['Core query engine', 'llama-index-core/llama_index/core/query_engine', 'https://github.com/run-llama/llama_index/tree/5be447943168d8ac800901a623ca50bdbdee1c8e1/llama-index-core/llama_index/core/query_engine', '先读 query engine 如何编排 retriever、synthesizer 和 callback。'],
      ['Retriever contracts', 'llama-index-core/llama_index/core/retrievers', 'https://github.com/run-llama/llama_index/tree/5be447943168d8ac800901a623ca50bdbdee1c8e1/llama-index-core/llama_index/core/retrievers', '确认节点、相似度、metadata filter 如何进入召回 contract。'],
      ['Workflow runtime', 'llama-index-core/llama_index/core/workflow', 'https://github.com/run-llama/llama_index/tree/5be447943168d8ac800901a623ca50bdbdee1c8e1/llama-index-core/llama_index/core/workflow', '对照事件驱动 workflow 与 LangGraph 状态图的差异。']
    ]
  },
  haystack: {
    ref: 'main @ 3fc6b0e (2026-09-09 核验)',
    chain: 'Pipeline graph → component sockets → DocumentStore → Retriever/Ranker → Generator',
    files: [
      ['Pipeline graph', 'haystack/core/pipeline', 'https://github.com/deepset-ai/haystack/tree/3fc6b0e0457d58ef8fbed619f4d2e01df228ab69/haystack/core/pipeline', '检查 component 输入输出 socket 和拓扑校验如何阻止非法连线。'],
      ['Component API', 'haystack/core/component', 'https://github.com/deepset-ai/haystack/tree/3fc6b0e0457d58ef8fbed619f4d2e01df228ab69/haystack/core/component', '理解装饰器如何生成可组合的运行时 contract。'],
      ['Document stores', 'haystack/document_stores', 'https://github.com/deepset-ai/haystack/tree/3fc6b0e0457d58ef8fbed619f4d2e01df228ab69/haystack/document_stores', '比较存储 adapter 与 RAG pipeline 的一致性边界。']
    ]
  },
  letta: {
    ref: 'main @ ceab0a0 (2026-09-09 核验)',
    chain: 'Agent server → memory blocks → archival search → tool call → persistence/event log',
    files: [
      ['Agent core', 'letta/agents', 'https://github.com/letta-ai/letta/tree/ceab0a07e4a881c7ceb6c98ed1b5a027a138b273/letta/agents', '沿 agent 状态、消息和工具调用定位 memory-first loop。'],
      ['Memory blocks', 'letta/schemas/memory.py', 'https://github.com/letta-ai/letta/blob/ceab0a07e4a881c7ceb6c98ed1b5a027a138b273/letta/schemas/memory.py', '区分始终在上下文的 core memory 与按需检索的 archival memory。'],
      ['Tool execution', 'letta/functions', 'https://github.com/letta-ai/letta/tree/ceab0a07e4a881c7ceb6c98ed1b5a027a138b273/letta/functions', '检查工具参数、返回值和持久状态更新的顺序。']
    ]
  },
  hermes: {
    ref: 'main @ de54f4a (2026-09-09 核验)',
    chain: 'CLI/channel → prompt builder → provider fallback → tool dispatcher → memory flush → session',
    files: [
      ['Main agent', 'hermes-agent/agent.py', 'https://github.com/NousResearch/hermes-agent/blob/de54f4a461b6e453bcf83cc2a6e60d00a494ef0c0/hermes-agent/agent.py', '阅读单体 loop 如何统一 provider fallback、工具和压缩。'],
      ['Prompt builder', 'hermes-agent/prompt_builder.py', 'https://github.com/NousResearch/hermes-agent/blob/de54f4a461b6e453bcf83cc2a6e60d00a494ef0c0/hermes-agent/prompt_builder.py', '观察系统提示、skills 和工具定义如何分层装配。'],
      ['MCP/tools', 'hermes-agent/tools', 'https://github.com/NousResearch/hermes-agent/tree/de54f4a461b6e453bcf83cc2a6e60d00a494ef0c0/hermes-agent/tools', '对照本地工具和 MCP 工具的授权与错误处理。']
    ]
  },
  openhands: {
    ref: 'main @ 0e9fc2c (2026-09-09 核验)',
    chain: 'Agent → EventStream → ActionExecutor → Sandbox/Runtime → Observation → replay',
    files: [
      ['Agent controller', 'openhands/agenthub', 'https://github.com/All-Hands-AI/OpenHands/tree/0e9fc2cc152b4a4d9fd736f107412ace2a0c2555/openhands/agenthub', '从 AgentHub 入口观察不同 agent 实现如何共享 Action/Observation contract。'],
      ['Event stream', 'openhands/events', 'https://github.com/All-Hands-AI/OpenHands/tree/0e9fc2cc152b4a4d9fd736f107412ace2a0c2555/openhands/events', '事件流是回放、UI 和 agent 共同消费的事实源。'],
      ['Runtime sandbox', 'openhands/runtime', 'https://github.com/All-Hands-AI/OpenHands/tree/0e9fc2cc152b4a4d9fd736f107412ace2a0c2555/openhands/runtime', '检查命令执行、容器隔离、超时和资源限制。']
    ]
  },
  'claude-code': {
    ref: 'closed-source-public-docs (2026-09-09 核验)',
    chain: 'CLI → session/context → model tool-use loop → permission gate → filesystem/shell → transcript',
    files: [
      ['公开产品文档', 'code.claude.com/docs', 'https://docs.anthropic.com/en/docs/claude-code/overview', '仅依据公开文档讨论工具、权限、上下文和会话行为，不把推断写成源码事实。'],
      ['Agent SDK 文档', 'docs/agent-sdk', 'https://docs.anthropic.com/en/docs/claude-code/sdk', '对照公开 SDK 的消息流、工具事件和权限回调。'],
      ['安全边界', 'docs/claude-code/security', 'https://docs.anthropic.com/en/docs/claude-code/security', '关注沙箱、权限提示和敏感操作确认。']
    ]
  }
};
