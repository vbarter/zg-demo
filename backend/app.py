"""Flask API for the zg-demo local-first knowledge base."""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from zg_service import (
    list_docs,
    read_doc,
    search,
    status,
    trigger_index,
    workspace_root,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / "frontend" / "dist"
LOCAL_CORS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)


def is_production() -> bool:
    env = (
        os.environ.get("ZG_DEMO_ENV") or os.environ.get("FLASK_ENV") or ""
    ).strip().lower()
    return env == "production"


def bind_host() -> str:
    explicit = os.environ.get("FLASK_HOST")
    if explicit:
        return explicit
    return "0.0.0.0" if is_production() else "127.0.0.1"


def debug_enabled() -> bool:
    default = "0" if is_production() else "1"
    return os.environ.get("FLASK_DEBUG", default) not in {"0", "false", "False"}


def cors_origins() -> str | list[str]:
    raw = os.environ.get("CORS_ORIGINS")
    if raw:
        return [item.strip() for item in raw.split(",") if item.strip()]
    if is_production():
        return "*"
    return list(LOCAL_CORS)


def serving_spa() -> bool:
    return is_production() and DIST_DIR.is_dir()


def create_app() -> Flask:
    application = Flask(__name__)
    CORS(application, resources={r"/api/*": {"origins": cors_origins()}})
    register_api(application)
    register_spa(application)
    return application


def register_api(application: Flask) -> None:
    @application.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @application.get("/api/status")
    def api_status():
        try:
            return jsonify(status())
        except FileNotFoundError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 404

    @application.post("/api/index")
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

    @application.post("/api/search")
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

    @application.get("/api/docs")
    def api_docs():
        try:
            root = workspace_root()
            return jsonify({"workspace": str(root), "files": list_docs(root)})
        except FileNotFoundError as exc:
            return jsonify({"error": str(exc)}), 404

    @application.get("/api/docs/<path:relpath>")
    def api_doc(relpath: str):
        try:
            return jsonify(read_doc(relpath))
        except FileNotFoundError:
            return jsonify({"error": "not found"}), 404
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400


def register_spa(application: Flask) -> None:
    @application.get("/")
    @application.get("/<path:asset>")
    def spa(asset: str = ""):
        if asset == "api" or asset.startswith("api/"):
            return jsonify({"error": "not found"}), 404
        if not serving_spa():
            return jsonify({"error": "not found"}), 404
        if asset:
            candidate = (DIST_DIR / asset).resolve()
            try:
                candidate.relative_to(DIST_DIR.resolve())
            except ValueError:
                return jsonify({"error": "not found"}), 404
            if candidate.is_file():
                return send_from_directory(DIST_DIR, asset)
        index = DIST_DIR / "index.html"
        if not index.is_file():
            return jsonify({"error": "frontend dist missing; run npm run build"}), 503
        return send_from_directory(DIST_DIR, "index.html")


app = create_app()


if __name__ == "__main__":
    default_port = "8080" if is_production() else "5000"
    port = int(os.environ.get("FLASK_PORT") or os.environ.get("PORT") or default_port)
    # Local: 127.0.0.1 so Vite can proxy. Production: 0.0.0.0 unless FLASK_HOST overrides.
    app.run(host=bind_host(), port=port, debug=debug_enabled())
