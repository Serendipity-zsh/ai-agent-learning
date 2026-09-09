# Lab 12：可持久化的向量索引

目标：不把向量数据库当魔法。这里用 Python 标准库 SQLite 保存向量 BLOB 和 metadata，用余弦相似度完成最小检索，并显式处理租户隔离、维度契约和删除传播。

```bash
python3 -m unittest labs/12-sqlite-vector-store/test_vector_store.py -v
```

生产替换点：SQLite 全表扫描只能用于教学和小规模数据；规模增长后把 `search` 换成 HNSW/IVF 等 ANN 索引，但保留 tenant filter、版本、删除标记和 source id contract。
