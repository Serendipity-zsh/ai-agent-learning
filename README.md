# Agent Systems Manual

一套可直接阅读、检索和实践的 AI Agent 中文技术课程。内容从 LLM 第一性原理开始，贯穿 Prompt、RAG、Tool、Agent Runtime、Context、Memory、LangChain、LangGraph、Multi-agent、评估、安全与生产化，并提供优秀项目的源码级架构解读。

## 在线学习

- GitHub Pages: https://serendipity-zsh.github.io/ai-agent-learning/
- GitHub Repository: https://github.com/Serendipity-zsh/ai-agent-learning

## 内容结构

网站不再把“课程”和“教材”维护成两套浅层目录。统一知识模型分为五个入口：

1. **技术地图**：7 层技术树，先看模块之间的依赖关系。
2. **系统课程**：12 章连续教材，从第一性原理组织正文、架构图、代码、实验和验收标准。
3. **概念辞典**：70 个原子技术点，每个词条都解释定义、底层机制、工程实现、局限、优化方向、关联概念和一手资料。
4. **源码解剖**：11 个项目案例，覆盖 LangChain、LangGraph、LlamaIndex、Haystack、Mem0、Letta、OpenClaw、Hermes Agent、Claude Code、OpenHands 和 AutoGen。
5. **实战实验**：10 条由浅入深的 Python-first 实验路径；目前前 4 个提供无密钥参考实现和单元测试，其余实验先提供设计契约与验收标准，并将持续补齐。

## 推荐学习顺序

每章按照下面的闭环学习：

```text
概念 → 底层机制 → 最小实现 → 实验 → 失败分析 → 工程化 → 源码对照
```

- 先阅读章节，理解该系统要解决的问题和关键边界。
- 点击章节右侧的原子技术点，补全实现细节。
- 完成章末实验，用 trace、状态变化和测试判断是否掌握。
- 再进入源码解剖，对照真实项目如何做抽象与取舍。
- 进度保存在浏览器 `localStorage`，不上传个人学习数据。

## 数据文件

- `knowledge-data.js`：7 个领域、70 个原子知识点。
- `chapters-data.js`：12 章系统课程和可验证实验。
- `projects-data.js`：11 个源码/产品架构案例。
- `labs-data.js` 与 `labs/`：实验路线、说明、参考实现和测试。
- `app.js`：深链路由、全文搜索、课程进度和内容渲染。

所有页面都由上述统一数据生成，避免课程、教材和辞典之间内容漂移。

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 http://localhost:8000。

## 资料与证据原则

- 优先使用官方文档、官方仓库和原始论文。
- 开源项目区分“源码直接可见的实现”和“根据公开接口做出的推断”。
- Claude Code 是闭源产品，因此只依据官方公开文档分析其 agentic loop、工具、上下文、权限和会话架构，不把未知内部实现描述成源码事实。
- 项目迭代较快，学习时应固定 commit/tag，并重新验证源码路径和 API。
