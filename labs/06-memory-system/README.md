# Lab 06：记忆写入策略

设计事实记忆记录：`value, provenance, confidence, expires_at, version`。实现 ADD/UPDATE/DELETE，并测试低可信 observation 无法覆盖用户确认信息、过期记录不可召回、每个变更带原因。下一轮将提供参考实现与测试。
