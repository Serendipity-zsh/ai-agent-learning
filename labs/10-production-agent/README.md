# Lab 10：长期运行与可靠交付

实现 job lease、heartbeat、cancel token、retry policy 和 outbox。验收重点不是“永不失败”，而是 worker 崩溃后可安全接管，重复投递不重复产生外部副作用。下一轮将提供参考实现与测试。
