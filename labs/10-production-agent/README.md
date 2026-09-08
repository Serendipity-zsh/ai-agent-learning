# Lab 10：长期运行与可靠交付

运行：`python3 -m unittest labs/10-production-agent/test_event_log.py -v`

参考实现验证 lease 接管、取消和 outbox 幂等。生产系统还需数据库事务、heartbeat、重试分类、DLQ、指标和补偿流程。
