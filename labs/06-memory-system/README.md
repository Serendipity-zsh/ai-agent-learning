# Lab 06：记忆写入策略

运行：`python3 -m unittest labs/06-memory-system/test_memory.py -v`

参考实现聚焦最小写入治理：信任阈值、用户锁定、版本历史与 TTL。它刻意不实现向量检索，因为“是否可写入”应先于“如何相似度召回”。
