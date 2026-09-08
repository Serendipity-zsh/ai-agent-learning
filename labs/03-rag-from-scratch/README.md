# Lab 03：从零实现混合检索

运行：`python3 -m unittest labs/03-rag-from-scratch/test_hybrid_retrieval.py -v`

真实系统中的 lexical 和 dense score 不可直接相加，因为分布和尺度不同。这个实验使用 Reciprocal Rank Fusion（RRF）只融合名次，保证两个召回器可独立替换。
