const QUIZZES_BY_CHAPTER = {
  'system-boundary': [
    { q: '哪个部分真正执行了外部副作用？', options: ['模型', '策略与工具运行时', 'Prompt'], answer: 1, why: '模型只提出调用意图；策略批准后由工具运行时执行。' },
    { q: '什么时候优先选择 Workflow？', options: ['步骤和分支可预先枚举', '希望模型更自由', '需要永久记忆'], answer: 0, why: '固定流程用确定性图更容易测试、审计和恢复。' }
  ],
  'model-foundation': [
    { q: 'KV cache 与 prompt cache 的关键区别是什么？', options: ['前者是跨用户永久存储', '前者通常服务单次生成，后者可复用稳定前缀', '两者完全相同'], answer: 1, why: '生命周期和复用边界不同，不能把它们当作同一种缓存。' },
    { q: 'temperature=0 不能保证什么？', options: ['输出更集中', '事实一定正确', '采样更少随机'], answer: 1, why: '确定性解码仍可能稳定地产生错误事实。' }
  ],
  'prompt-protocol': [
    { q: 'JSON Schema 通过后还需要什么？', options: ['业务语义和权限校验', '再次随机采样', '删除 tool_call id'], answer: 0, why: '形状正确不代表资源存在、状态迁移合法或 actor 有权限。' },
    { q: 'Prompt 版本回归的最小样本应包含什么？', options: ['只有成功样例', '成功、边界、攻击和拒答样例', '只测 token 数'], answer: 1, why: '协议的可靠性主要由边界行为决定。' }
  ],
  'rag-system': [
    { q: 'top-k 中没有期望证据时属于哪类失败？', options: ['检索失败', '生成失败', 'UI 失败'], answer: 0, why: '证据未进入候选或最终 context，问题发生在 retrieval/context packing。' },
    { q: 'RRF 融合的对象是什么？', options: ['原始分值直接相加', '排名位置', '模型温度'], answer: 1, why: 'RRF 通过排名倒数融合不同检索器的排序。' }
  ],
  'agent-runtime': [
    { q: '工具超时后为什么不能无条件 retry？', options: ['模型会生气', '请求可能已成功但响应丢失', 'retry 永远无效'], answer: 1, why: '需要幂等键、receipt/read-back 和有限重试。' },
    { q: 'Agent loop 的停止条件至少应包括什么？', options: ['只看模型是否开心', 'final、预算耗尽、取消和不可恢复错误', '永不停止'], answer: 1, why: '停止必须是显式、可测试的运行时策略。' }
  ],
  'context-engineering': [
    { q: '不可信 tool result 最安全的处理方式是什么？', options: ['拼进 system prompt', '保留 provenance，作为受限 observation', '直接覆盖 policy'], answer: 1, why: '数据不能被提升为指令，强边界还需 policy/gateway。' },
    { q: '上下文装配首先要预留什么？', options: ['输出和后续工具回合预算', '所有历史消息', '装饰性说明'], answer: 0, why: '否则最后一步会因窗口不足而失败。' }
  ],
  'memory-system': [
    { q: '什么内容不适合自动晋升长期记忆？', options: ['用户确认的稳定偏好', '未经确认的敏感网页内容', '带来源的长期事实'], answer: 1, why: '低可信、敏感或不稳定内容需要拒绝、降级或请求确认。' },
    { q: '记忆更新为什么需要 history？', options: ['用于追踪覆盖、冲突和回滚', '为了增加 token', '为了隐藏来源'], answer: 0, why: '记忆是可变数据，历史让写入决策可解释。' }
  ],
  'graph-runtime': [
    { q: 'checkpoint 主要保存什么？', options: ['只有最终答案', '可恢复 state、metadata 和下一步', '模型权重'], answer: 1, why: '恢复需要状态快照与运行元数据。' },
    { q: 'interrupt 前的外部副作用为什么必须幂等？', options: ['恢复可能重新执行 node', '图不能有节点', '为了缩短 prompt'], answer: 0, why: '恢复语义不是从 Python 行继续，副作用可能再次发生。' }
  ],
  'multi-agent': [
    { q: '多 Agent 最小交付单位是什么？', options: ['完整聊天历史', '带证据和质量声明的 Artifact', '一个未校验字符串'], answer: 1, why: '类型化 artifact 才能被 coordinator 验收、合并和追踪。' },
    { q: '为什么要给 worker 单独预算？', options: ['控制成本、延迟和失控范围', '让它永不完成', '隐藏工具'], answer: 0, why: '委派边界必须可度量。' }
  ],
  production: [
    { q: 'at-least-once 交付如何避免重复写？', options: ['相信网络不丢包', '幂等键 + receipt/read-back', '关闭日志'], answer: 1, why: '重试可能重复到达，业务方必须识别同一操作。' },
    { q: 'SLO 评估 Agent 还应观察什么？', options: ['仅最终文本', '延迟、成本、拒绝率、恢复率和副作用', '字体大小'], answer: 1, why: 'Agent 的过程和可靠性同最终答案一样重要。' }
  ],
  frameworks: [
    { q: 'MCP tools/list 成功代表什么？', options: ['当前用户已获授权', '客户端能发现工具 schema', '工具一定安全'], answer: 1, why: '协议发现、schema 校验和业务授权是不同层。' },
    { q: 'LangChain 与 LangGraph 的典型关系是什么？', options: ['完全互斥', 'LangChain 提供高层 agent 组装，复杂控制流可下沉到 LangGraph', 'LangGraph 只做 embedding'], answer: 1, why: '高层易用性和底层可恢复图运行时可以组合。' }
  ],
  capstone: [
    { q: '项目管理 Agent 的写路径应是什么？', options: ['模型直接写数据库', 'propose → confirm → execute → read-back', '只生成一段解释'], answer: 1, why: '确认、幂等和回读共同构成安全写回闭环。' },
    { q: '毕业项目如何证明不是偶然答对？', options: ['只截最终答案', '保留 trace 并分层评估过程约束', '提高 temperature'], answer: 1, why: '需要证据、策略、恢复、成本和结果的可重复评测。' }
  ]
};
