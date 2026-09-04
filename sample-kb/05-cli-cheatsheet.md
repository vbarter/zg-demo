# zg CLI 速查

常用命令（以已安装的 `zg help` 为准，flag 会随版本变）：

| 命令 | 作用 |
| --- | --- |
| `zg index --embedding local/potion-retrieval-32m` | 为当前工作区建索引 |
| `zg index` | 增量更新 |
| `zg index --rebuild --embedding <model>` | 换模型必须 rebuild |
| `zg status` / `zg status --check-ready` | 看新鲜度与建议动作 |
| `zg query --human "<q>" --limit 5` | 人类可读预览 |
| `zg query --fts "<term>"` | BM25 |
| `zg query --vector "<intent>"` | 纯向量 |
| `zg query --rg -n -F "<lit>"` | 无索引字面量 |

环境变量（本 demo 使用的别名 + zg 官方名）：

- `ZG_ROOT` — 工作区路径（Flask）
- `ZG_EMBEDDING` — 本 demo 的模型名，会转发给 `ZVEC_GREP_EMBEDDING`
- `ZVEC_GREP_EMBEDDING` — zg 官方默认模型
- `FLASK_PORT` — 后端端口，默认 5000

Indexed results report freshness: `fresh` or `possibly_stale`. The Status
page in this app surfaces that field when zg is installed.
