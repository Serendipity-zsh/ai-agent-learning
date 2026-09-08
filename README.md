# Agent Field Notes

一套可以直接在网页上逐课学习的 AI Agent 系统课程：从 Token、Transformer 和推理机制开始，经过 Prompt、Embedding、RAG、Tool Calling、Agent Loop、Memory、LangChain、LangGraph、Multi-agent，最后完成可靠性、部署和源码阅读。

## 在线学习

GitHub Pages: https://serendipity-zsh.github.io/ai-agent-learning/

## 学习方式

- 每个课次先读“为什么学”和底层机制，再完成动手练习。
- 用 trace、日志和测试样例观察过程，不只看最终答案。
- 每完成一个课次，在网页上勾选进度，并把实验记录写入自己的 notes/ 目录。
- 源码阶段沿着公共 API → 类型协议 → 执行器 → 持久化/调度的顺序阅读。

## 课程阶段

0. 学习方法与先修基础
1. LLM、Transformer 与推理原理
2. Prompt Engineering
3. Embeddings、搜索与 RAG
4. Tool Calling 与 Agent Loop
5. Memory、State 与 Context Engineering
6. LangChain：从抽象到实现
7. LangGraph：状态图与运行时
8. Workflow、Multi-agent 与 Graph Patterns
9. Evaluation、Tracing 与可靠性
10. 部署、性能与数据工程
11. 优秀开源项目源码导读
12. 毕业项目：企业知识与工单助手

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 http://localhost:8000。

## 资料原则

教材正文优先依据官方文档、官方仓库和论文；开源项目解剖会区分“官方文档明确说明的架构”和“基于源码阅读的实现推断”。项目迭代很快，源码路径和 API 以仓库当前版本为准。

核心入口：

- LangChain: https://docs.langchain.com/oss/python/langchain/overview
- LangGraph: https://docs.langchain.com/oss/python/langgraph/overview
- OpenClaw: https://github.com/openclaw/openclaw
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- Claude Code: https://code.claude.com/docs/en/how-claude-code-works
