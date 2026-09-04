"""Flask API for the zg-demo local-first knowledge base."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from zg_service import (
    list_docs,
    read_doc,
    search,
    status,
    trigger_index,
    workspace_root,
)

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
            ]
        }
    },
)


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/status")
def api_status():
    try:
        return jsonify(status())
    except FileNotFoundError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 404


@app.post("/api/index")
def api_index():
    body = request.get_json(silent=True) or {}
    override = body.get("path") or body.get("workspace")
    try:
        root = workspace_root(override) if override else workspace_root()
        return jsonify(trigger_index(root))
    except FileNotFoundError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 404
    except Exception as exc:  # pragma: no cover - CLI / IO edge
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.post("/api/search")
def api_search():
    body = request.get_json(silent=True) or {}
    query = (body.get("query") or "").strip()
    if not query:
        return jsonify({"error": "query is required"}), 400
    limit = body.get("limit", 8)
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be an integer"}), 400
    try:
        return jsonify(search(query, limit=limit))
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404


@app.get("/api/docs")
def api_docs():
    try:
        root = workspace_root()
        return jsonify({"workspace": str(root), "files": list_docs(root)})
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404


@app.get("/api/docs/<path:relpath>")
def api_doc(relpath: str):
    try:
        return jsonify(read_doc(relpath))
    except FileNotFoundError:
        return jsonify({"error": "not found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


def create_app() -> Flask:
    return app


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "1") not in {"0", "false", "False"}
    # Bind loopback; Vite proxies /api here.
    app.run(host="127.0.0.1", port=port, debug=debug)
