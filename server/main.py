from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from server.modules.db import ensure_schema
from server.local.routes import router as local_router
from server.web.routes import router as web_router

PORT = int(os.getenv("PORT", "3000"))
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(web_router)
app.include_router(local_router)


@app.on_event("startup")
def startup_event() -> None:
    ensure_schema()


if os.path.isdir(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


def _serve_index() -> FileResponse:
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, headers=NO_CACHE_HEADERS)
    raise HTTPException(status_code=404, detail="Frontend build not found")


@app.get("/")
def spa_root() -> FileResponse:
    return _serve_index()


@app.get("/{full_path:path}")
def spa_fallback(full_path: str) -> FileResponse:
    _ = full_path
    return _serve_index()
