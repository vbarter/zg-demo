# Local-first 与隐私

Local-first means the knowledge base lives on disk next to the repo.
Indexes, embeddings, and query logs do not leave the machine unless you
explicitly enable a remote embedding provider.

本地优先在这个 demo 里的含义：

- 工作区路径由 `ZG_ROOT` 指定，默认 `sample-kb/`
- 索引目录 `.zvec-grep/` 写在工作区根下，已被 gitignore
- Flask 只读本地文件 + 可选调用本机 `zg`，没有云端 KB 账号
- 不需要 API key 就能跑完整条搜索链路（mock 路径）

远程 embedding（例如 DashScope / Qwen text-embedding）可以后续接上，但 MVP
刻意不做：演示的是「工作区搜索」，不是「把文档上传到别人家」。

DeepSeek Harness（DSH）不在本 MVP 范围。后续可以用 zg 的本地 MCP
（`zg server` / `zg install`）挂到 agent，但那是另一条集成线。
