# Zvec：本地向量与检索内核

Zvec is Alibaba's local-first vector / retrieval library. It is the engine
under zvec-grep (`zg`): embed text on device, store a compact index next to
the workspace, and retrieve by meaning without shipping source to a cloud
database.

Zvec 是阿里开源的本地向量与检索内核，也是 zvec-grep（`zg`）的底层。文本在本机
完成 embedding，索引落在工作区旁边（通常是 `.zvec-grep/`），检索不依赖远程
向量库。

核心点：

- 嵌入式库，不是要单独部署的服务
- 同一份本地索引同时服务 CLI 与 MCP agent
- 默认走本地模型；远程 embedding 必须显式授权

This demo treats Zvec as the retrieval substrate, and zg as the human/agent
CLI sitting on top.
