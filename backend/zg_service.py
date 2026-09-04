"""zg CLI integration with a deterministic mock fallback."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_EMBEDDING = "local/potion-retrieval-32m"
TEXT_SUFFIXES = {".md", ".txt", ".rst", ".py", ".ts", ".tsx", ".js", ".json"}
SKIP_DIRS = {".git", ".zvec-grep", "node_modules", "dist", "__pycache__", ".venv", "venv"}

LINE_HEADER = re.compile(
    r"^(?P<path>(?:\./)?[\w./\\-]+\.[\w]+):(?P<start>\d+)(?:-(?P<end>\d+)|:(?P<end2>\d+))?"
)
PATH_ONLY = re.compile(r"^(?P<path>(?:\./)?[\w./\\-]+\.[\w]+)\s*$")
CJK_RE = re.compile(r"[\u4e00-\u9fff]{2,}")
WORD_RE = re.compile(r"[A-Za-z0-9_]{2,}")


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def workspace_root(override: str | None = None) -> Path:
    raw = override or os.environ.get("ZG_ROOT") or str(repo_root() / "sample-kb")
    path = Path(raw).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"workspace not found: {path}")
    return path


def embedding_model() -> str:
    return os.environ.get("ZG_EMBEDDING") or os.environ.get(
        "ZVEC_GREP_EMBEDDING", DEFAULT_EMBEDDING
    )


def zg_binary() -> str | None:
    return shutil.which("zg")


def zg_available() -> bool:
    return zg_binary() is not None


def _zg_env() -> dict[str, str]:
    env = os.environ.copy()
    model = embedding_model()
    env.setdefault("ZG_EMBEDDING", model)
    env.setdefault("ZVEC_GREP_EMBEDDING", model)
    return env


def run_zg(
    args: list[str],
    cwd: Path,
    timeout: int = 180,
) -> subprocess.CompletedProcess[str]:
    binary = zg_binary()
    if not binary:
        raise FileNotFoundError("zg is not on PATH")
    return subprocess.run(
        [binary, *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
        env=_zg_env(),
        check=False,
    )


def _iso(ts: float | None = None) -> str:
    value = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else datetime.now(timezone.utc)
    return value.replace(microsecond=0).isoformat()


def list_docs(root: Path | None = None) -> list[dict[str, Any]]:
    root = root or workspace_root()
    files: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        rel = path.relative_to(root).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        files.append(
            {
                "path": rel,
                "size": path.stat().st_size,
                "mtime": _iso(path.stat().st_mtime),
                "title": _title_from_text(text, rel),
            }
        )
    return files


def read_doc(relpath: str, root: Path | None = None) -> dict[str, Any]:
    root = root or workspace_root()
    target = (root / relpath).resolve()
    if root not in target.parents and target != root:
        raise ValueError("path escapes workspace")
    if not target.is_file():
        raise FileNotFoundError(relpath)
    text = target.read_text(encoding="utf-8", errors="replace")
    return {
        "path": target.relative_to(root).as_posix(),
        "title": _title_from_text(text, relpath),
        "content": text,
        "size": target.stat().st_size,
        "mtime": _iso(target.stat().st_mtime),
    }


def _title_from_text(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped
    return fallback


def tokenize(query: str) -> list[str]:
    q = query.strip()
    tokens: list[str] = []
    if q:
        tokens.append(q.lower())
    tokens.extend(w.lower() for w in WORD_RE.findall(q))
    for chunk in CJK_RE.findall(q):
        tokens.append(chunk)
        if len(chunk) >= 3:
            tokens.extend(chunk[i : i + 2] for i in range(len(chunk) - 1))
    # preserve order, drop empties
    seen: set[str] = set()
    out: list[str] = []
    for token in tokens:
        if token and token not in seen:
            seen.add(token)
            out.append(token)
    return out


def _score_text(tokens: list[str], path: str, text: str) -> tuple[float, str, str]:
    lower = text.lower()
    lines = text.splitlines()
    score = 0.0
    best_line = 1
    best_hits = -1

    name = path.lower()
    for token in tokens:
        hits = lower.count(token)
        if hits:
            score += hits
        if token in name:
            score += 4
        if lines and token in lines[0].lower():
            score += 3

    for idx, line in enumerate(lines, start=1):
        hits = sum(line.lower().count(token) for token in tokens)
        if hits > best_hits:
            best_hits = hits
            best_line = idx

    start = max(1, best_line - 2)
    end = min(len(lines), best_line + 3)
    snippet = "\n".join(lines[start - 1 : end]).strip()
    return score, snippet, f"{start}-{end}"


def mock_search(query: str, limit: int = 8, root: Path | None = None) -> list[dict[str, Any]]:
    root = root or workspace_root()
    tokens = tokenize(query)
    if not tokens:
        return []

    ranked: list[dict[str, Any]] = []
    for item in list_docs(root):
        doc = read_doc(item["path"], root)
        score, snippet, lines = _score_text(tokens, doc["path"], doc["content"])
        if score <= 0:
            continue
        ranked.append(
            {
                "path": doc["path"],
                "snippet": snippet,
                "score": round(score, 3),
                "lines": lines,
            }
        )
    ranked.sort(key=lambda row: row["score"], reverse=True)
    top = ranked[: max(1, limit)]
    if not top:
        return []
    peak = top[0]["score"] or 1
    for row in top:
        row["score"] = round(min(1.0, row["score"] / peak), 3)
    return top


def parse_zg_query(stdout: str) -> list[dict[str, Any]]:
    text = stdout.strip()
    if not text:
        return []

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = None

    if isinstance(payload, list):
        return [_normalize_hit(item, idx) for idx, item in enumerate(payload) if isinstance(item, dict)]
    if isinstance(payload, dict):
        items = payload.get("results") or payload.get("hits") or payload.get("items") or []
        if isinstance(items, list):
            return [_normalize_hit(item, idx) for idx, item in enumerate(items) if isinstance(item, dict)]

    results: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    snippet_lines: list[str] = []

    def flush() -> None:
        nonlocal current, snippet_lines
        if current is None:
            return
        snippet = "\n".join(snippet_lines).strip()
        current["snippet"] = snippet or current.get("snippet", "")
        results.append(current)
        current = None
        snippet_lines = []

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        header = LINE_HEADER.match(line.strip())
        if header:
            flush()
            start = header.group("start")
            end = header.group("end") or header.group("end2") or start
            current = {
                "path": header.group("path").lstrip("./"),
                "lines": f"{start}-{end}",
                "score": 0.0,
                "snippet": "",
            }
            continue
        path_only = PATH_ONLY.match(line.strip())
        if path_only and not line.startswith((" ", "\t", "|", "-", "#")):
            flush()
            current = {
                "path": path_only.group("path").lstrip("./"),
                "lines": "",
                "score": 0.0,
                "snippet": "",
            }
            continue
        if current is not None:
            snippet_lines.append(line.strip())

    flush()
    if not results:
        # last-resort: treat the whole blob as one snippet
        return [
            {
                "path": "zg-output",
                "snippet": text[:800],
                "score": 1.0,
                "lines": "",
            }
        ]

    n = len(results)
    for idx, row in enumerate(results):
        row["score"] = round(max(0.15, 1.0 - idx / max(n, 1) * 0.7), 3)
        row.setdefault("snippet", "")
    return results


def _normalize_hit(item: dict[str, Any], idx: int) -> dict[str, Any]:
    path = str(item.get("path") or item.get("file") or item.get("uri") or "")
    snippet = str(item.get("snippet") or item.get("preview") or item.get("text") or "")
    score = item.get("score", item.get("rank"))
    try:
        numeric = float(score)
        if numeric > 1:
            numeric = 1.0 / (1.0 + idx)
    except (TypeError, ValueError):
        numeric = round(max(0.15, 1.0 - idx * 0.12), 3)
    lines = item.get("lines") or item.get("span") or ""
    if not lines:
        start = item.get("startLine") or item.get("start") or item.get("line")
        end = item.get("endLine") or item.get("end") or start
        if start:
            lines = f"{start}-{end}"
    return {
        "path": path.lstrip("./"),
        "snippet": snippet.strip(),
        "score": round(float(numeric), 3),
        "lines": str(lines),
    }


def search(query: str, limit: int = 8, root: Path | None = None) -> dict[str, Any]:
    root = root or workspace_root()
    limit = max(1, min(int(limit), 50))
    if zg_available():
        proc = run_zg(
            ["query", "--human", "--preview", "short", "--limit", str(limit), query],
            cwd=root,
            timeout=90,
        )
        if proc.returncode == 0 and (proc.stdout or "").strip():
            return {
                "query": query,
                "limit": limit,
                "engine": "zg",
                "workspace": str(root),
                "results": parse_zg_query(proc.stdout)[:limit],
            }
        # zg present but failed / empty — still serve mock so the demo never dies
        fallback = mock_search(query, limit, root)
        return {
            "query": query,
            "limit": limit,
            "engine": "mock",
            "workspace": str(root),
            "zgError": (proc.stderr or proc.stdout or "zg query failed").strip()[:400],
            "results": fallback,
        }
    return {
        "query": query,
        "limit": limit,
        "engine": "mock",
        "workspace": str(root),
        "results": mock_search(query, limit, root),
    }


def trigger_index(root: Path | None = None) -> dict[str, Any]:
    root = root or workspace_root()
    if not zg_available():
        return {
            "ok": True,
            "engine": "mock",
            "workspace": str(root),
            "embedding": embedding_model(),
            "message": "zg 未安装，已跳过真实索引。演示搜索走 sample-kb 关键词打分。",
        }

    proc = run_zg(
        ["index", "--embedding", embedding_model()],
        cwd=root,
        timeout=300,
    )
    ok = proc.returncode == 0
    output = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    return {
        "ok": ok,
        "engine": "zg",
        "workspace": str(root),
        "embedding": embedding_model(),
        "message": output[-800:] if output else ("索引完成" if ok else "zg index 失败"),
    }


def _parse_status_text(text: str) -> dict[str, Any]:
    freshness = "unknown"
    lowered = text.lower()
    if "possibly_stale" in lowered or "possibly stale" in lowered:
        freshness = "possibly_stale"
    elif "fresh" in lowered or "ready" in lowered:
        freshness = "fresh"
    elif "missing" in lowered or "no index" in lowered or "not indexed" in lowered:
        freshness = "missing"

    file_count = None
    count_match = re.search(r"(\d+)\s+files?", text, re.I)
    if count_match:
        file_count = int(count_match.group(1))
    return {"freshness": freshness, "fileCount": file_count, "raw": text.strip()[:2000]}


def status(root: Path | None = None) -> dict[str, Any]:
    root = root or workspace_root()
    docs = list_docs(root)
    index_dir = root / ".zvec-grep"
    index_exists = index_dir.exists()
    updated_at = _iso(index_dir.stat().st_mtime) if index_exists else None

    payload: dict[str, Any] = {
        "ok": True,
        "zgAvailable": zg_available(),
        "engine": "zg" if zg_available() else "mock",
        "workspace": str(root),
        "embedding": embedding_model(),
        "docCount": len(docs),
        "index": {
            "exists": index_exists,
            "freshness": "mock" if not zg_available() else ("unknown" if not index_exists else "unknown"),
            "fileCount": len(docs),
            "updatedAt": updated_at,
        },
    }

    if not zg_available():
        payload["index"]["freshness"] = "mock"
        payload["message"] = "未检测到 zg，API 使用 sample-kb 确定性 mock 搜索。"
        return payload

    proc = run_zg(["status"], cwd=root, timeout=30)
    parsed = _parse_status_text((proc.stdout or "") + "\n" + (proc.stderr or ""))
    payload["index"]["freshness"] = parsed["freshness"] if index_exists or parsed["freshness"] != "unknown" else "missing"
    if parsed["fileCount"] is not None:
        payload["index"]["fileCount"] = parsed["fileCount"]
    payload["raw"] = parsed["raw"]
    payload["message"] = "已检测到 zg CLI。"
    return payload
