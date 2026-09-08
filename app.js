const modules = [
  { id: 'm1', label: '01', title: 'LLM 应用基础', time: '第 1 周', color: 'blue', goal: '建立对 LLM 应用运行过程的准确心智模型。', concepts: ['message：system / user / assistant / tool', 'context window、token、temperature', 'structured output 与 tool calling', 'streaming、latency、cost'], practice: '不用框架写一个“项目管理助手”的模型调用流程：先让它识别意图，再决定是否调用查询项目工具。', check: '你能解释模型看到了哪些上下文，并画出一次完整的 tool call 循环。', resource: '先掌握模型原生 API，再进入框架。' },
  { id: 'm2', label: '02', title: 'Prompt Engineering', time: '第 2 周', color: 'yellow', goal: '把自然语言指令写成可测试、可迭代的行为契约。', concepts: ['角色、任务、边界、输出格式', 'few-shot examples', '拒答与不确定性处理', 'JSON Schema / Pydantic 输出约束'], practice: '为同一个信息抽取任务写三个 Prompt，使用 20 条测试样例比较格式遵循率和幻觉率。', check: '你能说明一次 Prompt 修改改善了哪个指标，而不是只说“感觉更好”。', resource: '把 Prompt 当作程序，把样例当作测试。' },
  { id: 'm3', label: '03', title: 'Retrieval 与 RAG', time: '第 3–4 周', color: 'green', goal: '让模型能在运行时获取外部知识，并基于证据回答。', concepts: ['loader、cleaning、chunking', 'embedding、vector store、retriever', 'BM25、hybrid search、reranking', '2-Step RAG、Agentic RAG、Hybrid RAG'], practice: '构建一个本地 Markdown/PDF 问答系统，输出引用来源，并在没有证据时拒答。', check: '你能分别评估检索质量（recall/relevance）和回答质量（faithfulness）。', resource: '先做可预测的 2-Step RAG，再做 Agentic RAG。' },
  { id: 'm4', label: '04', title: 'Agent 与工具', time: '第 5–6 周', color: 'orange', goal: '理解 Agent 如何选择工具、执行行动并安全终止。', concepts: ['tool schema 与工具描述', 'agent loop 与终止条件', 'retry、timeout、最大步数', 'single-agent、planner/executor、multi-agent'], practice: '为文档问答助手增加 SQL 查询工具；查询可以自动执行，写入操作必须人工确认。', check: '你能画出成功、工具失败、超时、重复调用四条路径。', resource: '模型负责决策，代码负责边界与副作用。' },
  { id: 'm5', label: '05', title: 'Memory 与 State', time: '第 7 周', color: 'purple', goal: '正确区分当前线程状态、跨会话记忆和外部事实。', concepts: ['短期 memory 与 conversation history', 'checkpoint、thread、session', '长期用户偏好', '记忆写入、更新、删除、过期与权限'], practice: '实现一个跨会话助手：能记住用户偏好，也能列出、修改和删除记忆。', check: '你能判断一条信息应该放在消息历史、长期 memory、RAG 还是业务数据库。', resource: '“记住”不等于把所有历史消息永久塞进 Prompt。' },
  { id: 'm6', label: '06', title: 'LangChain', time: '第 8 周前半', color: 'red', goal: '用框架抽象快速组合模型、Prompt、工具和 Retriever。', concepts: ['model、messages、prompt template', 'tools、retrievers、structured output', 'middleware、callbacks、streaming', 'LangSmith tracing 与 evaluation'], practice: '用 LangChain 重写前面的 RAG 和工具 Agent，对比手写版本的抽象边界。', check: '你能在不查旧教程的情况下说明每个抽象解决什么问题。', resource: '当前官方 Agent 入口优先学习 `create_agent`。' },
  { id: 'm7', label: '07', title: 'LangGraph', time: '第 8 周后半–9 周', color: 'cyan', goal: '把复杂 Agent 编排为有状态、可中断、可恢复的图。', concepts: ['State、Node、Edge', 'sequence、branch、loop', 'checkpoint、interrupt、人机协作', 'subgraph、streaming、durable execution'], practice: '构建研究 Agent Graph：问题分类 → 搜索 → 摘要 → 事实验证 → 失败重试 → 最终报告。', check: '你能解释哪些逻辑交给模型，哪些逻辑必须写成确定性节点。', resource: 'LangGraph 是编排运行时，不是 Prompt 魔法。' },
  { id: 'm8', label: '08', title: 'Context / Loop / Graph Engineering', time: '第 10 周', color: 'ink', goal: '从“能跑”提升到“可控、可测、可运营”。', concepts: ['Context：选择、排序、压缩、权限', 'Loop：预算、幂等、重试、终止', 'Graph：状态契约、分支、恢复', 'eval、trace、cost、latency、fallback'], practice: '完成企业知识与工单助手：问答、SQL、建单、审批、审计、评估全部串起来。', check: '每个节点都有输入输出契约，每个副作用都有确认或幂等保护。', resource: '生产 Agent 的核心不是自主性，而是可靠性。' }
];

const nav = document.querySelector('#module-nav');
const detail = document.querySelector('#module-detail');
const saved = JSON.parse(localStorage.getItem('agent-field-notes-progress') || '{}');

function renderNav(active = modules[0].id) {
  nav.innerHTML = modules.map(m => `<button class="module-tab ${m.id === active ? 'active' : ''}" data-id="${m.id}"><span>${m.label}</span><strong>${m.title}</strong><small>${m.time}</small></button>`).join('');
  nav.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { renderNav(btn.dataset.id); renderDetail(btn.dataset.id); }));
}
function renderDetail(id) {
  const m = modules.find(item => item.id === id);
  const done = Boolean(saved[id]);
  detail.innerHTML = `<div class="detail-top"><span class="phase-dot ${m.color}"></span><div><p class="kicker">${m.label} / ${m.time}</p><h3>${m.title}</h3></div><label class="complete-toggle"><input type="checkbox" ${done ? 'checked' : ''} data-complete="${m.id}" /><span>${done ? '已完成' : '标记完成'}</span></label></div><p class="detail-goal">${m.goal}</p><div class="detail-columns"><div><h4>关键内容</h4><ul>${m.concepts.map(c => `<li>${c}</li>`).join('')}</ul></div><div><h4>动手练习</h4><p>${m.practice}</p><h4>验收标准</h4><p>${m.check}</p></div></div><div class="detail-foot"><span>学习提示</span><strong>${m.resource}</strong></div>`;
  detail.querySelector('input').addEventListener('change', e => { saved[id] = e.target.checked; localStorage.setItem('agent-field-notes-progress', JSON.stringify(saved)); renderDetail(id); });
}
renderNav(); renderDetail(modules[0].id);
