from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from openpyxl import Workbook, load_workbook
from psycopg2.extras import RealDictCursor

from server.modules.common import is_absolute_http_url, safe_date, to_boolean_or_null, to_non_empty_string
from server.modules.db import get_connection

EXCEL_FIELDS = {
    "company": ["company", "Company", "firma", "Firma"],
    "role": ["role", "Role", "position", "Position", "stanowisko", "Stanowisko"],
    "applied": ["applied", "Applied", "aplikowano", "Aplikowano"],
    "status": ["status", "Status"],
    "location": ["location", "Location", "lokalizacja", "Lokalizacja"],
    "notes": ["notes", "Notes", "notatki", "Notatki"],
    "appliedAt": ["applied_at", "appliedAt", "date", "Date", "data", "Data", "data aplikacji", "Data aplikacji"],
    "source": ["source", "Source", "portal", "Portal"],
    "sourceUrl": ["url", "URL", "link", "Link", "hyperlink", "Hyperlink"],
    "sourceUrlLink": ["__link__url", "__link__URL", "__link__link", "__link__Link", "__link__hyperlink", "__link__Hyperlink"],
}


def pick_first_value(row: dict[str, Any], candidates: list[str]) -> str | None:
    for key in candidates:
        value = to_non_empty_string(row.get(key))
        if value:
            return value
    return None


def map_offer_for_insert_from_request(body: dict[str, Any]) -> dict[str, Any]:
    applied = to_boolean_or_null(body.get("applied"))
    applied_value = True if applied is None else applied

    return {
        "company": to_non_empty_string(body.get("company")) or "",
        "role": to_non_empty_string(body.get("role")) or "",
        "applied": applied_value,
        "status": to_non_empty_string(body.get("status")) or ("applied" if applied_value else "saved"),
        "location": to_non_empty_string(body.get("location")),
        "notes": to_non_empty_string(body.get("notes")),
        "appliedAt": body.get("appliedAt"),
        "source": to_non_empty_string(body.get("source")),
        "sourceUrl": to_non_empty_string(body.get("sourceUrl")),
    }


def map_excel_row_to_offer(row: dict[str, Any]) -> dict[str, Any] | None:
    company = pick_first_value(row, EXCEL_FIELDS["company"])
    role = pick_first_value(row, EXCEL_FIELDS["role"])
    if not company or not role:
        return None

    direct_source_url = pick_first_value(row, EXCEL_FIELDS["sourceUrl"])
    linked_source_url = pick_first_value(row, EXCEL_FIELDS["sourceUrlLink"])
    applied = to_boolean_or_null(pick_first_value(row, EXCEL_FIELDS["applied"]))
    applied_value = True if applied is None else applied
    explicit_status = pick_first_value(row, EXCEL_FIELDS["status"])

    return {
        "company": company,
        "role": role,
        "applied": applied_value,
        "status": explicit_status or ("applied" if applied_value else "saved"),
        "location": pick_first_value(row, EXCEL_FIELDS["location"]),
        "notes": pick_first_value(row, EXCEL_FIELDS["notes"]),
        "appliedAt": safe_date(pick_first_value(row, EXCEL_FIELDS["appliedAt"])),
        "source": pick_first_value(row, EXCEL_FIELDS["source"]),
        "sourceUrl": direct_source_url if is_absolute_http_url(direct_source_url) else (linked_source_url or None),
    }


def read_excel_rows_with_hyperlinks(content: bytes) -> list[dict[str, Any]]:
    workbook = load_workbook(io.BytesIO(content), data_only=False)
    worksheet = workbook.worksheets[0]

    header_cells = list(next(worksheet.iter_rows(min_row=1, max_row=1), []))
    headers = [to_non_empty_string(cell.value) or "" for cell in header_cells]
    rows: list[dict[str, Any]] = []

    for row in worksheet.iter_rows(min_row=2, max_row=worksheet.max_row):
        item: dict[str, Any] = {}
        for idx, cell in enumerate(row):
            if idx >= len(headers):
                continue
            header = headers[idx]
            if not header:
                continue
            item[header] = cell.value
            if cell.hyperlink and cell.hyperlink.target:
                item[f"__link__{header}"] = str(cell.hyperlink.target).strip()
        rows.append(item)

    return rows


def list_offers() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    company,
                    role,
                    applied,
                    status,
                    location,
                    notes,
                    applied_at AS "appliedAt",
                    source,
                    source_url AS "sourceUrl",
                    created_at AS "createdAt"
                FROM applications
                ORDER BY created_at DESC
                LIMIT 500
                """
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def insert_offer(offer: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO applications (company, role, applied, status, location, notes, applied_at, source, source_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, company, role, applied, status, location, notes,
                          applied_at AS "appliedAt", source, source_url AS "sourceUrl", created_at AS "createdAt"
                """,
                (
                    offer["company"],
                    offer["role"],
                    offer.get("applied", True),
                    offer.get("status") or ("saved" if offer.get("applied") is False else "applied"),
                    offer.get("location") or None,
                    offer.get("notes") or None,
                    safe_date(offer.get("appliedAt")),
                    offer.get("source") or None,
                    offer.get("sourceUrl") or None,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def import_offers_from_excel(content: bytes) -> dict[str, Any]:
    rows = read_excel_rows_with_hyperlinks(content)
    mapped_offers = [offer for offer in (map_excel_row_to_offer(row) for row in rows) if offer]

    saved: list[dict[str, Any]] = []
    for offer in mapped_offers:
        saved.append(insert_offer(offer))

    return {
        "ok": True,
        "imported": len(saved),
        "skipped": len(rows) - len(saved),
        "offers": saved,
    }


def export_offers_to_excel_bytes() -> tuple[bytes, str]:
    offers = list_offers()
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"

    headers = ["company", "role", "applied", "status", "location", "notes", "appliedAt", "source", "sourceUrl", "createdAt"]
    worksheet.append(headers)

    for offer in offers:
        worksheet.append(
            [
                offer.get("company") or "",
                offer.get("role") or "",
                offer.get("applied") if offer.get("applied") is not None else True,
                offer.get("status") or "",
                offer.get("location") or "",
                offer.get("notes") or "",
                safe_date(offer.get("appliedAt")) or "",
                offer.get("source") or "",
                offer.get("sourceUrl") or "",
                str(offer.get("createdAt") or ""),
            ]
        )

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    filename = f"applymanager-offers-{datetime.now(timezone.utc).date().isoformat()}.xlsx"
    return buffer.read(), filename
