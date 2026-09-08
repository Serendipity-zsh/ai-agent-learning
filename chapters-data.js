const s = (title, paragraphs, extras = {}) => ({ title, paragraphs, ...extras });

const COURSE_CHAPTERS = [
  {
    id: 'system-boundary', number: '00', title: '先建立系统边界：Agent 到底是什么', tag: 'FIRST PRINCIPLES', duration: '4–6 小时',
    thesis: 'Agent 不是“更会聊天的模型”，而是一个把概率决策器放进确定性控制系统的运行时。先分清模型、工具、状态、循环和策略，后续所有框架才不会学成 API 记忆。',
    objectives: ['能画出 Model、Tool、State、Loop、Policy 五部分及其信任边界', '能判断一个需求应该使用普通调用、结构化输出、RAG、Workflow 还是 Agent', '能用事件日志解释一次运行，而不是只看最终答案'],
    diagram: `flowchart LR
  U[User goal] --> C[Context builder]
  C --> M[Model: propose next action]
  M --> P{Policy / permission}
  P -->|allow| T[Tool / environment]
  P -->|deny| M
  T --> O[Observation]
  O --> S[(State + event log)]
  S --> C
  M -->|final or budget exhausted| R[Result]`,
    sections: [
      s('00.1 模型与 Agent 的边界', [
        'LLM 的基本能力是：给定已有 token，计算下一个 token 的条件概率。它不会自行读取数据库、执行命令或永久记住用户。所谓“调用工具”，是模型输出一段符合协议的调用意图，再由应用程序校验和执行。',
        '因此 Agent 至少包含五个部分：Model 负责提出下一步；Tool 把文本意图连接到真实世界；State 保存运行事实；Loop 决定继续还是停止；Policy 决定哪些动作允许发生。模型是概率组件，其余部分应尽量可测试、可观测、可恢复。'
      ], { callout: '判断准则：如果去掉运行时循环后系统仍能一次完成任务，它通常只是 LLM 调用或 Workflow，不必包装成 Agent。' }),
      s('00.2 五种方案的选择顺序', [
        '普通调用适合翻译、摘要等单步生成；结构化输出适合分类和抽取；2-Step RAG 适合“先固定检索、再回答”；Workflow 适合步骤已知、分支可枚举的流程；只有当下一步必须依据运行时观察动态决定时，才需要 Agent。',
        'Agent 增加的是适应性，也同时增加路径数量、延迟方差、成本和风险。工程目标不是让模型“更自主”，而是在任务所需范围内给它最小自由度。'
      ], { diagram: `flowchart TD
  Q{一步能完成?} -->|是| L[普通 LLM]
  Q -->|否| K{只缺外部知识?}
  K -->|是| R[2-Step RAG]
  K -->|否| F{步骤可预先枚举?}
  F -->|是| W[Workflow / Graph]
  F -->|否| A[Bounded Agent loop]` }),
      s('00.3 从最终答案切换到事件视角', [
        '同一句最终答案可能来自完全不同的执行过程：一次正确检索、一次偶然猜中，或者越权读取后再回答。生产系统必须保存输入版本、模型请求、工具参数、工具结果、状态变化、权限决策和停止原因。',
        '课程后续统一采用“事件 → 状态 → 决策”的观察方式。你需要能回答：模型看到了什么；为什么调用这个工具；真实环境返回什么；哪条策略批准或拒绝；运行为什么结束。'
      ], { code: `event = {
    "run_id": "run_42",
    "seq": 7,
    "type": "tool_result",
    "tool_call_id": "call_3",
    "payload": {"status": "ok", "rows": 12},
    "policy": {"decision": "allow", "rule": "read_only"}
}` })
    ],
    topicIds: ['message-protocol', 'agent-loop', 'session-event-log', 'authorization'],
    lab: { title: '实验：拆解一个项目管理助手', steps: ['列出三类用户任务：查进度、总结风险、创建工单。', '分别选择普通调用、RAG、Workflow 或 Agent，并写出理由。', '为“创建工单”画出确认前后事件序列和失败分支。'], acceptance: ['图中明确 Model、Tool、State、Loop、Policy', '写操作必须有确定性权限与确认步骤', '能从事件记录还原运行路径'] }
  },
  {
    id: 'model-foundation', number: '01', title: '从 Token 到生成：理解 LLM 的能力边界', tag: 'MODEL', duration: '10–14 小时',
    thesis: '理解 Transformer 不是为了训练基础模型，而是为了正确推导上下文成本、长文本失效、采样不稳定和模型幻觉这些 Agent 工程现象。',
    objectives: ['手算一次小型 self-attention 并解释因果 mask', '区分 prefill、decode、KV cache 与 prompt cache', '解释为什么 temperature=0 也不能保证事实正确'],
    diagram: `flowchart LR
  Text --> Tok[Tokenizer]
  Tok --> Emb[Token + position embedding]
  Emb --> Blocks[Transformer blocks × N]
  Blocks --> Logits
  Logits --> Sample[Decoding]
  Sample --> Next[Next token]
  Next -.append.-> Tok`,
    sections: [
      s('01.1 Token 是系统的真实计量单位', ['字符只是界面单位，模型接收的是 token id。系统指令、历史消息、工具 schema、检索结果和输出都争夺同一个上下文窗口。中英文、代码、UUID 与 JSON 的 token 密度不同，所以不能用字符数做预算。', '可靠的 context builder 会先为输出和工具回合预留空间，再按优先级装入历史和证据；超限时应明确丢弃或压缩哪一层，而不是等待 provider 随机截断。']),
      s('01.2 Attention 做了什么', ['每个位置产生 Query、Key、Value。Query 与允许访问位置的 Key 点积，缩放后 softmax 得到权重，再对 Value 加权求和。多头机制让不同子空间同时学习局部语法、指代和长程关系。', '因果 mask 只保证看不到未来，并不保证注意到正确证据。上下文越长，竞争信息越多，关键规则放在中间还可能出现“lost in the middle”。'], { code: `scores = (Q @ K.T) / sqrt(d_head)
scores = scores + causal_mask   # future positions -> -inf
weights = softmax(scores, axis=-1)
context = weights @ V` }),
      s('01.3 推理性能：prefill 与 decode', ['Prefill 并行处理整个输入，首 token 延迟随输入长度上升；decode 每次生成一个 token，主要受 KV cache 带宽和模型规模影响。Agent 每多一次工具回合，通常就增加一次模型请求和新的 prefill。', 'KV cache 是单次生成内部对历史 Key/Value 的缓存；provider prompt caching 是跨请求复用稳定前缀的产品能力。两者名字相近但生命周期不同。']),
      s('01.4 采样、对齐与幻觉', ['模型输出的是分布。降低 temperature 只是让选择更集中，不会把未知事实变成已知。SFT 与偏好训练提高指令遵循和工具格式能力，也不是数据库约束或权限系统。', '需要新事实时用检索，需要业务合法性时用代码验证，需要外部行动时用权限与 sandbox。Prompt 只能影响概率，不能替代强制边界。'])
    ],
    topicIds: ['tokenization', 'embeddings', 'self-attention', 'transformer', 'logits', 'kv-cache', 'context-window', 'prompt-caching', 'decoding', 'alignment'],
    lab: { title: '实验：实现并观察最小 attention', steps: ['用 NumPy 实现单头 scaled dot-product attention。', '改变 mask、上下文长度和无关 token，打印权重与输出。', '对同一 JSON 抽取任务运行 20 次，比较不同 temperature 的结构成功率与事实错误。'], acceptance: ['能解释每个 tensor 的 shape', '报告区分结构稳定性与事实正确率', '记录输入/输出 token 与首 token 延迟'] }
  },
  {
    id: 'prompt-protocol', number: '02', title: 'Prompt 不是文案：它是可测试的运行协议', tag: 'PROMPT', duration: '10–12 小时',
    thesis: '高质量 Prompt Engineering 的核心不是措辞技巧，而是指令层级、上下文分区、输出契约、版本管理与回归评估。',
    objectives: ['设计 provider 无关的内部消息协议', '区分语法校验、字段校验和业务语义校验', '建立包含边界与攻击样本的 Prompt 回归集'],
    diagram: `flowchart TB
  Policy[Policy: trusted] --> Build[Prompt compiler]
  Task[User task] --> Build
  Context[Retrieved/tool data: untrusted] --> Build
  Schema[Output contract] --> Build
  Examples[Few-shot examples] --> Build
  Build --> Provider[Provider adapter]
  Provider --> Validate[Parse + semantic validate]`,
    sections: [
      s('02.1 把 Prompt 拆成不同信任层', ['Policy 定义允许和禁止的行为；Task 描述本次用户目标；Context 是检索或工具返回的不可信数据；Output contract 规定机器要消费的结构。把它们混成一个长字符串，会丢失来源和冲突边界。', '应用应维护规范化消息和 typed content blocks，再由 adapter 转换成不同 provider 协议。tool_call_id、来源、时间与 trust level 都应保留。']),
      s('02.2 Structured Output 的三层正确性', ['第一层是 JSON 可解析；第二层是满足 schema；第三层是业务语义正确。例如 project_id 字段即使是合法字符串，也可能引用不存在或无权访问的项目。', '模型约束解码负责前两层，实体解析、数据库查询和权限策略负责第三层。失败可把精确校验错误返回模型修复，但必须限制重试，避免无限自纠。'], { code: `class CreateTask(BaseModel):
    project_id: str
    title: str = Field(min_length=1, max_length=120)

draft = model.with_structured_output(CreateTask).invoke(messages)
project = repository.get_visible_project(actor, draft.project_id)
if project is None:
    raise SemanticValidationError("unknown or inaccessible project")` }),
      s('02.3 Few-shot 是数据，不是装饰', ['示例会改变模型的条件分布。选择代表性正例、边界例与拒答例，比堆十个相似成功案例更有效。示例本身也要版本化、去敏，并与真实上下文严格分隔。', '动态示例检索适合标签多、格式差异大的任务，但错误示例会系统性误导当前输入，因此必须离线比较 zero-shot 与 few-shot。']),
      s('02.4 用评估迭代 Prompt', ['先固定任务集、模型参数和评分 rubric，再修改 Prompt。格式、工具名、关键字段可规则评分；开放答案可由人工或校准后的 LLM judge 评分。', '不要只汇报平均分。高风险动作漏拦截必须是独立门禁；结果至少按任务类型、输入长度、语言和版本切片。'])
    ],
    topicIds: ['message-protocol', 'instruction-hierarchy', 'in-context-learning', 'few-shot', 'structured-output', 'semantic-validation', 'prompt-evaluation'],
    lab: { title: '实验：构建可回归的任务抽取器', steps: ['定义 30 条 golden/boundary/adversarial 样本。', '实现 provider adapter、Pydantic schema 与语义实体校验。', '比较三版 Prompt，输出逐类错误矩阵。'], acceptance: ['每次运行可重放并记录 Prompt/模型版本', '结构合法但实体错误会被单独捕获', '攻击文本不会进入高信任指令区'] }
  },
  {
    id: 'rag-system', number: '03', title: 'RAG 全链路：从原始文档到可验证答案', tag: 'RETRIEVAL', duration: '22–30 小时',
    thesis: 'RAG 不是“向量库 + Prompt”。它是一条包含数据摄取、切分、召回、融合、重排、上下文装配、引用和评估的数据系统。',
    objectives: ['实现带 source/version/ACL 的增量索引', '用 BM25 + dense + RRF + reranker 构建混合检索', '分别评估检索质量与生成质量并定位故障层'],
    diagram: `flowchart LR
  Docs --> Parse[Parse / OCR]
  Parse --> Chunk[Structure-aware chunks]
  Chunk --> Meta[Source + version + ACL]
  Meta --> Sparse[(BM25)]
  Meta --> Dense[(Vector index)]
  Q[Question] --> Rewrite[Rewrite / filters]
  Rewrite --> Sparse
  Rewrite --> Dense
  Sparse --> Fuse[RRF fusion]
  Dense --> Fuse
  Fuse --> Rank[Reranker]
  Rank --> Pack[Context packer]
  Pack --> Answer[Answer + citations]
  Answer --> Eval[Grounding / retrieval eval]`,
    sections: [
      s('03.1 摄取是长期运行的数据管道', ['Loader 只解决“拿到文件”；真正的 ingest 还要处理 OCR、版面、表格、增量更新、删除、权限和失败重试。每个 chunk 必须能够反向定位到原文页码、标题、版本与访问控制。', '用 checksum 判断内容变化，用 parser/embedding/index version 标记派生物。删除不能只从源系统消失，应向索引发送 tombstone，避免旧知识继续被召回。']),
      s('03.2 Chunking 决定证据粒度', ['小块提高局部匹配，却可能丢失条件、定义域和表头；大块保留上下文，却降低匹配精度并消耗窗口。通用固定长度只是起点，正式系统应按标题、段落、表格、代码语法等结构切分。', '常用改进是 parent-child：用小块检索，用父块送入模型。实验时不要问“哪个 chunk size 最好”，而要在真实问答集上比较召回覆盖与 token 成本。']),
      s('03.3 Dense、Sparse 与 Hybrid', ['Embedding 擅长语义近似，BM25 擅长错误码、专名和精确字符串。Hybrid 先独立召回，再用 Reciprocal Rank Fusion 按名次合并，避免直接混合不可比的分数尺度。', '第一阶段目标是高召回；reranker 再精排有限候选。所有阶段要保留候选来源、原始分数、融合名次和过滤原因，否则相关性问题无法诊断。'], { code: `def rrf(rankings, k=60):
    scores = defaultdict(float)
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] += 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)` }),
      s('03.4 Query Rewrite 与 Agentic RAG', ['多轮问题常含“它”“上个版本”等指代，需要改写成独立查询。多查询与 HyDE 能提高召回，也会增加延迟并可能加入模型臆测，因此必须保留原始查询并验证 rewrite 带来的 retrieval delta。', '默认先做 2-Step RAG。只有来源不确定、多跳搜索或检索策略必须依据观察动态变化时，才升级为 Hybrid/Agentic RAG，并为检索次数、来源和总 token 设预算。']),
      s('03.5 引用与评估闭环', ['引用不是在答案末尾放链接，而是让每个重要断言映射到具体 evidence span。context packer 给证据稳定 ID，生成器输出 claim-evidence 映射，verifier 检查引用是否真的支持断言。', '检索评估使用 Recall@k、MRR、nDCG 和 evidence coverage；生成评估使用 faithfulness、answer correctness、citation precision/recall。若正确证据根本没进 top-k，继续改 Prompt 没有意义。'])
    ],
    topicIds: ['document-ingestion', 'chunking', 'embeddings', 'vector-search', 'bm25', 'hybrid-search', 'reranking', 'query-rewrite', 'agentic-rag', 'citation-grounding', 'answer-validation', 'retrieval-evaluation', 'metadata-acl', 'index-versioning'],
    lab: { title: '实验：带证据与权限的混合 RAG', steps: ['选择 100–300 篇带版本的 Markdown/PDF，构建增量 ingest。', '实现 BM25、向量、RRF 和 cross-encoder rerank，对每阶段输出 trace。', '建立至少 50 个问题，包含无答案、旧版本和无权限文档。', '答案按 claim 引用 evidence ID，并提供原文跳转。'], acceptance: ['检索和生成指标分开报告', '无权限文档在进入生成上下文前被过滤', '能用 trace 解释一个失败是 parse、retrieve、rank 还是 generate'] }
  },
  {
    id: 'agent-runtime', number: '04', title: 'Agent Runtime：工具、循环与副作用控制', tag: 'RUNTIME', duration: '20–28 小时',
    thesis: 'Agent 的难点不在让模型会调用工具，而在把每一步变成有预算、有权限、可重试、可回放且不会重复副作用的状态转换。',
    objectives: ['不依赖框架实现最小 Agent loop', '区分模型重试、工具重试和业务补偿', '为写操作实现确认、幂等与 read-back'],
    diagram: `stateDiagram-v2
  [*] --> BuildContext
  BuildContext --> ModelCall
  ModelCall --> Validate
  Validate --> ToolDispatch: tool call
  Validate --> Complete: final answer
  Validate --> Failed: invalid + no retries
  ToolDispatch --> Confirm: side effect
  ToolDispatch --> Execute: read only
  Confirm --> Execute: approved
  Confirm --> Complete: rejected
  Execute --> Observe
  Observe --> BuildContext
  Complete --> [*]
  Failed --> [*]`,
    sections: [
      s('04.1 Tool contract 是类型化边界', ['工具描述必须告诉模型何时使用；schema 限制参数形状；runtime 还要做业务校验、授权、超时和结果规范化。Schema 是给模型和程序共同使用的协议，不是函数注释。', '工具结果应返回稳定结构，如 status、data、error_code、retryable、provenance，而不是把任意异常堆栈直接塞回上下文。']),
      s('04.2 最小 Loop 与停止条件', ['ReAct 把 Reason/Act/Observe 交替显式化。实际 API 常把隐藏推理留给模型，只持久化可审计的 tool call 与 observation。每轮先编译上下文，再调用模型、解析动作、过策略、执行工具、追加事件。', '停止条件至少包括：final answer、最大轮数、token/费用/时间预算、连续无进展、用户取消和不可恢复错误。没有预算的 while 循环不是 Agent runtime。'], { code: `while budget.can_continue(state):
    request = context_builder.build(state)
    response = model.invoke(request)
    action = protocol.parse(response)
    if action.is_final:
        return action.answer
    call = policy.authorize(actor, action.tool_call)
    observation = tools.execute(call, timeout=call.timeout)
    state.append(observation)
raise BudgetExceeded(state.stop_reason)` }),
      s('04.3 重试不是同一件事再做一次', ['429、网络断开等瞬时故障可指数退避；参数校验失败可把精确错误返回模型修正；业务拒绝通常不应重试。写工具若第一次实际成功但响应丢失，盲目重试会产生重复工单或付款。', '副作用工具应接受 idempotency key，服务端保存请求指纹与结果。若无法天然幂等，就使用 prepare → confirm → one-shot execute → read-back → receipt。']),
      s('04.4 MCP 的位置', ['MCP 统一了客户端发现工具、资源和 Prompt 的协议，减少每个 Agent 对每个系统写专用 adapter。它不自动提供业务授权、安全沙箱或正确的幂等语义。', '把 MCP server 看成能力边界：server 仍需验证 actor、scope 和参数；client 仍需决定把哪些 server/tool 暴露给当前运行。'])
    ],
    topicIds: ['tool-schema', 'tool-calling', 'react', 'agent-loop', 'loop-budget', 'retry-policy', 'human-confirmation', 'idempotency', 'mcp'],
    lab: { title: '实验：框架无关的项目助手', steps: ['实现 list_projects、get_status、create_task 三个类型化工具。', '实现事件追加、轮次/时间预算、取消和错误分类。', 'create_task 使用 prepare/confirm/idempotency/read-back。', '注入一次“成功但响应丢失”，证明不会创建重复任务。'], acceptance: ['单元测试覆盖停止、重试、拒绝和重复请求', '任何写操作都有 actor 与 receipt', '日志可回放到相同确定性状态'] }
  },
  {
    id: 'context-engineering', number: '05', title: 'Context Engineering：给模型正确的工作集', tag: 'CONTEXT', duration: '14–18 小时',
    thesis: 'Context Engineering 是在有限窗口中选择、组织、标注和刷新信息的系统工程；它决定模型此刻能基于哪些事实做决策。',
    objectives: ['设计带优先级与 token budget 的 context builder', '区分删除大工具结果、摘要压缩与外部检索', '用 provenance 防止不可信内容伪装成指令'],
    diagram: `flowchart TB
  P[Policy lane] --> B[Context builder]
  T[Task lane] --> B
  W[Working state] --> B
  E[Evidence lane] --> B
  H[History lane] --> B
  M[Memory lane] --> B
  B --> C{Token budget}
  C -->|fit| Req[Model request]
  C -->|overflow| Drop[Evict / summarize / externalize]
  Drop --> B`,
    sections: [
      s('05.1 Context 是编译产物', ['模型请求不应等同于“数据库里的全部聊天记录”。Context builder 从 policy、task、working state、evidence、history、memory 和 tool definitions 选择当前最小充分工作集。每个 lane 有独立优先级、预算与截断策略。', '这类似编译器：持久状态是源数据，最终 provider messages 是目标表示。你应该可以在 trace 中看到每个片段为何被选中、占多少 token、来自哪里。']),
      s('05.2 Working memory 与外部事实', ['Working memory 保存当前 run 的计划、工具结果和未完成事项；RAG 提供外部世界事实；long-term memory 保存跨会话用户或经验信息。三者生命周期和可信度不同，不能统一叫“memory”后全部向量检索。', '工具返回的大 JSON 应先转成结构化 state 或 artifact reference，仅把下一步需要的字段放回模型上下文。']),
      s('05.3 Compaction 的信息损失', ['Compaction 用较短摘要替换旧消息，可释放窗口但无法无损恢复。摘要模型可能漏掉承诺、错误细节和未完成条件，所以关键状态必须单独结构化保存。', '常见策略是先清理可重新获取的 tool outputs，再总结旧对话，再把完整 transcript 保存在窗口外。压缩前可触发 memory flush，提取真正跨会话有价值的信息。']),
      s('05.4 Provenance 是数据结构', ['每段上下文至少要知道 source、timestamp、version、actor、trust 与 evidence ID。不可信网页写着“忽略之前规则”时，它仍是 data lane，不得提升到 policy lane。', 'Provenance 还支持引用、过期、删除和审计。没有来源字段的长期记忆无法安全更新，也无法回答“我为什么记得这件事”。'])
    ],
    topicIds: ['working-memory', 'context-builder', 'compaction', 'provenance', 'tokenization'],
    lab: { title: '实验：可解释的 Context Builder', steps: ['定义六类 context lane 和各自优先级。', '实现 token 预算、输出预留、去重、过期与来源标注。', '构造超长工具输出，比较截断、摘要、artifact reference 三种策略。'], acceptance: ['每次请求输出 context manifest', '关键任务状态不依赖摘要保存', '不可信检索内容无法改变 policy'] }
  },
  {
    id: 'memory-system', number: '06', title: 'Memory Engineering：写入、召回、遗忘与巩固', tag: 'MEMORY', duration: '18–24 小时',
    thesis: '长期记忆不是保存所有聊天，而是对候选事实执行有来源的写入决策，并在正确作用域、正确时机以有限预算召回。',
    objectives: ['区分 episodic、semantic、procedural memory', '实现 ADD/UPDATE/DELETE/NOOP 写入策略', '评估记忆的写入准确率、召回率、陈旧率和污染率'],
    diagram: `flowchart LR
  Events --> Extract[Candidate extraction]
  Extract --> Gate{Write policy}
  Gate -->|episode| EP[(Episodic log)]
  Gate -->|fact| SM[(Semantic memory)]
  Gate -->|procedure| SK[(Skills)]
  EP --> Con[Consolidation]
  Con --> SM
  Q[Current task] --> Recall[Scoped retrieval]
  SM --> Recall
  SK --> Recall
  Recall --> CB[Context builder]`,
    sections: [
      s('06.1 三类长期记忆', ['Episodic memory 是“发生过什么”的带时间事件；semantic memory 是“相对稳定的事实”；procedural memory 是“如何做”的步骤、技能或规则。它们的写入条件、检索方式和失效周期不同。', '用户说“我今天在上海”适合短期事件；“我偏好中文回答”可能晋升为语义偏好；一次成功部署流程经验证后可形成程序性 skill。']),
      s('06.2 写入比检索更危险', ['把所有对话向量化会保存误解、玩笑、敏感信息与提示注入。安全的 memory writer 先提取原子候选，再与现有记忆比较，决定 ADD、UPDATE、DELETE 或 NOOP，并附上来源和置信度。', '确定性规则应优先处理作用域、敏感字段、过期和用户显式删除；LLM 只负责难以结构化的抽取或冲突建议。删除需要传播到向量索引、缓存和派生摘要。']),
      s('06.3 召回与巩固', ['召回不只按语义相似，还要考虑 user/agent/session scope、时间、新鲜度、重要性、可信度和任务类型。召回结果进入 context builder 前仍需去重和预算控制。', 'Consolidation 把多条 episode 合并为稳定事实或更新已有事实，类似记忆“巩固”。它必须有最小证据数、冲突处理、回滚与审计，否则模型会把偶然事件固化为长期真相。']),
      s('06.4 Memory 的评估对象', ['写入评估问“该不该记、记成什么”；召回评估问“该出现的是否出现、不该出现的是否泄露”；应用评估问“被召回的记忆是否改善任务”。三者不能用同一个最终回答分数替代。', '还要测 stale memory、cross-user leakage、contradiction、deletion completeness 和 prompt injection persistence。'])
    ],
    topicIds: ['episodic-memory', 'semantic-memory', 'user-profile', 'procedural-memory', 'memory-write-policy', 'memory-consolidation', 'provenance'],
    lab: { title: '实验：可删除、可追溯的长期记忆', steps: ['为对话生成候选事实并实现四类写入操作。', '增加 user/session scope、provenance、TTL 与版本。', '构造偏好更新、事实冲突、恶意网页和删除请求。', '报告 write/recall/usefulness 与安全指标。'], acceptance: ['删除后所有派生索引都无法召回', '每条记忆可定位到原始事件', '恶意工具内容不会自动晋升为长期规则'] }
  },
  {
    id: 'graph-runtime', number: '07', title: 'Graph Engineering：状态、节点与可恢复执行', tag: 'LANGGRAPH', duration: '20–26 小时',
    thesis: '图不是为了把流程画漂亮，而是把隐含在 while/if 中的状态转换、并行、恢复和人工中断变成显式运行模型。',
    objectives: ['设计最小且可序列化的 state schema', '解释 Pregel superstep、reducer 和 checkpoint', '实现中断后恢复且不重复副作用的 LangGraph'],
    diagram: `flowchart LR
  START --> Plan
  Plan --> Search
  Plan --> Read
  Search --> Merge[Reducer]
  Read --> Merge
  Merge --> Review{Enough evidence?}
  Review -->|no| Plan
  Review -->|yes| Human[Interrupt / approval]
  Human --> Write
  Write --> Verify
  Verify --> END`,
    sections: [
      s('07.1 State schema 是工作流协议', ['节点应接收状态快照并返回增量 update，而不是在任意全局对象上修改。字段要有明确 owner、类型和 merge 规则。并行节点同时写同一字段时，reducer 决定追加、覆盖还是冲突。', '不要把所有消息、客户端和数据库连接塞进 state。可恢复状态必须小、可序列化、可迁移；大 artifact 保存引用。']),
      s('07.2 Pregel superstep', ['LangGraph 的 Pregel 风格执行把当前可运行节点组成一个 superstep；节点基于同一逻辑状态执行，更新经 channel/reducer 合并后在下一步可见。这样并行与合并语义比手写 Promise.all/线程共享状态更清楚。', '理解 superstep 能解释为什么某个节点看不到同一轮兄弟节点刚写的值，也能帮助设计 map-reduce 和循环。']),
      s('07.3 Checkpoint 与 durable execution', ['Checkpoint 保存 thread 在某一步的 channel values、版本和待执行任务。恢复不是从头再跑，而是从已提交状态继续。持久化后端还承担并发控制、序列化兼容和历史查询。', '确定性重放无法自动撤销已经发生的外部副作用。写工具必须把 idempotency key 或业务 receipt 存入 state，恢复后先 read-back 再决定是否执行。']),
      s('07.4 Interrupt 与时间旅行', ['人工审批应是图中的持久化中断点，不是进程内 input()。系统保存待审批 payload，进程可以退出；批准事件到达后用同一 thread/checkpoint 恢复。', 'Time travel 或 fork 适合调试不同分支，但外部世界不会跟着回滚。因此它只能重放模型和状态，不应假装撤销邮件、工单或付款。'])
    ],
    topicIds: ['state-schema', 'pregel-superstep', 'checkpoint', 'durable-execution', 'human-confirmation', 'idempotency'],
    lab: { title: '实验：可中断、可恢复的研究图', steps: ['使用 LangGraph 实现 plan/search/read/merge/review 循环。', '并行搜索两个来源，用 reducer 合并证据。', '写入动作前 interrupt，重启进程后批准并恢复。', '在执行成功但 checkpoint 写入失败的场景验证幂等。'], acceptance: ['进程重启不丢失 thread 状态', '并行字段有明确 reducer', '恢复不重复副作用', '可查看每一步 state diff'] }
  },
  {
    id: 'multi-agent', number: '08', title: 'Multi-agent：上下文隔离，而不是角色扮演', tag: 'ORCHESTRATION', duration: '14–18 小时',
    thesis: '多 Agent 的主要价值是隔离上下文、权限和并行工作；如果只是让几个相同模型互相聊天，通常只会增加成本和误差。',
    objectives: ['比较 router、handoff、subagent、planner-executor 和 map-reduce', '为父子 Agent 定义任务、预算、返回协议和取消传播', '判断何时一个图节点或普通函数更合适'],
    diagram: `flowchart TB
  Parent[Coordinator] --> Contract[Typed task contract]
  Contract --> A[Research worker]
  Contract --> B[Code worker]
  Contract --> C[Review worker]
  A --> Art[(Artifacts)]
  B --> Art
  C --> Art
  Art --> Merge[Deterministic merge / parent synthesis]
  Merge --> Parent`,
    sections: [
      s('08.1 先选择控制模式', ['Router 为每次输入选择一个专家；handoff 把对话控制权交给另一个 Agent；subagent 接收有限任务并把结果返回父 Agent；planner-executor 先产生计划再调度；map-reduce 将独立分片并行处理再聚合。', '选择标准是状态所有权和依赖关系，不是给角色取多少名字。若步骤完全确定，普通 DAG 节点比 Agent 更便宜、更容易测。']),
      s('08.2 子 Agent 的合同', ['父 Agent 应发送 typed task：目标、输入引用、允许工具、预算、完成标准和返回 schema。子 Agent 不应默认继承全部聊天、凭证和文件访问权限。', '大型输出写入 artifact store，只把摘要、路径和校验信息返回父 Agent。这样减少上下文复制，也便于多个 worker 共享结果。']),
      s('08.3 并发、取消与失败传播', ['并行只适合无依赖分支。共享写状态会产生竞态，应使用 append-only events、独立工作区或显式 reducer。父任务取消时要传播到模型调用、工具和子任务。', '失败策略可以 fail-fast、best-effort 或 quorum，但必须在任务开始前定义。让父模型临时决定所有恢复策略会带来不可预测路径。']),
      s('08.4 多 Agent 的评估', ['除了最终质量，还要记录 delegation accuracy、重复工作率、上下文复制 token、worker 利用率、临界路径延迟和合并冲突。', '若多 Agent 相比单 Agent 没有提高质量或墙钟时间，删除它通常是更好的优化。'])
    ],
    topicIds: ['router-handoff', 'subagents', 'planner-executor', 'map-reduce', 'loop-budget'],
    lab: { title: '实验：并行源码研究团队', steps: ['父 Agent 将一个项目拆成架构、数据流、安全三个任务。', '三个 worker 只获得各自文件范围和预算。', '结果保存为 artifacts，父 Agent 用 schema 合并并引用证据。', '与单 Agent 基线比较成本、时间和错误。'], acceptance: ['没有共享可变工作区竞态', '每条结论保留源码路径或官方文档证据', '报告证明使用多 Agent 的收益或明确判定无收益'] }
  },
  {
    id: 'production', number: '09', title: '从 Demo 到生产：评估、追踪、安全与成本', tag: 'PRODUCTION', duration: '24–32 小时',
    thesis: '生产 Agent 的可靠性来自系统边界和持续测量，而不是一次令人惊艳的演示。评估、可观测性、权限和隔离必须和功能一起设计。',
    objectives: ['建立离线回归、在线监控与人工复核闭环', '实现 prompt injection 到 tool execution 的纵深防御', '用阶段化指标优化首 token、工具等待和总成本'],
    diagram: `flowchart TB
  Dataset --> Offline[Offline regression]
  Offline --> Gate{Release gate}
  Gate -->|pass| Prod[Production traffic]
  Prod --> Trace[Traces + events + cost]
  Trace --> Monitor[Online monitors]
  Monitor --> Failures[Failure taxonomy]
  Failures --> Dataset
  Policy[Auth + sandbox + approvals] --> Prod`,
    sections: [
      s('09.1 评估是分层诊断系统', ['把任务拆成 route、retrieve、tool selection、argument、policy、execution 和 final answer。每层都保留可自动判断的合同；最终文本质量只是最后一层。', 'Golden 集覆盖常见任务，boundary 集覆盖缺字段/歧义，adversarial 集覆盖注入和越权，线上失败持续回灌。高风险安全项采用零容忍 gate，不被平均分稀释。']),
      s('09.2 Trace 与 Event Log 的分工', ['Trace 用 span 表示父子耗时与调用关系；event log 表示可重放的状态事实。一次 tool span 可以对应 tool_requested、policy_allowed、tool_started、tool_result 多个事件。', '敏感 Prompt/工具结果要分级采样和脱敏。可观测性本身也有泄露风险，不能为了调试无条件保存所有上下文。']),
      s('09.3 Prompt Injection 的纵深防御', ['输入检测只能降低噪音，不能证明安全。核心防线是来源分区、最小工具暴露、服务端授权、写操作确认、网络/文件 sandbox、结果验证和审计。', '模型看到恶意网页后即使被诱导，也不应拥有读取密钥、修改生产或向任意域外传的能力。把 blast radius 降低，比判断每一句文本是否恶意更可靠。']),
      s('09.4 延迟与成本分解', ['总延迟分为 context build、queue、prefill/TTFT、decode、tool wait、重试和 graph scheduling。总成本分为 input/output/cache token、检索、rerank、工具和基础设施。', '先减少不必要模型回合和上下文，再考虑小模型路由或缓存。小模型并不自动更便宜：如果错误导致更多循环和人工修复，总成本可能更高。']),
      s('09.5 Streaming 与取消', ['Streaming 改善感知延迟，也引入半成品输出、连接断开、背压和取消传播。UI 收到文本不代表运行已经持久化或工具副作用已提交。', '事件协议应有 run/message/sequence id，客户端去重，服务端明确 completed/cancelled/failed 终态。取消信号要传到模型流、工具与子 Agent。'])
    ],
    topicIds: ['evaluation', 'llm-as-judge', 'regression-gate', 'tracing', 'session-event-log', 'prompt-injection', 'guardrails', 'authorization', 'sandbox', 'openhands-runtime', 'streaming', 'cost-latency', 'model-routing'],
    lab: { title: '实验：为前面系统建立生产门禁', steps: ['给每层定义事件与指标，接入 trace。', '创建 100 条回归集和 20 条攻击集。', '实现资源级授权、容器/网络限制与写确认。', '做一次模型升级对比，给出是否发布的证据。'], acceptance: ['失败能定位到具体层而非统称幻觉', '高风险权限测试全部通过', '成本与 P50/P95 延迟按阶段报告', '取消后没有遗留子任务或未知副作用'] }
  },
  {
    id: 'frameworks', number: '10', title: 'LangChain 与 LangGraph：从组件抽象到运行时语义', tag: 'FRAMEWORKS', duration: '18–24 小时',
    thesis: 'LangChain 提供模型、消息、工具、retriever 与 middleware 的标准组件；LangGraph 提供状态图、checkpoint、interrupt 与 durable execution。它们是互补层，而不是二选一。',
    objectives: ['能在不用框架时解释每个抽象对应的原始机制', '能追踪 LangChain agent factory 到 LangGraph runtime 的调用关系', '知道何时使用 LCEL、Agent、Graph 或普通 Python'],
    diagram: `flowchart TB
  App --> LC[LangChain components]
  LC --> Msg[Messages]
  LC --> Model[ChatModel]
  LC --> Tools[Tools / middleware]
  LC --> Ret[Retrievers]
  App --> LG[LangGraph runtime]
  LG --> State[StateGraph / channels]
  LG --> Pregel[Pregel execution]
  LG --> CP[Checkpointer / store]
  LG --> INT[Interrupt / resume]
  LC --> LG`,
    sections: [
      s('10.1 LangChain 解决集成一致性', ['LangChain Core 把 provider 差异映射到统一 Messages、ChatModel、Tool 和 Runnable；高层 create_agent 组合模型、工具、结构化输出和 middleware。它适合替换 provider、复用集成和快速组装。', '抽象会隐藏实际消息与调用成本，所以调试时要能下钻到 provider request、tool schema 和 trace。不要在尚未理解 loop 时直接堆链。']),
      s('10.2 LangGraph 解决长任务执行语义', ['StateGraph 编译成 Pregel 风格 runtime，节点读 state 并返回 update，edge/router 决定下一步，checkpointer 以 thread 为单位保存执行状态。', '当需要循环、并行、审批、进程重启恢复和状态历史时，Graph 的显式语义优于手写 while；简单线性转换则无需上图。']),
      s('10.3 两者如何组合', ['LangChain 的模型、tool 与 middleware 可以放入 LangGraph 节点；LangChain 的高层 Agent 也可建立在 LangGraph 上。应用层拥有业务 state 和 policy，框架负责通用协议与调度。', '学习顺序应是：原生模型调用 → 自写最小 loop → LangChain 组件 → LangGraph runtime。这样能识别框架提供了什么，以及哪里仍需自己负责。']),
      s('10.4 源码阅读路线', ['LangChain 先读 langchain_core/messages、tools、runnables，再看 langchain/agents/factory.py 与 middleware；LangGraph 先读 graph/state、pregel，再读 checkpoint base、serde 和 SQLite/Postgres 实现。', '阅读时追踪一个最小样例：公共 API 如何构造对象、类型怎样流动、何处调用模型、状态何时提交、错误如何传播。把观察写成 sequence diagram 和 contract test。'])
    ],
    topicIds: ['tool-calling', 'state-schema', 'pregel-superstep', 'checkpoint', 'durable-execution', 'mcp'],
    projectIds: ['langchain', 'langgraph'],
    lab: { title: '实验：同一助手的三种实现', steps: ['用纯 Python 实现最小 loop。', '用 LangChain create_agent 重写并比较消息/tool contract。', '用 LangGraph 增加 checkpoint、interrupt 和恢复。', '记录每版代码量、可观测性、恢复能力和认知成本。'], acceptance: ['三版行为使用同一测试集', '能指出框架抽象对应的底层代码位置', '选择最终架构时有数据而非偏好'] }
  },
  {
    id: 'capstone', number: '11', title: '毕业项目：企业知识与工单 Agent', tag: 'CAPSTONE', duration: '40–60 小时',
    thesis: '把检索、工具、记忆、图、评估和安全组合成一个可运行、可验证、可恢复的系统，并用设计文档证明每个复杂度都有必要。',
    objectives: ['交付完整架构、代码、测试、评估与运行手册', '支持知识问答、状态查询和确认式工单写入', '能用 trace 和指标诊断真实失败'],
    diagram: `flowchart TB
  UI --> API[Session API / SSE]
  API --> Graph[LangGraph orchestration]
  Graph --> Route{Intent router}
  Route --> RAG[RAG pipeline]
  Route --> Read[Read tools]
  Route --> Write[Prepare → confirm → execute]
  RAG --> KB[(Versioned + ACL index)]
  Read --> Biz[(Business APIs)]
  Write --> Biz
  Graph --> Mem[(Scoped memory)]
  Graph --> CP[(Checkpoint + event log)]
  Graph --> Obs[Trace / eval]`,
    sections: [
      s('11.1 最小纵向切片', ['第一周只实现一个用户、一个知识源、一个只读工具和一个写工具。每条请求都产生 run_id，检索保留 evidence，写入必须确认并 read-back。', '先让完整路径可测，再扩展 provider、多租户和高级 memory。否则多个半成品模块会同时掩盖问题。']),
      s('11.2 数据与控制面', ['数据面处理用户请求、检索、模型调用和工具执行；控制面管理 Prompt/model/index 版本、权限策略、评估数据集和发布门禁。两者分开后，升级模型或索引才可审计和回滚。', '关键持久对象包括 session event、checkpoint、artifact、memory、index manifest 和 execution receipt。每个对象有 owner、版本、TTL 与删除策略。']),
      s('11.3 验收不是“能回答”', ['功能验收检查答案、引用、工具和恢复；可靠性验收检查超时、重试、幂等和取消；安全验收检查越权、注入、数据泄露和删除；运营验收检查 trace、告警、成本和回滚。', '最终答辩随机抽取失败 trace，你需要从 observation 定位原因并说明修复应落在 Prompt、retrieval、tool、policy 还是 data。'])
    ],
    topicIds: ['evaluation', 'tracing', 'context-builder', 'memory-write-policy', 'durable-execution', 'prompt-injection', 'sandbox', 'cost-latency'],
    projectIds: ['llamaindex', 'haystack', 'mem0', 'letta', 'openclaw', 'hermes', 'claude-code', 'openhands', 'autogen'],
    lab: { title: '最终交付物', steps: ['Architecture Decision Records 与威胁模型。', '可运行服务、种子数据、自动化测试和评估报告。', '至少一次进程中断恢复、一次模型版本对比、一次注入演练。', 'README 说明启动、观测、回滚和已知限制。'], acceptance: ['核心路径有可复现证据', '所有写入可追责且不会因重试重复', '无答案时能拒答并解释缺失证据', '明确列出系统局限与下一阶段优化'] }
  }
];

const CHAPTER_BY_ID = Object.fromEntries(COURSE_CHAPTERS.map(chapter => [chapter.id, chapter]));
