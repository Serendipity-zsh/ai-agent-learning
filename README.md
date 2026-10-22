# Agent Systems

从模型原理到可靠 AI Agent 的中文学习手册。以阅读、最小实现、实验、失败分析和源码对照组织内容。

在线学习：[ai.yusenleo.top](https://ai.yusenleo.top/) · [GitHub](https://github.com/Serendipity-zsh/ai-agent-learning)

## 学习内容

- 16 章课程，四阶段路径：模型与协议、可靠 Agent、工程与框架、前沿专题。
- 75 个概念词条、15 条实验路径、12 个项目案例和章节自测。
- 前沿内容核验于 2026-10-22：Harness、Deep Agents、动态工具、Agent Skills、A2A、MCP 2026 和多模态评测。
- 已有章节保留，同时增加工程实现、故障边界和验证方法。

## 使用方式

从学习中心开始或继续上次阅读。每章分为导读、正文小节、实现深读（部分章节）、实践与自测。笔记、错题、收藏和完成状态保存在当前浏览器，可在“我的学习”导出或合并导入。

原有章节、实验、概念和项目的 hash 链接仍有效。旧的章节/实验/测验存储键继续使用，不会重置已有记录。不同域名和 HTTP/HTTPS 的浏览器存储互相独立；换入口前先导出备份。

## 运行与检查

```bash
python3 -m http.server 8000
python3 scripts/check.py
# 可选：在线核验源码快照与路径，需要已登录的 GitHub CLI
node scripts/verify-sources.cjs
```

网站无需构建或安装前端依赖。架构图按需加载固定版本 Mermaid，加载失败时可阅读文本结构。原理实验不需要模型密钥；真实技术栈实验有单独的依赖与配置要求。

## 文件组织

- `knowledge-data.js`、`chapters-data.js`、`deep-dives-data.js`：基础课程、概念与实现深读。
- `modern-data.js`：本次新增章节、现有章节增补、前沿概念、实验边界与 Deep Agents 案例。
- `projects-data.js`、`source-*-data.js`：项目架构、源码快照与调用链。
- `labs-data.js`、`labs/`：实验说明、实现与测试。
- `quiz-data.js`、`learning-state.js`：测验内容、存储兼容与备份校验。
- `app.js`：路由、学习界面、搜索和交互。
- `tokens.css`、`styles.css`：主题和响应式阅读布局；设计约定见 [DESIGN.md](DESIGN.md)。

## 证据与实现边界

优先依据官方文档、论文与源码。标明协议版本，保留历史实现的独立标签。MCP Lab 13 使用 2025-06-18 内存教学 handler，不是 2026-07-28 合规传输实现。Provider 实验只覆盖非流式归一化与重试；Capstone 是策略练习，真实技术栈目录仍为骨架，不能据此声称模型、数据库、索引和 OTel 已端到端接通。

Deep Agents 提供本次实际读取的固定源码入口。Letta V1 与 OpenHands 0.62 保留为历史架构案例并链接当前项目。Claude Code 仅分析公开资料。在线路径检查证明快照和文件存在，不等于逐行审计全部行为。

详见 [CHANGELOG.md](CHANGELOG.md)。
