# zvec-grep（zg）：从 rg 到带排序的本地搜索

`zg` is zvec-grep: a local-first search layer that unifies ripgrep, BM25,
and vector search behind one CLI. Install with:

```bash
npm install -g @zvec/zvec-grep
```

Requires Node.js 22+. Then, from a workspace:

```bash
zg index --embedding local/potion-retrieval-32m
zg status
zg query --human "hybrid search BM25 vector" --limit 5
```

`zg` 把三件事收成一个入口：

1. `--rg`：字面量 / 正则，不需要索引
2. `--fts`：BM25 词法排序
3. `--vector`：语义相似
4. 默认 / `--hybrid`：词法 + 向量融合

输出按文件分组、带行号 span，方便人和 agent 引用原文。本 demo 的 Flask 后端
优先调用 PATH 上的 `zg`；没有 zg 时退回 sample-kb 的确定性关键词打分，保证
UI 永远能搜。
