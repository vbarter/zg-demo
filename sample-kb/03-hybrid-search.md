# 混合检索：BM25 + Vector

Hybrid search is the default zg route. It fuses lexical anchors (BM25 / FTS)
with embedding similarity so a query can hit both exact identifiers and
paraphrases.

为什么默认要 hybrid：

- 纯关键字（rg）漏掉「换了一种说法」的段落
- 纯向量会漂，专有名词、符号、报错码经常排不上去
- BM25 负责钉住术语；向量负责语义邻域；fuse 之后按相关度截断

调参建议（zg CLI）：

```bash
# 默认 hybrid
zg query "authentication flow"

# 已知术语时加锚点
zg query --hybrid "authentication flow" --fts "ForbiddenError" --fuse --limit 10

# 只要语义
zg query --vector "where credentials are validated"

# 只要穷尽字面量
zg query --rg -n -F "AuthService" src
```

This sample-kb file exists so searching “BM25”、“向量”、“hybrid”、“fuse”
always returns a ranked hit in the mock engine as well.
