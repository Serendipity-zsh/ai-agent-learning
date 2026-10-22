// Checked against the linked primary sources on 2026-10-22. Examples are teaching code unless stated otherwise.
const CONTENT_REVIEW_DATE = '2026-10-22';
const LEARNING_STAGES = [
  { title: '理解模型与协议', description: '从概率生成出发，建立可测试的输入与输出契约。', ids: ['system-boundary', 'model-foundation', 'prompt-protocol'] },
  { title: '构建可靠的 Agent', description: '检索证据、约束行动，管理工作集与长期记忆。', ids: ['rag-system', 'agent-runtime', 'context-engineering', 'memory-system'] },
  { title: '掌握工程与框架', description: '用图组织执行，用评测检验质量，把系统交付上线。', ids: ['graph-runtime', 'multi-agent', 'production', 'frameworks', 'capstone'] },
  { title: '跟进前沿，理解取舍', description: '学习 Harness、动态工具、新版 MCP 与多模态系统。', ids: ['harness-engineering', 'advanced-tools', 'mcp-evolution', 'multimodal-evals'] }
];

const MODERN_CHAPTERS = [
  {
    id: 'harness-engineering', number: '12', title: 'Harness Engineering：跨会话的可靠执行', tag: '进阶专题', duration: '3–5 小时',
    thesis: '一次工具循环能完成短任务；持续数小时的任务需要可重建的工作环境、可验收的任务清单、恢复协议和外部事实。Harness 是围绕模型组织这些机制的执行系统。',
    objectives: ['区分模型能力、上下文策略和 Harness 的责任', '设计一次可重启的工作会话', '解释为什么压缩历史不能替代持久状态'],
    diagram: 'flowchart LR\n  Goal[用户目标] --> Init[环境初始化]\n  Init --> Ledger[任务清单与证据]\n  Ledger --> Agent[受预算约束的执行]\n  Agent --> Test[确定性验收]\n  Test --> Save[保存产物与检查点]\n  Save --> Resume[下一会话重建]\n  Resume --> Ledger',
    sections: [
      s('12.1 Harness 的边界：把成功变成环境属性', [
        '设想模型需要为一个服务添加鉴权。它可能正确写出中间件，却忘记运行集成测试；也可能在下一会话重复修改已经完成的迁移。问题不仅在生成质量，还在于执行环境没有定义“完成”的外部标准。Harness 为模型提供任务输入、工具、文件系统、约束、观测和验收反馈。',
        '一个最小 Harness 不需要多个 Agent。它需要四件可检查的事实：当前 checkout 或工作区是什么，哪些任务尚未完成，每项任务对应什么验收证据，以及本轮消耗了多少预算。把这些信息保存在外部，新的模型会话才能通过读取事实恢复工作。',
        'Anthropic 的长任务实践采用初始化和增量执行的分工；Deep Agents 则把文件系统、上下文管理和子任务委派封装为可组合能力。这些是实现案例，不是要求所有系统都采用同一套架构。先以单 Agent 加任务清单为基线，只有真实瓶颈出现才增加并行。'
      ], { callout: '验收对象必须是工作区、数据库或产物的状态。模型说“测试通过”只是一条待核验的声明。' }),
      s('12.2 一次工作会话如何开始、结束与交接', [
        '开始时读取任务清单、最近的执行记录和环境状态，先检查基线是否可运行。执行时只选择一个明确的工作单元，给它输入、权限、预算和验收条件。结束时保存修改、测试结果、未解决问题和下一步，而不是把整段聊天当作交接。',
        '任务状态可以是 pending、running、verified 或 blocked。只有确定性检查或人工验收才能把状态变为 verified。崩溃恢复时，running 只是“曾经开始”，必须检查对应产物和 receipt，再决定继续还是重试。',
        '持久状态中存版本号和内容哈希；不要只写“最新文件”。同一任务的两次执行应该能比对输入、Prompt、模型、工具和结果版本。这样才有条件解释退化、回滚或复现故障。'
      ], { code: `task = {
    "id": "auth-01", "status": "pending",
    "input_revision": "verified_git_sha",
    "acceptance": ["unauthenticated request returns 401"],
    "evidence": [], "budget": {"max_steps": 20}
}
# Run acceptance checks against the artifact, then persist the result.
# A model's completion message does not change status to verified.` }),
      s('12.3 Deep Agents、子代理与文件系统卸载', [
        '长工具输出可以保存成文件，只把摘要、位置和校验信息送入模型。模型需要细节时按需读取。这样把“上下文必须一次容纳所有数据”改成“上下文知道去哪找数据”。代价是增加检索步骤，也必须保证文件路径、生命周期和权限可靠。',
        '子代理的收益来自独立上下文和并行处理。适合拆分的任务应拥有清晰边界，例如独立审阅安全问题与性能问题。多个 worker 同时修改同一文件会引入协调成本；共享的外部工具还可能突破整体预算，所以主任务必须拥有总预算和合并验收责任。',
        '一个好的返回结果是 artifact：包含结论、来源、实际改动、测试证据、失败与剩余风险。一个差的返回结果只有长篇推理。这里不要求保存隐藏思维链；保存可验证的行动、观测和决策摘要就足够调试。'
      ]),
      s('12.4 故障演练：压缩之后还能继续吗', [
        '在执行中途强制结束进程，启动新会话，只允许读取持久记录。观察它是否能定位原始目标、已经完成的工作、未完成的检查和当前分支。若必须依赖旧聊天才能继续，说明交接契约仍不完整。',
        '再注入一个更隐蔽的故障：产物存在，但测试证据来自旧版本。恢复器应把该任务判为待复核，而非自动完成。优化目标是降低恢复时间和重复工作量，同时保持验证完整性；压缩比本身不是成功指标。'
      ])
    ], topicIds: ['agent-loop', 'context-builder', 'compaction', 'subagents', 'durable-execution'],
    sources: [{ label: 'Anthropic · Long-running agent harnesses', url: 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents' }, { label: 'LangChain · Deep Agents', url: 'https://docs.langchain.com/oss/python/deepagents/overview' }],
    lab: { title: '实验：没有聊天历史的交接', steps: ['选择一个包含三个验收项的编码任务。', '执行一项后写出任务记录，关闭当前会话。', '只使用工作区和任务记录继续，记录恢复所需的信息。'], acceptance: ['每个完成项有对应产物与检查结果', '旧版本证据不会被误用', '恢复不依赖未保存的聊天历史'] }
  },
  {
    id: 'advanced-tools', number: '13', title: '动态工具发现与程序化调用', tag: '进阶专题', duration: '3–4 小时',
    thesis: '当工具数量增长，问题从“怎么调用函数”变成“怎样发现正确能力，并在有限上下文内完成可靠编排”。把工具定义、批量数据处理和业务授权分别设计。',
    objectives: ['实现发现、加载、调用三个阶段', '判断批量代码编排与模型决策的边界', '为工具误选、schema 漂移和部分失败设置验收'],
    diagram: 'flowchart TD\n  Q[任务意图] --> Search[检索能力描述]\n  Search --> Schema[加载具体 schema]\n  Schema --> Policy[校验身份与权限]\n  Policy --> Calls[受限代码编排]\n  Calls --> Filter[过滤与聚合]\n  Filter --> Result[证据与结果]',
    sections: [
      s('13.1 从全量工具列表到按需发现', [
        '把 500 个工具定义全部放进 Prompt，会占用输入窗口，也增加相似名称间的选择歧义。发现阶段只返回少量能力摘要和稳定 id；加载阶段取得选中工具的版本化 schema；调用阶段才执行参数与权限校验。',
        '能力描述应该说明业务目的、输入、输出、前置条件和副作用。例如“查工单详情”与“按条件列出工单”需要明确区分，不能都写成“获取工单”。工具发现本身也要评测：给定一组用户请求，统计正确工具是否进入候选集合。',
        '不要因为发现结果来自内部索引就跳过授权。发现允许公开名称，调用可能只允许特定 actor 和资源。工具目录的可见范围与工具执行的权限范围可以不同。'
      ]),
      s('13.2 用代码处理批量工作，用模型处理语义判断', [
        '对 100 个项目分别查询状态，再筛选延期项目，是确定性的循环与过滤。若每一步都往返模型，会增加延迟、token 和出错路径。程序化调用让受控执行环境编排循环，只向模型返回必要的汇总与证据。',
        '代码也可能产生危险行为，所以它只能访问被授予的工具代理，不能取得宿主凭据或任意网络访问。给每个代理设置并发限制、结果大小和超时；整体任务还需要总调用预算。批量写入应逐项确认或采用明确的批次审批范围。',
        '程序化调用降低的是中间数据进入上下文的负担，不会消除工具的真实费用和服务限流。只有测量端到端延迟、错误率与成本，才能证明这种编排更适合当前任务。'
      ], { code: `# Teaching sketch: tools are permission-scoped proxies.
results = []
for project_id in authorized_project_ids[:20]:
    receipt = tools.get_project(project_id=project_id)
    if receipt["status"] == "delayed":
        results.append({"id": project_id, "source": receipt["source"]})
# Return selected evidence, not all raw API responses.` }),
      s('13.3 Schema、示例与运行时契约', [
        'Schema 描述结构，却不总能解释字段组合。例如 due_date_change_reason 只在改日期时需要，project_id 与 project_slug 只能二选一。工具使用示例可以帮助模型学会组合规则，但确定性校验仍然必须覆盖这些约束。',
        '注册表记录 schema_version、side_effect、timeout、required_scopes 和 result_schema。返回数据应有 status、data、source 和 error_type，便于 runtime 判断缺失、权限拒绝和暂时失败。禁止把不同错误都变成空数组，否则模型会把“读取失败”理解为“没有数据”。'
      ]),
      s('13.4 部分失败和工具发现评测', [
        '一个批次有 18 项成功、2 项超时，应该返回逐项状态与整体 completeness。全部重跑可能重复动作，直接称完成又会丢数据。保留 item id 和 receipt 后，只重试有证据证明可以重试的项。',
        '构造名称近似、必填参数相同但语义不同的工具，测试错误选择；在 schema 升级后重放旧请求，测试参数迁移；向发现描述注入诱导性文字，测试其是否会越过运行时授权。'
      ])
    ], topicIds: ['tool-schema', 'tool-calling', 'authorization', 'loop-budget'],
    sources: [{ label: 'Anthropic · Advanced tool use', url: 'https://www.anthropic.com/engineering/advanced-tool-use' }, { label: 'Anthropic · Code execution with MCP', url: 'https://www.anthropic.com/engineering/code-execution-with-mcp' }],
    lab: { title: '实验：为一百个工具做发现基线', steps: ['用本地 JSON 定义 100 个带目的与副作用的工具。', '先按名称与描述检索 top-5，再加载 schema。', '记录正确工具召回率、输入 token 与错误调用次数。'], acceptance: ['发现和执行有独立权限校验', '部分失败不会被当作全部成功', '批量调用受总预算与并发限制'] }
  },
  {
    id: 'mcp-evolution', number: '14', title: 'MCP 2026：从有状态握手到独立请求', tag: '协议更新', duration: '3–4 小时',
    thesis: '截至 2026-10-22，官方 latest 指向 2026-07-28。新版移除了协议级初始化握手与 HTTP session，把版本和客户端能力放到每次请求中。学习时必须明确协议版本，不能混用示例。',
    objectives: ['比较 2025 与 2026 的请求生命周期', '读懂 server/discover 与逐请求 _meta', '区分协议能力、认证身份和业务权限'],
    diagram: 'flowchart LR\n  Client[客户端] --> Discover[server/discover]\n  Discover --> Select[选择受支持版本]\n  Select --> Request[请求携带版本与能力]\n  Request --> Server[无协议会话的服务端]\n  Server --> Result[结果与服务器信息]',
    sections: [
      s('14.1 版本变化具体改变了什么', [
        '2025 系列典型流程是 initialize、notifications/initialized，再进行工具发现与调用。2026-07-28 移除了这套握手，也移除了 Streamable HTTP 的 Mcp-Session-Id。列表结果不再随协议连接变化，服务端如需跨调用状态，应返回显式 handle，并通过普通工具参数传递。',
        '新客户端可以先调用 server/discover，获取服务端支持的协议版本、能力和身份，再选择版本。后续每个请求在 _meta 中声明协议版本和客户端能力。无状态的意思是请求不再依赖此前的协议会话，不是应用不许使用数据库或保存任务。',
        '本课程 Lab 13 特意保留 2025-06-18 教学模型，用于理解旧握手。它不是新版合规实现。迁移时应先固定 SDK 与协议版本，再用官方规范与互操作测试验证真实传输，不能只改返回字符串。'
      ], { callout: '版本事实来源：官方 2026-07-28 changelog。本文讨论核心规范；不同 SDK 的支持进度应单独核验。' }),
      s('14.2 一次请求应携带哪些信息', [
        '新版把 io.modelcontextprotocol/protocolVersion 和 io.modelcontextprotocol/clientCapabilities 放在 params._meta。客户端身份信息也应按规范携带。服务端对不支持的版本返回规定的版本错误，而不是猜测调用方想用哪个协议。',
        '这些元数据是协议声明，不是可信用户身份。认证仍来自受验证的传输或授权机制，业务 actor 仍需由宿主绑定，不能接受模型通过 arguments 冒充的用户。工具参数和返回值还要分别做 schema 与业务语义校验。'
      ], { code: `{
  "jsonrpc": "2.0",
  "id": "request-42",
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}` }),
      s('14.3 通知、长任务与应用状态', [
        '新版使用 subscriptions/listen 承载选择加入的服务端变更通知；与当前请求相关的 progress 仍在对应请求的响应流中。不要把两种流混在一起，否则重连、取消和消息归属很难处理。',
        '实验性 tasks 从核心移入官方扩展。设计客户端时，必须先确认对方是否支持相应扩展，再按扩展契约处理 handle、轮询与输入更新。不要将一个业务 job id 自动视为协议 task。',
        '对应用而言，最重要的不变量依旧是：可信 actor、资源范围、幂等键、审计事件与明确取消语义。协议升级减少连接状态依赖，不会自动实现这些业务约束。'
      ]),
      s('14.4 如何迁移与验证', [
        '建立版本兼容矩阵：客户端版本、服务端版本、传输方式、认证方式和扩展集合。先在隔离环境测试 discover，再覆盖无握手直接请求、未知版本、缺失元数据、工具错误、取消、通知重连和分页。',
        '保留旧客户端时，通过明确的兼容适配层处理差异，并在 trace 中记录 negotiated_version。测试必须能识别旧流程误连新服务端，而不能默默降级到某个版本。'
      ])
    ], topicIds: ['mcp', 'authorization', 'tool-calling'],
    sources: [{ label: 'MCP · 2026-07-28 规范', url: 'https://modelcontextprotocol.io/specification/2026-07-28' }, { label: 'MCP · Key changes', url: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog' }],
    lab: { title: '实验：读懂两个版本的协议轨迹', steps: ['为 Lab 13 画出旧版握手序列。', '对照新版 changelog 标记删除、迁移和新增的方法。', '编写版本兼容矩阵和负向互操作用例。'], acceptance: ['每个示例标明协议版本', '协议能力不会被当成授权', '不把教学 handler 描述为完整传输实现'] }
  },
  {
    id: 'multimodal-evals', number: '15', title: '多模态 Agent 与可靠评测', tag: '进阶专题', duration: '4–6 小时',
    thesis: '视觉和语音扩大了 Agent 的观测与行动空间，也增加了解析、定位、时间与环境的不确定性。把观测、决策、动作与真实环境结果分别记录，才能判断系统是否有效。',
    objectives: ['设计截图到行动的闭环与风险边界', '建立结果、过程、成本三类 grader', '理解多次 trial、pass@k 与一致性指标的区别'],
    diagram: 'flowchart LR\n  Env[环境状态] --> Obs[截图或音频观测]\n  Obs --> Decide[模型建议]\n  Decide --> Gate[策略与用户控制]\n  Gate --> Act[受限动作]\n  Act --> Verify[新观测与验收]\n  Verify --> Env',
    sections: [
      s('15.1 多模态输入首先是带来源的数据', [
        '截图包含坐标系、视口尺寸、缩放比例与拍摄时间。模型看到的是某一时刻的画面，按钮可能在动作执行前移动。每次动作后重新观测，比盲目连续点击更可靠。具备 DOM 或可访问性树时，优先用语义定位，截图用于验证视觉状态。',
        '音频系统还需要区分分段识别、说话人、时间戳和打断。转写不是用户原话的绝对真相；同音、噪声和端点检测都会造成误差。涉及外部写入时，确认应绑定规范化动作与目标，而不是只凭某个含糊转写片段。',
        '多模态 RAG 要保留文本、图片、表格或音频片段与原始页面的映射。答案引用“第 4 页表格”时，系统必须知道它来自哪个文档版本和裁剪区域，不能只保存一段模型生成的图片描述。'
      ]),
      s('15.2 评测单位：Task、Trial、Transcript、Outcome', [
        'Task 定义输入、初始环境与目标；Trial 是一次具体尝试；Transcript 保存模型与工具事件；Outcome 是环境的最终状态。四者分开，才能区分偶然成功、错误过程和任务本身设计不清。',
        '规则 grader 检查可确定条件，例如写入次数、引用 id、数据库字段和预算；模型 grader 按 rubric 检查语义相关性与覆盖；人工抽查用于校准 rubric。不要让“另一个模型说答案不错”成为唯一验收。',
        '评测环境应隔离且可复位。需要更新工单的任务，在每次 trial 前恢复相同数据库状态；外部写入使用测试网关和唯一命名空间。模型版本、Prompt、索引、工具版本与随机性配置都写入报告。'
      ], { code: `trial = {
    "task_id": "update-approved-date",
    "seed_state": "fixture-v3",
    "graders": {
        "target_date_matches": True,
        "exactly_one_write": True,
        "approval_precedes_write": True,
        "receipt_matches_readback": True
    },
    "cost_usd": 0.03, "latency_ms": 1800
}
passed = all(trial["graders"].values())` }),
      s('15.3 成功率与稳定性不是同一个指标', [
        '重复运行同一任务有助于测量随机性。pass@k 关注 k 次尝试中至少一次成功，适合候选搜索；生产系统通常更关心单次成功概率和多次重复是否都稳定成功。允许无限重试会让成功率看起来很高，同时隐藏成本与副作用风险。',
        '报告应同时给出任务数量、每任务 trial 数、成功率、置信区间或明确的小样本限制、成本分位数与失败类别。安全约束通常采用严格门禁，例如越权写入为零；语义质量可以采用基线比较，避免用一个总分掩盖严重失败。',
        '回归评测和线上观测互补：离线数据集覆盖已知风险，线上 trace 发现真实分布中的新故障。把生产故障脱敏后变成新的 task，再验证修复，才能形成持续改进闭环。'
      ]),
      s('15.4 RAG 指标的最小手算例子', [
        '假设问题有两条相关证据，检索前 3 个候选分别是“无关、相关 A、相关 B”。Recall@3 = 2/2 = 1；第一条相关证据在第二位，所以 reciprocal rank = 1/2。Recall 衡量覆盖，MRR 更强调第一条相关结果出现得早不早。',
        'nDCG 为相关性等级提供折损：越靠前的强相关候选贡献越大，再与理想排序归一化。实现时明确 gain、log 折损和无相关证据时的行为。不要把完整检索相关性直接当作答案可信度，生成仍可能误读或忽略证据。'
      ])
    ], topicIds: ['evaluation', 'retrieval-evaluation', 'tracing', 'sandbox', 'llm-as-judge'],
    sources: [{ label: 'Anthropic · Demystifying evals', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' }, { label: 'LangGraph · Persistence', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' }],
    lab: { title: '实验：把一个真实失败变成回归样本', steps: ['定义带初始状态的任务与成功条件。', '重复运行五次，保存过程与环境结果。', '分别统计正确性、策略违规、成本和延迟。'], acceptance: ['失败能够复现且不会污染真实数据', '结果与过程分别判分', '报告说明样本数与评测限制'] }
  }
];

COURSE_CHAPTERS.push(...MODERN_CHAPTERS);
MODERN_CHAPTERS.forEach(chapter => { CHAPTER_BY_ID[chapter.id] = chapter; });

const LAB_STATUS = {
  'provider-adapter': ['教学实现', '当前实现覆盖非流式响应归一化与有限重试；不含真实 HTTP 或流式解析。'],
  'mcp-server': ['历史协议教学', '固定 2025-06-18 的内存 handler；未实现完整 JSON-RPC 校验、传输或真实鉴权。新版请阅读 MCP 2026 专题。'],
  'capstone-agent': ['最小策略练习', '当前代码只演示确认与内存幂等集合；不含完整模型、RAG、持久恢复或 OTel 接入。'],
  'real-stack': ['部署骨架', 'Compose 声明基础设施；API 检索与模型节点仍是占位实现，不能视为生产集成。']
};

const CHAPTER_LABS = {
  'model-foundation': ['model-budget'], 'prompt-protocol': ['structured-contract'], 'rag-system': ['rag-retrieval', 'sqlite-vector-store'],
  'agent-runtime': ['agent-loop', 'provider-adapter'], 'context-engineering': ['context-builder'], 'memory-system': ['memory-store'],
  'graph-runtime': ['graph-checkpoint'], 'multi-agent': ['multi-agent'], 'production': ['agent-evals', 'production-runtime'],
  'frameworks': ['mcp-server'], 'capstone': ['capstone-agent', 'real-stack'], 'mcp-evolution': ['mcp-server'], 'multimodal-evals': ['agent-evals']
};

const IMPLEMENTATION_NOTES = {
  'system-boundary': s('工程推导：把“会说”变成“可执行”', ['用一个创建工单请求推导边界：模型识别意图后先输出 proposal，代码补齐实体、校验权限与必填字段，再向用户展示最终动作，收到绑定该 proposal 的确认后执行并回读。每一层都应该返回可分类错误，而不是继续让模型猜。', '安全性来自宿主对工具调用的裁决。即使模型正确生成 JSON，也可能选择错误项目或重复提交。执行前 canonicalize 输入并记录 proposal hash；执行后存 receipt，恢复时先读取 receipt，避免同一动作再次发生。'], {code: 'user goal → proposal → validate → approve → execute → read-back\n                       │                  │\n                       └ deny/clarify     └ receipt + event'}) ,
  'model-foundation': s('工程推导：Attention 的形状与推理成本', ['输入 X 的形状是 n × d_model。乘 Wq、Wk、Wv 得到 Q、K、V，单头的 QKᵀ 是 n × n，每行 softmax 后乘 V。因果 mask 把未来位置的分数设为负无穷，因此生成时不会看未来 token。多头通过不同投影学习不同关系，最后拼接并投影回模型维度。', '朴素 prefill 的注意力矩阵随序列长度平方增长，优化实现能减少访存与中间矩阵存储。逐 token decode 则复用已计算的 KV，不能由此推导长上下文“免费”。估算 KV 容量要考虑层数、KV heads、head dimension、序列长度、batch 与 dtype；GQA 改变 KV heads 数量。', '性能实验分开测 TTFT 与输出 token/s。缓存稳定前缀主要改善重复输入处理；减少无关检索片段还可能同时改善质量。用同一组任务对比，避免把 provider 调度变化误认为 Prompt 优化效果。']),
  'prompt-protocol': s('工程推导：把 Prompt 当作版本化程序', ['一个可测 Prompt 包含任务、约束、输入格式、输出 schema、拒答与澄清条件、示例和版本。输入的动态部分独立传入，禁止把网页内容插进高信任指令段。输出 parser 失败应返回结构化校验信息，并使用有限修复次数。', '测试集至少有正常输入、缺失字段、冲突证据、越权请求和注入内容。每次更改 Prompt 与模型版本都固定其他变量，比较格式成功率、业务正确性、拒答精度和成本。训练集中的示例不能同时成为评测金标，以免只测记忆。']),
  'rag-system': s('工程推导：一条文档如何更新、删除与引用', ['为 source 保存 canonical id、内容哈希、版本与 ACL。解析产出带页码或 section 的块，chunk id 由 source、版本和位置构成。embedding 模型或 chunk 策略变更时建立新 index generation，验证后切换 active manifest，旧 generation 保留到可回滚期限。', '查询时首先按可信 actor 计算资源范围，检索器在候选阶段执行过滤；结果再次校验 ACL，防止索引更新延迟暴露已撤销文档。删除要覆盖 source store、chunk store、向量索引、缓存与派生记忆，不能只删原文件。', '生成输出使用 claim → chunk_id 映射。回读引用时校验 source 版本，若原文已变更就提示旧版本证据。引用存在不代表 claim 被支持：还要验证被引片段确实蕴含结论。']),
  'agent-runtime': s('工程推导：一次不确定写入如何恢复', ['网络超时后有三种事实：请求未到达、已到达未执行、已执行但响应丢失。客户端只看 timeout 无法区分。为逻辑操作生成稳定幂等键，服务端把该键、输入 hash、结果 receipt 与业务更新放在可证明的一致性边界内。', '相同 key 与相同输入返回原 receipt；相同 key 与不同输入必须拒绝。重试时保留 key，不得重新生成。没有服务端幂等支持时，通过 read-back 降低不确定性，并在无法确定时请求人工处理。客户端内存 set 只能演示思想，不能提供跨进程保证。']),
  'context-engineering': s('工程推导：按价值装配工作集', ['先保留可信策略、当前目标、必要工具协议和输出预算，再选择与当前步骤有关的证据、近期观察与长期记忆。每条片段带 source、trust、时间和 token cost。排序依据任务相关性、可靠性和新鲜度，不是简单取最近 N 条。', '大输出保存为 artifact，Prompt 只保留索引与摘要。压缩摘要采用目标、已完成、决策、证据、待办和失败字段；压缩前后重放同一下一步任务，评估是否遗漏关键约束。被裁剪的片段仍应能从外部存储找回。']),
  'memory-system': s('工程推导：记忆冲突与失效', ['“用户住北京”与“用户已搬到上海”可能是时间更新，不是两个应同时采信的事实。记忆记录 subject、predicate、value、valid_from、valid_to、来源与确认状态。更新先生成候选，再按确定性信任与时间规则合并，保留历史便于回滚。', '召回时先过滤 tenant、权限、过期与删除状态，再进行相似度排序。用户主动删除的事实还需检查缓存与摘要中的派生副本。记忆评测同时测正确写入率、错误覆盖率、过时召回率和用户纠正后的恢复情况。']),
  'graph-runtime': s('工程推导：为什么 Reducer 是业务规则', ['两个并行节点同时给同一个字段赋值，覆盖顺序可能来自调度偶然性。为集合型结果使用可去重合并，为消息使用框架规定的 reducer；对“唯一最终决定”要求显式仲裁。不能因为 append 能运行，就把所有状态字段都做成列表。', 'checkpoint 保存的是可恢复执行状态，store 保存的是跨线程应用数据。thread_id 关联一个运行上下文，但本身不代表用户权限。恢复 API 必须校验调用方对该 thread 的访问范围，再接受 resume 输入。']),
  'multi-agent': s('工程推导：什么时候并行真正有收益', ['将整体耗时分为可并行部分 P、串行部分 S 与协调成本 C。增加 worker 只能压缩 P，无法消除 S，还会增加 C 和 token。如果子任务依赖对方的中间结果或同时修改同一资源，复杂协作可能比单 Agent 更慢。', '先定义 Artifact schema：task_id、status、evidence、output、cost、limitations。coordinator 校验必填证据与来源；失败 worker 不得用自信自然语言伪装成功。合并阶段处理冲突和去重，必要时回到原始证据。']),
  production: s('工程推导：Tracing 与质量门禁', ['一次 run 的 root span 下挂 model、retrieval、tool、checkpoint 等子 span。记录输入与输出版本、延迟、token、错误类型和策略决定；敏感输入默认不进入 telemetry。trace id 连接排障事实，不能替代业务 receipt。', '质量门禁在隔离环境运行固定任务，对比基线；把越权与重复写入设为单独失败条件，再检查任务成功率、成本和延迟。生产故障形成脱敏回归样本，并记录改动实际改善了哪类错误。']),
  frameworks: s('工程推导：高层工厂与图运行时如何衔接', ['LangChain 的高层 agent API 组装模型、工具与 middleware；LangGraph 定义执行状态、节点、边与持久化语义。使用高层 API 时同样要理解 tool-call/result 配对、预算、中断与状态范围，不能把框架默认值视作业务授权。', '选型实验应固定同一任务与数据，把框架外壳替换后比较所需代码、恢复语义、观测和失败边界。LlamaIndex 与 Haystack 在检索和数据编排上提供不同抽象，Mem0 与 Letta 则强调不同的记忆边界，它们不是简单同类排名。']),
  capstone: s('工程推导：把交付切成可验证里程碑', ['里程碑一：只读检索，答案有证据与权限范围；里程碑二：类型化工具与审批，写后回读；里程碑三：持久 checkpoint、取消与恢复；里程碑四：分层评测、观测和回滚。每一步都应有 seed data、运行命令、失败用例和已知限制。', '当前仓库的综合实验是策略教学与部署骨架，不能据此声称数据库、模型和向量检索已全部连通。真正完成集成需要提供可执行的端到端测试和依赖启动证据；学习时把这张差距清单作为毕业验收，而不是把占位节点当成实现。'])
};
Object.entries(IMPLEMENTATION_NOTES).forEach(([id, section]) => CHAPTER_BY_ID[id].sections.push(section));

// One runnable command per lab, also used by scripts/check.py.
LABS.forEach(lab => {
  if (lab.id !== 'real-stack') lab.commands = [`python3 -m unittest discover -s ${lab.path} -p 'test_*.py' -v`];
});

CHAPTER_BY_ID['harness-engineering'].sections.push(s('12.5 Skills：过程知识的渐进加载', [
  'Agent Skills 规范把技能组织成含 SKILL.md 的目录，文件包含 name、description 等元数据和执行说明，可以附带 scripts、references、assets。metadata 用于发现，正文按需读取，附属资源在任务需要时再加载。这个结构降低了把所有流程长期塞进 Prompt 的压力。',
  'Skill 解决“如何完成这一类任务”，MCP 解决“怎样发现和调用外部能力”，二者可以组合。技能描述不是授权凭据；它即使写着“允许执行”，工具运行时仍需检查当前 actor、资源与确认状态。外部技能还需要来源、版本与审查，避免把供应链内容升级为高信任策略。',
  '评测技能时固定同一组任务，对比未加载与加载后的成功率、错误工具调用和 token；为触发误判准备近似但不相关的请求。技能越长越全面并不自动更好，能否被正确发现、执行和验证才是关键。'
], {code:'skill-name/\n  SKILL.md      # name, description + instructions\n  scripts/      # optional executable helpers\n  references/   # load only the relevant reference\n  assets/       # optional templates and resources'}));
CHAPTER_BY_ID['harness-engineering'].sources.push({label:'Agent Skills · 格式规范',url:'https://agentskills.io/specification'});
CHAPTER_BY_ID['advanced-tools'].sections.push(s('13.5 MCP、A2A 与界面事件协议的分工', [
  'MCP 为应用提供工具、资源与提示的互操作接口；A2A 关注独立 Agent 之间的消息、任务、状态与产物交换。把远程 Agent 当作一个返回字符串的工具虽然可行，但会丢失长期任务状态、取消和结果交付的语义。是否引入 A2A 取决于是否真的需要跨团队或跨运行时互操作。',
  'Agent Card 是能力发现入口，不是业务身份担保。客户端仍需认证服务端，按部署的规范版本处理消息与任务标识，维护取消、超时、流中断和重复事件。最终产物必须能追溯到原始 task，不能把“服务已接受任务”显示为“任务已完成”。',
  '面向前端的事件流还需稳定 event id、run id 与明确的状态转换。重连从最近确认的序号恢复；迟到事件不能把已取消任务重新标为运行中。界面应区分“模型输出中”“等待工具”“等待审批”和“完成”，以对应真实执行状态。'
]));
CHAPTER_BY_ID['advanced-tools'].sources.push({label:'A2A · 官方规范',url:'https://a2a-protocol.org/latest/specification/'});

Object.assign(TOPIC_BY_ID.mcp, {
  mechanism: '协议行为必须注明版本。2025 系列典型流程为 initialize 握手；2026-07-28 已移除握手与协议级 HTTP session，改为逐请求 _meta 版本和能力声明，并使用 server/discover 发现支持能力。',
  implementation: '先固定规范与 SDK 版本。新版请求携带协议元数据，服务端做版本校验；可信 actor、业务授权、schema 与结果校验仍由应用执行。Lab 13 仅演示旧版内存 handler。',
  sources: [{label:'MCP 2026-07-28 规范',url:'https://modelcontextprotocol.io/specification/2026-07-28'},{label:'官方迁移变化',url:'https://modelcontextprotocol.io/specification/2026-07-28/changelog'}]
});

const frontierTopics = [
  t('agent-harness','Agent Harness','runtime','围绕模型组织环境、工具、状态、预算、验收与恢复的执行系统。','把每轮生成放在可验证的外部环境中，通过观测与验收决定继续、完成或交接。','保存工作区版本、任务清单、receipt 和下一步；新会话从事实重建。','记录过多会产生噪声；仅靠摘要仍可能丢失约束。','测量恢复时间、重复工作和验收正确性；先从单 Agent 基线开始。',['agent-loop','compaction','durable-execution'],CHAPTER_BY_ID['harness-engineering'].sources),
  t('tool-discovery','动态工具发现','runtime','按任务检索能力摘要，再加载所需工具的完整 schema。','发现、加载与执行分层，减少全量工具定义进入上下文。','给能力建立稳定 id、语义描述与 schema 版本；执行前重新检查权限。','发现错误会遗漏工具；加载成功不表示有权执行。','独立评测工具召回、误选和参数正确性。',['tool-schema','mcp','authorization'],CHAPTER_BY_ID['advanced-tools'].sources),
  t('agent-skills','Agent Skills 标准','memory','用 SKILL.md 和可选资源封装可复用的任务流程知识。','元数据用于发现，正文与资源按需加载，控制上下文体积。','name 和 description 描述适用任务，正文写执行与验收，脚本处理确定性步骤。','技能可能过时、错误触发或携带恶意指令；格式不保证正确性。','固定来源与版本，为触发和执行建立回归样例。',['procedural-memory','context-builder','authorization'],[{label:'Agent Skills 规范',url:'https://agentskills.io/specification'}]),
  t('a2a-protocol','A2A 与远程任务','graph','为独立 Agent 间的能力发现、消息、任务状态与产物交换建立协议。','客户端发现 Agent Card，发送消息并观察任务进度与 artifact。','固定部署版本，分别处理 task id、认证、取消和重复事件。','协议增加部署与兼容成本，不会提升单个模型的推理能力。','只有存在跨系统协作需求才引入；产物与原始任务关联验收。',['subagents','authorization','tracing'],[{label:'A2A 官方规范',url:'https://a2a-protocol.org/latest/specification/'}]),
  t('multimodal-agent','多模态 Agent','production','将视觉或音频作为观测，在受控环境中行动并重新验证结果。','观测带时间与坐标，动作后重新获取状态，避免过时定位。','优先语义定位，保留截图/转写来源与时间，关键写入绑定明确确认。','画面与转写有误差，旧截图不能保证动作时状态。','分别测感知、定位、行动成功和任务结果。',['sandbox','evaluation','tracing'],CHAPTER_BY_ID['multimodal-evals'].sources)
];
KNOWLEDGE_TOPICS.push(...frontierTopics);
frontierTopics.forEach(topic => {TOPIC_BY_ID[topic.id] = topic;});
CHAPTER_BY_ID['harness-engineering'].topicIds.push('agent-harness','agent-skills');
CHAPTER_BY_ID['advanced-tools'].topicIds.push('tool-discovery','a2a-protocol');
CHAPTER_BY_ID['multimodal-evals'].topicIds.push('multimodal-agent');

const deepAgentsRef = '0324ff31d18171fceddbd3084ff388b7a964c51b';
const deepAgentsPath = 'https://github.com/langchain-ai/deepagents/blob/' + deepAgentsRef + '/';
const deepAgentsCase = p('deepagents','Deep Agents','Agent Harness','开源 · Python',
  '在 LangChain agent 与 LangGraph 状态运行时上组合文件系统、上下文管理、技能和子代理等能力。阅读重点是 create_deep_agent 如何组装 middleware，以及 backend 与权限如何形成执行边界。',
  'flowchart LR\n  Config[模型与配置] --> Factory[create_deep_agent]\n  Factory --> Middleware[文件系统与子代理 middleware]\n  Middleware --> Agent[LangChain create_agent]\n  Agent --> Graph[LangGraph 执行与持久化]\n  Middleware --> Backend[受限 backend]',
  [
    {name:'graph.py · create_deep_agent',what:'构建统一 agent 并传入持久化依赖。',how:'组装 middleware 列表，最后调用 create_agent，传递 checkpointer 与 store。',why:'复用高层 agent loop，将能力组合与运行状态分开。'},
    {name:'middleware/filesystem.py',what:'提供文件工具并执行文件权限检查。',how:'通过 backend 访问状态或真实文件系统；真实路径解析与权限检查阻止别名路径绕过。',why:'同一工具 contract 可对应不同存储环境，但访问控制必须作用于真实目标。'},
    {name:'middleware/subagents.py',what:'把子代理能力暴露为 task 工具。',how:'定义 SubAgent 配置，验证配置与名称，并构建可调用工具；不同委派模式有不同上下文语义。',why:'明确任务交接边界，避免假设所有子代理共享相同消息。'}
  ],
  ['create_deep_agent 接收模型、工具、backend、middleware 和持久化配置。','工厂验证配置并组装文件系统与子代理等 middleware。','create_agent 接收组装后的 middleware，构建执行流程。','文件工具经 backend 与权限检查执行，子任务通过 task 工具委派。','状态保存交给 checkpointer 或 store，外部副作用仍需独立幂等设计。'],
  ['复用 LangChain/LangGraph，把 Harness 能力放在 middleware 与 backend 层。','文件权限必须考虑真实路径和 symlink，而不仅是用户传入字符串。'],
  ['功能和模式持续演进，旧文章中的默认配置未必适用于当前源码。','通用 Harness 不会自动满足你的业务授权和写入一致性。'],
  ['固定 commit 与最小配置，先验证单 Agent 的读写和恢复。','对委派模式、路径别名与工具预算建立负向测试。'],
  'Deep Agents 位于 LangChain agent API 之上，持久状态继续依赖 LangGraph；与 OpenHands 的 sandbox 产品运行时不同，它强调可组合 Harness 能力。',
  [{label:'官方文档',url:'https://docs.langchain.com/oss/python/deepagents/overview'},{label:'本次核验的源码快照',url:'https://github.com/langchain-ai/deepagents/tree/'+deepAgentsRef}]);
PROJECT_CASES.push(deepAgentsCase); PROJECT_BY_ID.deepagents = deepAgentsCase; PROJECT_SOURCE_REFS.deepagents = deepAgentsRef;
PROJECT_SOURCE_READINGS.deepagents = {
  verified: true, ref: 'main @ 0324ff3（2026-10-22 实际读取并核验路径与关键符号）',
  chain:'create_deep_agent → middleware assembly → create_agent → backend / checkpointer / store',
  files:[
    ['工厂入口','libs/deepagents/deepagents/graph.py',deepAgentsPath+'libs/deepagents/deepagents/graph.py#L278','从 278 行的 create_deep_agent 声明阅读参数，再对照 995 行的 create_agent 调用，检查持久化配置如何传递。'],
    ['文件系统边界','libs/deepagents/deepagents/middleware/filesystem.py',deepAgentsPath+'libs/deepagents/deepagents/middleware/filesystem.py#L421','_resolve_real_path 解析实际路径，再对照 _permission_error 的调用链，理解 symlink 为什么影响权限。'],
    ['子代理 contract','libs/deepagents/deepagents/middleware/subagents.py',deepAgentsPath+'libs/deepagents/deepagents/middleware/subagents.py#L84','先看 SubAgent 类型，再读配置与名称校验；不要假设不同委派模式有完全相同的消息继承。']
  ]
};

PROJECT_BY_ID.letta.status = '历史 V1 源码案例';
PROJECT_BY_ID.letta.relations += ' 2026-10-22 已核对官方 README：V1 服务端进入 archive，当前开发位于 letta-ai/letta-code。此页模块解释固定在历史 V1，不能据此推断当前代码。';
PROJECT_BY_ID.letta.sources.push({label:'当前 Letta Code 源码',url:'https://github.com/letta-ai/letta-code/tree/035bb8c8917b5dd94a3989d4adf04860a2ce8fea'});
PROJECT_BY_ID.openhands.status = '历史 0.62 Python 架构';
PROJECT_BY_ID.openhands.relations += ' 当前 OpenHands 主仓库已演进为 Agent Canvas；这里保留 0.62.0 的 Action/Observation 运行时作为历史架构案例。';
PROJECT_BY_ID.openhands.sources.push({label:'当前 Agent Canvas 源码与说明',url:'https://github.com/OpenHands/OpenHands/tree/df87d66078f8e2a3bc95e2118157311896c8b79d'});

MODERN_CHAPTERS.forEach(chapter => {
  QUIZZES_BY_CHAPTER[chapter.id] = [
    { q: chapter.id === 'mcp-evolution' ? 'MCP 2026-07-28 是否仍要求 initialize 握手？' : `学习本章后，哪种验证方式最可靠？`, options: chapter.id === 'mcp-evolution' ? ['仍然要求', '已移除，改为逐请求版本与能力元数据', '由模型决定'] : ['只看最终文字', '校验环境结果、证据与过程约束', '只看模型品牌'], answer: 1, why: chapter.id === 'mcp-evolution' ? '官方 changelog 明确移除 initialize/initialized，客户端需要按新版请求契约实现。' : '可重现的运行事实可以区分正确执行与偶然答对。' },
    { q: '示例成功运行是否等于生产环境已完成集成？', options: ['是', '否，还需验证真实依赖、权限、失败恢复和验收', '只有代码行数够多才算'], answer: 1, why: '教学实现、骨架和真实集成必须明确区分。' }
  ];
});
