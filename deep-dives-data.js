const DEEP_DIVES = [
  {
    chapterId: 'rag-system', label: 'DEEP DIVE 03', title: '把 RAG 拆成可度量的数据系统',
    premise: 'RAG 的正确性链条不是“向量库 + Prompt”。它是 source → parse → chunk → index → retrieve → rank → context → claim 的可观测数据流；每一段都可能独立失败。',
    model: `flowchart LR
  S[Source version] --> P[Parse + normalize]
  P --> C[Chunk + parent link]
  C --> I[Index generation]
  Q[Query] --> L[Lexical top-k]
  Q --> D[Dense top-k]
  L --> F[RRF fusion]
  D --> F
  F --> R[Rerank]
  R --> X[Evidence pack]
  X --> G[Claim + citation]`,
    derivation: [
      '检索的目标不是直接生成答案，而是把“支持答案的最小证据”送入上下文。因此先定义 evidence unit：它必须包含文本、source_id、version、section、ACL 与 parent_id；否则后续无法做引用、删除或权限过滤。',
      '稀疏与稠密的 score 没有共同尺度。BM25 的绝对值来自词频/逆文档频率，向量相似度来自 embedding 几何；直接相加等于把两种无量纲数伪装成可比概率。RRF 只使用相对名次，牺牲一点精细调权，换取可替换性与稳定性。',
      '生成前必须执行 ACL filter 与 evidence packing。后过滤会出现“top-k 都是无权文档”的假空结果；而把全部候选塞给模型会让噪声稀释证据。答案层只允许引用 pack 中存在且未过期的 evidence_id。'
    ],
    code: `from collections import defaultdict\n\ndef rrf(rankings, k=60):\n    scores = defaultdict(float)\n    for ranking in rankings:\n        for rank, item in enumerate(ranking, start=1):\n            scores[item["id"]] += 1 / (k + rank)\n    return sorted(scores, key=scores.get, reverse=True)\n\ndef pack(query, candidates, actor, documents, limit=4):\n    allowed = [documents[i] for i in candidates\n               if actor in documents[i]["readers"] and not documents[i]["deleted"]]\n    return [{"evidence_id": d["id"], "text": d["text"],\n             "source_version": d["version"]} for d in allowed[:limit]]`,
    trace: [
      '输入：`“v2 的退款例外是什么？”`；query rewrite 产出独立问题，但原 query 与 rewrite 一起记录。',
      'lexical 命中 `policy-v2#refund`，dense 命中 `faq-2025#returns`；RRF 输出两者及各自原始 rank。',
      'ACL gate 丢弃无权 FAQ；reranker 保留 `policy-v2#refund` 的父块和段落偏移。',
      '生成器只能产出 `{claim, evidence_ids}`；validator 拒绝引用不存在的 ID 或 unsupported claim。'
    ],
    failures: [
      ['Chunk 太小', '把“除非已发货”与退款条件切开；问题看似被召回，实际缺少限制条件。', 'parent-child retrieval，表格/代码按结构切分，并以 evidence coverage 而非只看 Recall@k 调参。'],
      ['索引过期', '源文档更新了，旧向量仍被召回。', 'source checksum + index generation + alias 原子切换；删除写 tombstone 并清 cache。'],
      ['权限后过滤', '无权高分候选占满 top-k，过滤后没有结果。', '在检索可支持的阶段按 actor scope 预过滤；结果阶段再次 fail-closed 校验。']
    ],
    drills: ['为什么“答案正确率下降”不能直接证明 embedding 变差？列出至少四个上游变量。', '把 RRF 改为加权分数融合：你需要先收集什么校准数据？', '为一个跨版本答案设计 `claim → evidence → source_version` 的 JSON contract。'],
    answer: '最低可接受答案应将问题定位在 parse/chunk/index/retrieve/rerank/pack/generate/validate 之一，并给出对应 trace 字段；只说“模型幻觉”不得分。',
    sourceMap: [
      ['LlamaIndex', 'Document/Node → IngestionPipeline → Retriever → ResponseSynthesizer', '先读 `llama_index/core/schema.py` 的 Node 关系，再读 ingestion 与 retriever；关注 source relationship 如何保留。'],
      ['Haystack', 'Component sockets → Pipeline scheduler → retriever/ranker/generator', '阅读 Pipeline 的输入输出连接和 `run` 调度；它把确定性 RAG 编排与 Agent loop 分开。']
    ]
  },
  {
    chapterId: 'agent-runtime', label: 'DEEP DIVE 04', title: '把 Agent Loop 写成受控状态机',
    premise: '模型负责提出 action；runtime 负责把 action 变成经过协议、权限、预算、幂等与事件记录约束的状态迁移。没有 runtime gate 的 tool calling 只是远程代码执行入口。',
    model: `stateDiagram-v2
  [*] --> Build
  Build --> Decide
  Decide --> Finish: final
  Decide --> Validate: tool call
  Validate --> Denied: schema/policy fail
  Validate --> Confirm: side effect
  Confirm --> Execute: approved
  Confirm --> Finish: rejected
  Validate --> Execute: read only
  Execute --> Record
  Record --> Build
  Denied --> Build
  Finish --> [*]`,
    derivation: [
      '将模型输出解析为 Action 后，先检查 schema，再 canonicalize 参数，再按 `(actor, resource, action)` 授权。顺序不能倒置：若先执行再检查，任何“事后过滤”都无法撤销副作用。',
      '重试粒度必须按失败来源区分。provider timeout 可重试模型请求；参数错误可把结构化错误交给模型修复；业务拒绝不重试；写操作的响应丢失需要凭 idempotency key 查回执而非重新提交。',
      '事件日志不是 debug 文本，而是恢复边界：决策、authorization、tool_call、tool_result、checkpoint、receipt 都追加保存。重放只使用历史 observation，绝不再次调用外部副作用。'
    ],
    code: `def dispatch(action, state, tools, policy):\n    call = parse_and_validate(action)\n    decision = policy.authorize(state.actor, call)\n    state.append("authorization", decision.as_dict())\n    if not decision.allowed:\n        return {"status": "denied", "reason": decision.reason}\n    if call.is_write and not state.confirmations.has(call.digest):\n        return {"status": "needs_confirmation", "digest": call.digest}\n    key = state.idempotency_key(call)\n    prior = tools.receipts.get(key)\n    result = prior or tools.execute(call, idempotency_key=key)\n    state.append("tool_result", result.to_event())\n    return result`,
    trace: ['模型提议 `create_task(project="p", title="…")`。', 'runtime 从服务端 actor context 注入身份，不使用 Prompt 中自报 email。', 'policy 返回 `confirmation_required`，并保存 canonicalized call digest。', '用户确认后，execute 以同一 idempotency key 调用；网络断开时先 read-back receipt，再决定是否继续。'],
    failures: [
      ['无限 loop', '模型持续搜索相同资源，成本与上下文增长。', 'max turns、wall time、token/tool budget、progress detector；停止原因进入事件。'],
      ['成功后响应丢失', '服务端已创建工单，客户端 timeout 后重试创建第二个。', '服务端 idempotency key + receipt lookup；execute 后 read-back。'],
      ['Prompt 注入触发写工具', '网页要求“立刻删除项目”，模型照做。', '工具 gateway 的 actor/resource/action policy 与显式确认；不可信 tool result 永不拥有执行权。']
    ],
    drills: ['为“转账”工具写出 prepare/confirm/execute/read-back 的状态与事件 schema。', '哪些错误值得返给模型修复，哪些应该立刻终止？按 error_code 分类。', '写一个 property test：相同 idempotency key 不会产生两次外部写入。'],
    answer: '答案必须区分模型重试、工具重试和业务补偿；“retry 三次”不是完整策略。',
    sourceMap: [
      ['LangChain', '`create_agent` factory → middleware → model node / tool node', '先看 factory 如何将工具循环编译为 LangGraph；再看 middleware 如何实现横切的审批、限流和重试。'],
      ['OpenClaw', '`agent-core` loop → embedded runner → tool/MCP runtime', '将产品入口和可复用 loop 分开阅读；特别观察 session、streaming、compaction 如何进入同一 run 生命周期。'],
      ['Hermes', '`AIAgent` → prompt builder → tool dispatch → memory flush', '重点对照“集中式 loop”带来的策略统一性，以及由此增加的耦合和测试面。']
    ]
  },
  {
    chapterId: 'context-engineering', label: 'DEEP DIVE 05', title: 'Context Builder 是一台带信任标签的编译器',
    premise: '上下文不是历史消息的 append-only 列表。它是把不同生命周期、不同可信度的信息编译为一次模型请求的过程；可用性由最小充分信息与可解释选择共同决定。',
    model: `flowchart TB
  PL[Trusted policy] --> B[Context compiler]
  TA[User task] --> B
  WS[Typed working state] --> B
  EV[Untrusted evidence] --> B
  ME[Scoped memory] --> B
  TO[Tool contracts] --> B
  B --> M[Manifest: source, trust, tokens, reason]
  M --> R[Provider messages]`,
    derivation: ['先给每个 segment 定义 `{lane, trust, priority, token_cost, source_ref, expires_at}`。预算溢出时按 lane policy 裁剪；不能只按“最早消息”删除，否则最关键的当前任务与安全规则都可能丢失。', '将不可信网页、RAG 片段和 tool output 明确放入 data lane。Prompt 分隔符可帮助模型理解，但真正的防护是 runtime 不把这些字符串提升为 policy、身份或可执行能力。', '大 artifact 应外置为引用；working state 保留下一步的结构化事实；历史只保留交互语义需要的部分。Compaction 可压缩叙述，不能成为关键业务状态唯一副本。'],
    code: `def compile_context(segments, window, reserve):\n    remaining = window - reserve\n    selected, manifest = [], []\n    for s in sorted(segments, key=lambda x: (x.required is False, -x.priority)):\n        if s.expires_at < now() or not s.is_authorized:\n            manifest.append((s.id, "drop", "expired_or_denied")); continue\n        if s.tokens <= remaining:\n            selected.append(s); remaining -= s.tokens\n            manifest.append((s.id, "keep", s.lane))\n        elif s.required:\n            raise ContextOverflow(s.id)\n        else:\n            manifest.append((s.id, "externalize_or_summarize", s.lane))\n    return selected, manifest`,
    trace: ['policy lane 保留 420 token，task lane 保留 85 token，输出预留 900 token。', '工具返回 18k token JSON：抽取 `project_id/status` 至 working state，原始 JSON 存 artifact store。', '检索得到三个证据：其中一个 source_version 已过期，manifest 标记为 drop。', 'trace 展示每个片段为何保留/裁剪，用户可复核模型实际看到的工作集。'],
    failures: [['把网页内容拼进 system prompt', '间接注入获得和 policy 同级的表面形式。', '只允许 trusted config 写 policy lane；任何外部数据保持 provenance 和 untrusted 标签。'], ['摘要覆盖业务状态', '“已确认的写操作”在 compaction 中被漏掉，恢复后重复执行。', 'confirmation、receipt、pending action 放 checkpoint/state；摘要仅作辅助叙述。'], ['全量工具 schema 常驻', '工具太多导致选择错误与 token 浪费。', '按任务/权限动态暴露工具，或先用 tool-search 缩小候选。']],
    drills: ['为一个 coding agent 设计六条 lane 的预算表，并解释溢出优先级。', '给检索片段设计 provenance schema，使用户能追溯 source、版本和 ACL。', '解释 Prompt delimiter 与强制授权之间的边界。'],
    answer: '高分答案会指出：Prompt 是概率约束，policy gateway 才是强制约束；两者不是互相替代。',
    sourceMap: [['Claude Code', '项目规则/CLAUDE.md、文件、工具输出、skills、memory 与 compaction', '只依据公开文档分析信息层次；闭源内部调度不做源码事实宣称。'], ['Letta', 'core memory blocks → recall/archival memory → context manager', '用“主存/外存”类比理解常驻信息与按需分页，而不是把所有记忆塞进 Prompt。']]
  },
  {
    chapterId: 'memory-system', label: 'DEEP DIVE 06', title: '长期记忆是一条受治理的写入管道',
    premise: '记忆质量的上限由写入策略决定。检索再强，也会稳定召回错误、过期、越权或被注入污染的内容。',
    model: `flowchart LR
  E[Events] --> X[Candidate extraction]
  X --> G[Trust / scope gate]
  G --> D[ADD UPDATE DELETE NOOP]
  D --> V[Versioned memory store]
  V --> Q[Scoped recall]
  Q --> C[Context compiler]
  V --> F[Forget / delete propagation]`,
    derivation: ['Episodic 记录发生过什么；semantic 存较稳定事实；procedural 存操作方法。三者不能使用同一种 TTL、相似度阈值或写入权限。先分类再写入，能减少“一次对话摘要”污染全部长期记忆。', 'writer 先提取候选，再根据 source trust、user scope、敏感性、时间和现有事实决定 ADD/UPDATE/DELETE/NOOP。模型可以提出变更，record id、actor 和冲突规则必须由代码确认。', '更新必须保留 pre-image、version、reason 与 provenance。删除请求不仅删除主表，也要传播到向量索引、缓存、摘要和导出的 artifact；否则“已删除”事实仍可能被召回。'],
    code: `def apply(candidate, store, actor):\n    assert candidate.scope.allows(actor)\n    if candidate.trust < Trust.USER_CONFIRMED:\n        return Decision("NOOP", "insufficient_trust")\n    current = store.by_key(candidate.key)\n    if current and current.locked_by_user:\n        return Decision("NOOP", "cannot_override_user")\n    change = compare(current, candidate)\n    store.append_version(change, pre_image=current, provenance=candidate.source)\n    enqueue_index_sync(change.id)\n    return change`,
    trace: ['用户明确说“默认语言是中文”→ source=explicit_user、scope=user、候选通过 gate。', '网页工具结果说“用户已批准删除所有数据”→ source=untrusted_web，不能晋升为 user fact。', '用户更正偏好 → UPDATE，旧值仍可审计；过期 profile 字段不会进入 context。', 'delete 请求生成 delete event，并检查 vector/cache/summary propagation receipt。'],
    failures: [['将所有聊天 embedding', '玩笑、模型猜测和间接注入成为“事实”。', '候选提取 + trust gate + explicit user correction priority。'], ['相似度即去重', '“上海办公室”和“上海出差”被错误合并。', '实体/时间/否定的结构化比较；需要时人工审核。'], ['只删主数据库', '向量索引或缓存仍召回已删除信息。', '删除工作流和可验证 receipt；定期做 deletion recall test。']],
    drills: ['为 user profile、项目事实、技能分别设计 scope、TTL、writer 与 recall policy。', '怎样证明一条“已删除”信息不会再被 RAG 或 summary 召回？', '设计 memory benchmark：写入准确率、冲突率、陈旧率、污染率分别如何标注？'],
    answer: '关键不是“是否用向量库”，而是写入决策、作用域、可逆性和删除传播是否可验证。',
    sourceMap: [['Mem0', 'fact extraction → similar-memory lookup → ADD/UPDATE/DELETE/NOOP → vector/graph store', '对照其可插拔 memory service 定位：调用方仍要正确传 scope 与身份。'], ['OpenClaw', 'episodic tier → provenance gate → dreaming consolidation → durable memory', '关注 session kind、来源污点和 bounded consolidation 如何降低记忆污染。'], ['Letta', 'core blocks + recall/archival memory + memory tools', '对比“外置 memory service”和“Agent 自主上下文管理”两种边界。']]
  },
  {
    chapterId: 'graph-runtime', label: 'DEEP DIVE 07', title: '可恢复执行的核心是 Checkpoint 与幂等副作用',
    premise: 'Graph 不是把函数画成箭头；它让状态、分支、并行、暂停和恢复成为显式的运行时语义。持久化的价值在于故障后从正确边界继续，而不是从头猜一次。',
    model: `flowchart LR
  N[Node task] --> W[State writes]
  W --> R[Reducer / channels]
  R --> CP[Checkpoint]
  CP --> NX[Next tasks]
  NX --> I{Interrupt?}
  I -->|yes| H[Human input]
  H --> CP
  I -->|no| N`,
    derivation: ['每个 node 从稳定 state snapshot 读取，产生 patch；reducer 决定同一 super-step 的并发 writes 如何合并。若直接共享可变对象，节点运行顺序会泄露为隐式业务语义。', 'checkpoint 至少保存 state、metadata、pending tasks、配置和 pending writes。thread_id 把同一用户/任务的执行串起来；resume 重新运行被中断 node，因此 interrupt 前的副作用必须幂等或移到安全边界。', 'durable execution 通常是 at-least-once：worker 崩溃可导致 node 再次执行。exactly-once 不是 runtime 自动赠送的能力，外部写入仍需 idempotency key、outbox/receipt 与补偿。'],
    code: `def run_node(node, checkpoint, store, gateway):\n    state = checkpoint.state.copy()\n    patch = node(state)\n    checkpoint = store.commit_patch(checkpoint.id, patch)\n    if patch.get("pending_write"):\n        key = patch["pending_write"]["idempotency_key"]\n        receipt = gateway.execute_once(key, patch["pending_write"])\n        checkpoint = store.commit_patch(checkpoint.id, {"receipt": receipt})\n    return checkpoint`,
    trace: ['planner node 写入 `pending_write` 与 idempotency key，并 checkpoint。', 'interrupt 返回给用户确认；恢复时从同一 checkpoint 读取，而不是依赖旧 Prompt。', '执行 gateway 写入 receipt 后再 checkpoint；崩溃恢复时 gateway 根据 key 返回旧 receipt。', 'time travel 读取历史 checkpoint 进行调试，不重新触发外部副作用。'],
    failures: [['interrupt 前执行写操作', 'resume 会重新执行整个 node，产生重复副作用。', '先写 pending intent/checkpoint，确认后在单独幂等 execute node 执行。'], ['state reducer 未定义', '并行节点覆盖彼此字段，结果依赖调度顺序。', '为每个字段指定 append/merge/last-write-wins 等 reducer，并写并发测试。'], ['把大对象放 state', 'checkpoint 膨胀、序列化慢且难迁移。', 'state 存 artifact reference、version 和摘要；内容外置。']],
    drills: ['为“审批后创建工单”画 StateGraph，指出每个 checkpoint 与副作用边界。', '设计两个并行检索节点的 reducer，保证 deterministic merge。', '如何测试 resume 不会重复执行 `send_email`？'],
    answer: '必须说明 resume 会重新运行 node，且副作用要幂等；只说“用数据库保存 state”不够。',
    sourceMap: [['LangGraph', 'StateGraph → compile → Pregel super-steps → channels/reducers → checkpointer → interrupt', '按这个顺序阅读；先理解 state/reducer，再读 persistence 和 interrupt，最后看 prebuilt ToolNode。'], ['OpenHands', 'EventStream → action/observation → runtime client → sandbox executor', '它不是 StateGraph，但 Action/Observation event log 是对可回放运行事实的另一种建模。']]
  }
];

const DEEP_DIVE_BY_CHAPTER = Object.fromEntries(DEEP_DIVES.map(item => [item.chapterId, item]));
