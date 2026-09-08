# Lab 07：图状态与 Checkpoint

运行：`python3 -m unittest labs/07-graph-checkpoint/test_graph_state.py -v`

参考实现展示最重要的一条恢复语义：恢复可以重新进入节点，但使用相同 idempotency key 的 gateway 只能执行一次外部写入。真实 LangGraph 的 checkpointer、thread 与 interrupt 比本实验更完整，但边界相同。
