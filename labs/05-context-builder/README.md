# Lab 05：上下文编译器

运行：`python3 -m unittest labs/05-context-builder/test_context_builder.py -v`

参考实现验证三条不变量：只有 trusted content 能进入 policy lane；未授权内容绝不进入 context；预算裁剪必须保留 manifest。接入真实 tokenizer 时只替换 `tokens`。
