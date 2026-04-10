from __future__ import annotations

from fastapi import APIRouter

from server.modules.registry import get_module_usage

router = APIRouter(prefix="/api/local")


@router.get("/health")
def local_health():
    return {
        "ok": True,
        "runtime": "local",
        "message": "Local mode endpoints are available.",
    }


@router.get("/modules")
def local_modules():
    usage = get_module_usage()
    return {
        "ok": True,
        "usedInLocal": usage["local"],
        "notUsedInLocal": usage["notUsedInLocal"],
    }
