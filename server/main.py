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
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="dist")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail=f"Not found: {full_path}")
