# Lab 05：上下文编译器

设计 `ContextSegment(source, trust, priority, text)`，并实现 budgeted builder。测试三条不变量：trusted policy 优先保留；tool/RAG 内容永远是 untrusted data；输出包含每段的装配与裁剪原因。下一轮将提供参考实现与测试。
