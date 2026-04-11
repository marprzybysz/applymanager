from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response

from server.modules.common import to_non_empty_string
from server.modules.db import get_connection
from server.modules.offers import export_offers_to_excel_bytes, import_offers_from_excel, insert_offer, list_offers, map_offer_for_insert_from_request
from server.modules.preferences import get_preferences, save_preferences
from server.modules.registry import get_module_usage
from server.modules.scrape import list_sources, normalize_scrape_url, scrape_query_or_link, scrape_single_url

router = APIRouter(prefix="/api")


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


@router.post("/offers")
async def create_offer(request: Request):
    body = await request.json()
    offer_input = map_offer_for_insert_from_request(body or {})

    if not offer_input["company"] or not offer_input["role"]:
        raise HTTPException(status_code=400, detail="company and role are required")

    try:
        offer = insert_offer(offer_input)
        return JSONResponse(status_code=201, content={"ok": True, "offer": offer})
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.post("/offers/import-excel")
async def import_excel(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return import_offers_from_excel(content)
    except Exception as error:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(error)})


@router.get("/offers/export-excel")
def export_excel():
    try:
        content, filename = export_offers_to_excel_bytes()
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
    body = await request.json()
    url = normalize_scrape_url((body or {}).get("url")) or ""

    if not url:
        return JSONResponse(status_code=400, content={"ok": False, "error": "url is required"})

    try:
        return scrape_single_url(url)
    except Exception as error:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(error)})
