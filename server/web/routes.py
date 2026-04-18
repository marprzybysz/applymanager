from __future__ import annotations

import hashlib
import logging

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response

from server.modules.common import to_non_empty_string
from server.modules.db import get_connection
from server.modules.offers import (
    delete_offer,
    export_offers_to_excel_bytes,
    get_offer_stats,
    import_offers_from_excel,
    insert_offer,
    list_offers,
    map_offer_for_insert_from_request,
    preview_offers_from_excel,
    update_offer,
)
from server.modules.preferences import get_preferences, save_preferences
from server.modules.rate_limit import FixedWindowRateLimiter
from server.modules.registry import get_module_usage
from server.modules.scrape import list_sources, normalize_scrape_url, scrape_query_or_link, scrape_single_url

router = APIRouter(prefix="/api")
SCRAPE_RATE_LIMITER = FixedWindowRateLimiter(max_requests=30, window_seconds=60)
LOGGER = logging.getLogger("uvicorn.error")


def is_manual_offer(offer_input: dict) -> bool:
    source = (to_non_empty_string(offer_input.get("source")) or "manual").strip().lower()
    return source == "manual"


def validate_manual_offer_requirements(offer_input: dict) -> None:
    if not is_manual_offer(offer_input):
        return

    if not to_non_empty_string(offer_input.get("company")):
        raise HTTPException(status_code=400, detail="company is required for manual offer")
    if not to_non_empty_string(offer_input.get("location")):
        raise HTTPException(status_code=400, detail="location is required for manual offer")
    if not to_non_empty_string(offer_input.get("status")):
        raise HTTPException(status_code=400, detail="status is required for manual offer")
    if not to_non_empty_string(offer_input.get("appliedAt")):
        raise HTTPException(status_code=400, detail="appliedAt is required for manual offer")


def _enforce_scrape_rate_limit(request: Request) -> JSONResponse | None:
    client_ip = request.client.host if request.client else "unknown"
    decision = SCRAPE_RATE_LIMITER.check(client_ip)
    if decision.allowed:
        return None

    return JSONResponse(
        status_code=429,
        content={
            "ok": False,
            "error": "rate limit exceeded for scrape endpoints",
            "retryAfterSeconds": decision.retry_after_seconds,
        },
    )


@router.get("/greet")
def greet(name: str | None = None):
    username = name.strip() if isinstance(name, str) and name.strip() else "friend"
    return {"message": f"Hello, {username}! Python FastAPI backend is connected."}


@router.get("/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW()")
                now = cur.fetchone()[0]
        return {"ok": True, "db": "connected", "now": now}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "db": "disconnected", "error": str(error)})


@router.get("/modules")
def modules_overview():
    return {"ok": True, **get_module_usage()}


@router.get("/preferences")
def read_preferences():
    try:
        return {"ok": True, "preferences": get_preferences()}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.put("/preferences")
async def update_preferences(request: Request):
    try:
        body = await request.json()
        saved = save_preferences(body or {})
        return {"ok": True, "preferences": saved}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.get("/offers")
def get_offers():
    try:
        return {"ok": True, "offers": list_offers()}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.get("/offers/stats")
def get_stats():
    try:
        return {"ok": True, "stats": get_offer_stats()}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.post("/offers", status_code=201)
async def create_offer(request: Request):
    body = await request.json()
    offer_input = map_offer_for_insert_from_request(body or {})

    if not offer_input["company"]:
        raise HTTPException(status_code=400, detail="company is required")
    if not is_manual_offer(offer_input) and not offer_input["role"]:
        raise HTTPException(status_code=400, detail="role is required for non-manual offer")
    validate_manual_offer_requirements(offer_input)

    try:
        offer = insert_offer(offer_input)
        return {"ok": True, "offer": offer}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.put("/offers/{offer_id}")
async def edit_offer(offer_id: int, request: Request):
    body = await request.json()
    offer_input = map_offer_for_insert_from_request(body or {})

    if not offer_input["company"]:
        raise HTTPException(status_code=400, detail="company is required")
    if not is_manual_offer(offer_input) and not offer_input["role"]:
        raise HTTPException(status_code=400, detail="role is required for non-manual offer")
    validate_manual_offer_requirements(offer_input)

    try:
        offer = update_offer(offer_id, offer_input)
        if not offer:
            return JSONResponse(status_code=404, content={"ok": False, "error": "offer not found"})
        return {"ok": True, "offer": offer}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.delete("/offers/{offer_id}")
def remove_offer(offer_id: int):
    try:
        deleted = delete_offer(offer_id)
        if not deleted:
            return {"ok": True, "deleted": False}
        return {"ok": True, "deleted": True}
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.post("/offers/import-excel")
async def import_excel(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return import_offers_from_excel(content)
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.post("/offers/import-excel/preview")
async def import_excel_preview(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = preview_offers_from_excel(content)
        file_sha256 = hashlib.sha256(content).hexdigest()
        issues = result.get("issues") or []
        issue_rows = [issue.get("rowNumber") for issue in issues[:5]]
        print(
            "excel_preview",
            {
                "filename": file.filename,
                "size": len(content),
                "sha256": file_sha256,
                "imported": result.get("imported"),
                "skipped": result.get("skipped"),
                "ignored": result.get("ignored"),
                "issues": len(issues),
                "issue_rows": issue_rows,
            },
            flush=True,
        )
        result["_meta"] = {
            "filename": file.filename,
            "size": len(content),
            "sha256": file_sha256,
        }
        return result
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.get("/offers/export-excel")
def export_excel(tzOffsetMinutes: int | None = None):
    try:
        content, filename = export_offers_to_excel_bytes(user_utc_offset_minutes=tzOffsetMinutes)
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.get("/scrape/sources")
def scrape_sources():
    return list_sources()


@router.post("/scrape")
async def scrape(request: Request):
    blocked_response = _enforce_scrape_rate_limit(request)
    if blocked_response:
        return blocked_response

    body = await request.json()
    query = to_non_empty_string((body or {}).get("query")) or ""
    sources = (body or {}).get("sources") if isinstance((body or {}).get("sources"), list) else None
    limit_per_source = int((body or {}).get("limitPerSource", 20))

    if not query:
        return JSONResponse(status_code=400, content={"ok": False, "error": "query is required"})

    try:
        return scrape_query_or_link(query=query, sources=sources, limit_per_source=limit_per_source)
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.post("/scrape/link")
async def scrape_link(request: Request):
    blocked_response = _enforce_scrape_rate_limit(request)
    if blocked_response:
        return blocked_response

    body = await request.json()
    url = normalize_scrape_url((body or {}).get("url")) or ""

    if not url:
        return JSONResponse(status_code=400, content={"ok": False, "error": "url is required"})

    try:
        return scrape_single_url(url)
    except Exception as error:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(error)})
