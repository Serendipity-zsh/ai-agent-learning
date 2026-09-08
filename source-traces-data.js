const PROJECT_SOURCE_TRACES = {
  langchain: {
    title: '从 create_agent 到可执行图：一次工具回合',
    question: '调用 create_agent 后，模型、工具和 middleware 究竟如何获得统一的状态与控制流？',
    state: ['输入：规范化 messages、可用 tools、runtime config', '运行态：AgentState / middleware state、model request、tool calls', '输出：新增 AIMessage / ToolMessage 或最终结果；底层由 compiled LangGraph 负责状态转移'],
    steps: [
      ['构建', 'factory 收集模型、工具、state schema 和 middleware。', '产出带 model node、tool node、条件边的 Graph；middleware 在节点前后包裹 request/state。', '不要把 middleware 当普通 Prompt：它能拒绝、修改或短路执行。'],
      ['模型节点', '从 state 读取 messages 和上下文，编译 provider request。', '返回 AIMessage；若含 tool_calls，调用 ID 与参数必须被保留。', '模型只提议调用，尚未执行外部动作。'],
      ['工具节点', '按 tool_call name 查找工具，schema 校验参数。', '逐调用执行并生成与 call id 配对的 ToolMessage，再写回 state。', '工具异常需要规范化为 observation，不能破坏消息配对。'],
      ['循环/结束', '条件边判断是否还有 tool_calls。', '有则回到模型节点；无则结束并由 graph 返回 state。', '预算、审批、重试应当在 middleware/runtime 层显式实现。']
    ],
    tests: ['给一个 fake model 固定返回 tool_call，断言 ToolMessage 的 tool_call_id 与输入一致。', '让 middleware 拒绝 write tool，断言工具实现从未执行。', '给工具抛 transient error，断言系统记录可分类 error，而不是无界重试。'],
    compare: 'LangChain 将常见 Agent 组装成易用 factory；控制流真正落在 LangGraph。因此遇到复杂恢复、分支与持久化时，应沿 compiled graph 下沉。'
  },
  langgraph: {
    title: '从 StateGraph 到 Pregel：一次 checkpoint/resume',
    question: '为什么 LangGraph 要区分 node、channel、reducer、task 与 checkpoint，而不是按顺序调用 Python 函数？',
    state: ['输入：thread_id、checkpoint config、上一次 state snapshot', '运行态：当前 super-step 的 tasks、channel writes、pending writes', '输出：合并后的 state 与下一个可恢复 checkpoint'],
    steps: [
      ['声明与编译', 'StateGraph 收集 schema、nodes、edges、conditional routes。', 'compile 将声明变成 Pregel 可调度的 channel/task 配置。', 'state 字段 reducer 决定并发写如何合并。'],
      ['super-step', 'runtime 从稳定 snapshot 决定本轮活跃 task。', '同一轮节点各自读取一致的开始 state，输出 writes。', '这避免节点运行先后悄悄成为业务规则。'],
      ['barrier 与 checkpoint', 'runner 汇集 writes，经 reducer 写入 channels。', 'checkpointer 保存 state、metadata、next tasks 和 pending writes。', '外部副作用不是 checkpoint 自动幂等；仍要使用 idempotency key。'],
      ['interrupt/resume', 'interrupt 暂停当前 task，等待外部输入。', 'resume 会从 checkpoint 恢复，并可能重新运行中断 node。', 'interrupt 前的写操作必须移到幂等边界或拆成独立 node。']
    ],
    tests: ['两个并行节点都 append messages，断言 reducer 结果与调度顺序无关。', '在 interrupt 前模拟崩溃和恢复，断言外部 gateway 只收到一个 idempotency key。', '读取历史 checkpoint 进行 time-travel debug，断言不重新执行工具。'],
    compare: 'LangGraph 是显式状态与恢复语义；LangChain 是构建常见 Agent 的组件层。将两者混为“只是不同 API”会错过 durable execution 的核心。'
  },
  mem0: {
    title: '从一段对话到一条可治理记忆：add 的写入路径',
    question: 'Mem0 为什么先抽取候选、再查相似记忆、再决定 ADD/UPDATE/DELETE，而不是直接 embed 全部消息？',
    state: ['输入：messages 与 user/agent/run scope', '运行态：抽取的原子事实、相似 memory、变更 decision', '输出：带 metadata 的 store record 与 history entry'],
    steps: [
      ['候选抽取', 'LLM 从对话提取可能长期有效的原子事实。', '输出应被视为候选，不是可信事实。', '调用者提供的 scope 是隔离前提，不能靠模型猜。'],
      ['近邻查找', 'embedding/vector store 用候选定位现有相似 memory。', '为决策器提供“可能冲突或可合并”的上下文。', '相似不等于同一实体、同一时间或同一否定关系。'],
      ['决策', '模型/规则在 ADD、UPDATE、DELETE、NOOP 间选择。', '更新需保留旧值和 operation history。', '高风险或低可信来源应由调用方 gate，而不盲信 decision。'],
      ['召回', 'search 按 query 与 filters 返回记录。', 'Agent 再决定哪些条目进入本轮 context。', '存储可插拔不代表 ACL 自动正确；scope/filter 必须端到端验证。']
    ],
    tests: ['低可信网页候选不能覆盖 explicit-user 记忆。', '同一 key 的 UPDATE 要保留 pre-image 和 version。', 'TTL/deletion 后 vector 召回与 context builder 都不再使用该记录。'],
    compare: 'Mem0 是可插拔的外置 memory service；Letta 则把 memory tools/context manager 置于 Agent runtime 内。前者强调跨框架接入，后者强调 Agent 自主分页与编辑。'
  },
  openclaw: {
    title: '多渠道消息如何变成一次受状态约束的 Agent Run',
    question: 'OpenClaw 为什么同时拥有 Gateway、session manager、embedded runner 与 agent-core，而不把全部逻辑放在一个聊天处理函数？',
    state: ['输入：渠道事件、可信 actor/channel metadata、session key', '运行态：session manifest、transcript、skills、tool allowlist、stream events', '输出：渠道回复、SQLite session/checkpoint、episodic candidate 与 memory consolidation 输入'],
    steps: [
      ['Gateway 与 session', '渠道入口将事件标准化并选择 session。', 'session manager 加载历史、资源 manifest、skills 和持久化状态。', '渠道适配不应改变 agent loop 的核心语义。'],
      ['embedded runner', 'runner 组合 provider、Prompt、工具、compaction 与 streaming。', '把产品级 config 归一化后交给 agent-core。', '这层是产品生命周期边界，而非单个模型 provider adapter。'],
      ['agent-core loop', 'loop 调模型、解析 tool calls、执行工具、产生 observation 与流式事件。', '停止、取消、失败和预算需要在这里形成一致语义。', '工具/网页输出的 provenance 必须跟随到 memory 和最终回复。'],
      ['记忆巩固', 'session events 进入 episodic 层；满足 gate 的候选才被 consolidation 晋升。', 'dreaming/recall 与即时 agent run 解耦。', '避免把 assistant 转述或不可信网页自动升级为用户事实。']
    ],
    tests: ['同一 session 在不同渠道恢复时，验证资源 manifest 与身份 scope 不漂移。', '取消 streaming 后，确认未完成 tool 的状态和最终事件可恢复解释。', '不可信工具输出不得触发 memory 写入或越过 write confirmation。'],
    compare: 'OpenClaw 是完整多渠道个人 Agent 产品 runtime；Hermes 更像 Python 集中式 AIAgent loop；LangGraph 则提供更通用的图/持久化底座。'
  },
  llamaindex: {
    title: '从 Document 到 QueryEngine：RAG 数据路径', question: 'LlamaIndex 如何把文档血缘保留到最终回答？',
    state: ['Document：原始内容与 metadata', 'Node：切分后的可索引单元及 source relationship', 'NodeWithScore：召回结果与得分', 'Response：合成答案及 source nodes'],
    steps: [['摄取', 'Reader/Document 与 parser。', 'Document 被转换为保留 parent/source 的 Nodes。', 'chunk 必须能回到原始 source。'], ['索引', 'StorageContext 与 index/vector store。', 'Nodes、embedding、docstore 写入对应后端。', 'parser/embedding 版本影响可复现性。'], ['查询', 'Retriever 返回 NodeWithScore。', 'postprocessor/reranker 收缩候选，synthesizer 接收证据。', '检索和合成必须独立评估。']],
    tests: ['删除 source 后断言其 Node 不再召回。', '断言 Response 的 evidence 可反查 source/version。'], compare: 'LlamaIndex 围绕数据模型与 QueryEngine；Haystack 围绕 typed component/pipeline。'
  },
  haystack: {
    title: 'Component Pipeline 如何调度确定性 RAG', question: 'Haystack 的 socket/Component 为什么比“函数链”更适合生产 RAG？',
    state: ['Component input/output sockets', 'Pipeline connection 与 ready/deferred 状态', '每个 component 的序列化配置'],
    steps: [['建图', 'component input/output types。', 'Pipeline 检查连接与可达性。', 'schema 不匹配尽早失败。'], ['调度', 'ready component 的输入。', '运行结果写入下游 socket，循环受次数限制。', '确定性 pipeline 与 Agent loop 分层。'], ['工具化', 'PipelineTool 的输入 schema。', '整条验证过的 RAG pipeline 作为一个工具。', '不要让 Agent 重写每个检索步骤。']],
    tests: ['断开 required socket 应在运行前失败。', '循环 Pipeline 达到上限时稳定终止。'], compare: 'Haystack 适合明确 DAG；LangGraph 适合含状态、循环、恢复与 HITL 的运行时。'
  },
  letta: {
    title: 'Memory Tools 如何参与 Context 管理', question: 'Letta 的 core/recall/archival memory 为什么要分层？',
    state: ['Core blocks：常驻 prompt memory', 'Recall：会话/事件历史', 'Archival/MemFS：按需外部知识'],
    steps: [['编译', 'core block 和窗口内消息。', 'context manager 计算 token 并组织 request。', '常驻信息必须少而稳定。'], ['调用 memory tool', '模型提出 edit/search。', '工具修改 block 或外部 store，下一轮重新编译。', '模型提议不绕过 validator/权限。'], ['分页', 'recall/archival 查询。', '只把任务相关结果放入工作集。', '外部 memory 不等于无限上下文。']],
    tests: ['memory edit 被拒绝时 core block 不变。', 'archival result 过期或越权时不可进入 context。'], compare: 'Letta 将记忆置于 stateful Agent 内；Mem0 作为可插拔 memory service。'
  },
  hermes: {
    title: '集中式 AIAgent Loop 的策略汇合点', question: 'Hermes 为什么将 provider、工具、压缩、fallback 与 memory flush 汇聚在 AIAgent？',
    state: ['Prompt builder 输出', 'provider response / tool calls', 'session history、预算、memory candidates'],
    steps: [['构建', 'prompt_builder 根据 provider/tool/skill 组装 request。', 'AIAgent 持有本轮预算与可取消调用。', 'Prompt 与 loop 执行分离。'], ['工具执行', 'tool dispatch/MCP 配置。', '串行或并行结果写回 history。', '每个工具仍要参数和权限边界。'], ['压缩与记忆', '接近窗口时压缩前 flush candidate。', 'memory provider 写入后恢复 loop。', '压缩不能是持久业务状态。']],
    tests: ['provider fallback 不改变 tool/result message contract。', '取消后不接受迟到 tool result 写入 session。'], compare: 'Hermes 的单体 loop 易统一策略；OpenClaw 的多渠道 runtime 分层更强。'
  },
  openhands: {
    title: 'Action/Observation 如何跨越 Agent 与 Sandbox', question: 'OpenHands 如何把模型决策与真实代码执行隔离？',
    state: ['Agent state/events', 'Action：bash/file/browser 等结构化意图', 'Observation：sandbox 返回的可记录结果'],
    steps: [['决策', 'Agent 从 EventStream 读取 observations。', '模型输出 typed Action。', '决策不直接碰宿主文件系统。'], ['执行', 'runtime client 与 ActionExecutor。', '隔离容器执行命令并返回 Observation。', '挂载、网络、资源限制是安全边界。'], ['回放', 'EventStream append-only events。', 'UI/Agent 都消费同一事实流。', 'replay 使用已记录 observation，不随意重跑副作用。']],
    tests: ['禁止网络的 sandbox 无法访问外部地址。', 'action 超时后进程树被清理并记录 observation。'], compare: 'OpenHands 提供开放 sandbox/action runtime；Claude Code 只能依据公开产品行为作架构分析。'
  }
};
