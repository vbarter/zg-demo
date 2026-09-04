# zg-demo

本地优先知识库 demo：用 **Alibaba Zvec + zvec-grep (`zg`)** 做工作区搜索。

Flask 后端优先调本机 `zg` CLI；没装 zg 时走 `sample-kb/` 的确定性关键词打分，UI 不依赖 API key，开箱能搜。

这是一条垂直切片，不是企业知识库。无登录、无多用户、无 PDF ingest、无 DeepSeek Harness。

---

## 本地运行

```bash
# 依赖
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..

# 一条命令（推荐）
chmod +x scripts/dev.sh
./scripts/dev.sh
```

或两个终端：

```bash
# terminal 1 — API  http://127.0.0.1:5000
python3 backend/app.py

# terminal 2 — UI   http://127.0.0.1:5173  （/api 反代到 Flask）
cd frontend && npm run dev
```

环境变量：

| 变量 | 默认 | 含义 |
| --- | --- | --- |
| `ZG_ROOT` | `<repo>/sample-kb` | 工作区路径 |
| `ZG_EMBEDDING` | `local/potion-retrieval-32m` | 转发给 `ZVEC_GREP_EMBEDDING` |
| `FLASK_PORT` | `5000`（本地） | `python backend/app.py` 端口 |
| `PORT` | `8080`（生产） | gunicorn 端口 |
| `FLASK_HOST` | 本地 `127.0.0.1` / 生产 `0.0.0.0` | 监听地址；显式设置则覆盖 |
| `ZG_DEMO_ENV` / `FLASK_ENV` | 空 | `production` 时托管 `frontend/dist`、关 debug |
| `FLASK_DEBUG` | 本地 `1` / 生产 `0` | Flask debug |
| `CORS_ORIGINS` | 本地 Vite origin / 生产 `*` | 逗号分隔白名单，未设则按环境默认 |

可选：装真实 zg 再索引（Node 22+）：

```bash
npm i -g @zvec/zvec-grep
cd sample-kb
zg index --embedding local/potion-retrieval-32m
zg status
zg query --human "hybrid search BM25" --limit 5
```

然后刷新 UI 的「状态」页，`engine` 会从 `mock` 变成 `zg`。

---

## 云主机部署

单进程对外：gunicorn 听 `0.0.0.0:8080`，非 `/api` 走 Vite `frontend/dist`（SPA fallback `index.html`）。mock / zg 逻辑与本地相同。

```bash
git clone <this-repo> ~/dev/zg-demo
cd ~/dev/zg-demo
chmod +x scripts/deploy.sh
./scripts/deploy.sh
# 浏览器打开 http://SERVER:8080
```

`deploy.sh` 会建 `backend/.venv`、`pip install`、`npm ci && npm run build`，然后：

```bash
ZG_DEMO_ENV=production gunicorn --bind 0.0.0.0:${PORT:-8080} --chdir backend app:app
```

需要本机有 Python 3.11+ 和 Node 22+。防火墙放行 `8080`。要限制跨域：`CORS_ORIGINS=https://kb.example.com`。后台跑可用 `nohup ./scripts/deploy.sh &` 或自己挂 systemd；本仓库不带 Docker。

---

## 产品切片

- **搜索**：大搜索框 + 排序结果（path / snippet / score / lines），点击展开
- **知识库**：`GET /api/docs` 列 sample-kb，点开预览原文
- **状态**：health、zg 是否在 PATH、索引新鲜度；可触发 `POST /api/index`

后端约定：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | `{ ok: true }` |
| `GET` | `/api/status` | 工作区 / zg / 索引状态 |
| `POST` | `/api/index` | 触发索引（无 zg 则 mock no-op） |
| `POST` | `/api/search` | `{ query, limit? }` → ranked hits |
| `GET` | `/api/docs` | 列出 sample-kb 文件 |
| `GET` | `/api/docs/<path>` | 预览原文 |

`zg` 在 PATH 上时：`zg query` / `zg index` / `zg status`。stdout 先当 JSON 再当 `path:start-end` 文本解析。CLI 失败则回落 mock，保证 demo 不挂。

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Backend | Flask 3 + flask-cors + gunicorn, Python 3.11+ |
| Search | `zg` CLI if present, else keyword mock over `sample-kb/` |
| Frontend | Vite + React + TypeScript |
| UI | shadcn/ui, Tailwind, monochrome zinc, dark default |
| Sample corpus | 6 short CN/EN markdown files |

---

## English (short)

Local-first KB demo showing Zvec + zvec-grep (`zg`) as workspace search.

1. `pip install -r backend/requirements.txt`
2. `cd frontend && npm install && npm run dev` (proxy `/api` → Flask)
3. Other terminal: `python3 backend/app.py`
4. Optional: `npm i -g @zvec/zvec-grep` then `zg index` inside `sample-kb/`
5. VPS: `./scripts/deploy.sh` then `http://SERVER:8080` (gunicorn + `frontend/dist`)

No secrets. Mock search needs no API keys. DeepSeek Harness is **out of scope** for this MVP; DSH can later attach via zg’s local MCP (`zg server` / `zg install`).

---

## 非目标 / notes

- 不要把 DeepSeek Harness 接进这条 MVP。DSH 挂 MCP 可能卡住，留给后续。
- 不要提交 `.zvec-grep/`、`.env`、provider key。
- 换 embedding 模型必须 `zg index --rebuild --embedding <id>`，向量空间不能混用。
