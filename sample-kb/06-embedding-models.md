# 本地 Embedding 模型

zg 默认用轻量本地模型，CPU 即可，不强制 GPU。文档里常见的起点：

| 模型 | 适用 |
| --- | --- |
| `local/potion-retrieval-32m` | 文档 / 知识库检索（本 demo 默认） |
| `local/potion-code-16m-v2` | 源码工作区，体积更小 |
| `local/jina-embeddings-v2-base-code` | 更大的代码 embedding，需显式 rebuild |

换模型必须 `zg index --rebuild --embedding <id>`，因为向量空间不可混用。

This demo sets `ZG_EMBEDDING=local/potion-retrieval-32m` unless you override
it. No cloud key is required for that default. If you later point
`ZVEC_GREP_EMBEDDING` at a remote Qwen / DashScope model, zg will ask for
explicit `--allow-remote` or a workspace grant — do not bake secrets into
this repo.
