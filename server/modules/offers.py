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


def _json_safe_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _is_identifier_header(header: str) -> bool:
    normalized = str(header or "").strip().lower()
    return normalized in {"id", "lp", "nr", "no", "index", "row", "__rownumber"}


def _has_meaningful_non_id_data(row: dict[str, Any]) -> bool:
    for key, value in row.items():
        key_text = str(key or "")
        if key_text.startswith("__link__"):
            continue
        if _is_identifier_header(key_text):
            continue
        if to_non_empty_string(value):
            return True
    return False


def _normalize_status_key(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_offer_status(status_value: Any, applied_default: bool = True) -> str:
    normalized = _normalize_status_key(status_value)
    if not normalized:
        return "Wyslano" if applied_default else "Zapisano"

    if normalized in {"applied", "wyslano", "wysłano", "sent", "zaaplikowano"}:
        return "Wyslano"
    if normalized in {"saved", "zapisano", "draft"}:
        return "Zapisano"
    if normalized in {"odczytano", "odczytana", "read"}:
        return "Odczytano"
    if normalized in {"interview", "in progress", "w trakcie", "proces"}:
        return "W trakcie"
    if normalized in {"rozmowa", "rozmowa umowiona", "umowienie na rozmowe", "umówienie na rozmowę"}:
        return "Rozmowa"
    if normalized in {"offer", "oferta"}:
        return "Oferta"
    if "rejected" in normalized or "odrzu" in normalized:
        return "Odrzucono"
    if "odmow" in normalized:
        return "Odmowa"

    return "Wyslano" if applied_default else "Zapisano"


def map_offer_for_insert_from_request(body: dict[str, Any]) -> dict[str, Any]:
    applied = to_boolean_or_null(body.get("applied"))
    applied_value = True if applied is None else applied

    return {
        "company": to_non_empty_string(body.get("company")) or "",
        "role": to_non_empty_string(body.get("role")) or "",
        "applied": applied_value,
        "status": normalize_offer_status(body.get("status"), applied_value),
        "location": to_non_empty_string(body.get("location")),
        "notes": to_non_empty_string(body.get("notes")),
        "appliedAt": body.get("appliedAt"),
        "datePosted": body.get("datePosted"),
        "expiresAt": body.get("expiresAt"),
        "source": to_non_empty_string(body.get("source")),
        "sourceUrl": to_non_empty_string(body.get("sourceUrl")),
        "employmentTypes": [str(v).strip() for v in (body.get("employmentTypes") or []) if str(v).strip()],
        "workTime": to_non_empty_string(body.get("workTime")),
        "workMode": to_non_empty_string(body.get("workMode")),
        "shiftCount": to_non_empty_string(body.get("shiftCount")),
        "workingHours": to_non_empty_string(body.get("workingHours")),
    }


def map_excel_row_to_offer(
    row: dict[str, Any], import_source: str = "import_excel"
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    # Ignore empty rows or rows that only contain an ID-like value.
    if not _has_meaningful_non_id_data(row):
        return None, None

    company = pick_first_value(row, EXCEL_FIELDS["company"])
    role = pick_first_value(row, EXCEL_FIELDS["role"])

    direct_source_url = pick_first_value(row, EXCEL_FIELDS["sourceUrl"])
    linked_source_url = pick_first_value(row, EXCEL_FIELDS["sourceUrlLink"])
    applied = to_boolean_or_null(pick_first_value(row, EXCEL_FIELDS["applied"]))
    applied_value = True if applied is None else applied
    explicit_status = pick_first_value(row, EXCEL_FIELDS["status"])

    mapped_offer = {
        "company": company,
        "role": role,
        "applied": applied_value,
        "status": normalize_offer_status(explicit_status, applied_value),
        "location": pick_first_value(row, EXCEL_FIELDS["location"]),
        "notes": pick_first_value(row, EXCEL_FIELDS["notes"]),
        "appliedAt": safe_date(pick_first_value(row, EXCEL_FIELDS["appliedAt"])),
        "source": pick_first_value(row, EXCEL_FIELDS["source"]) or import_source,
        "sourceUrl": direct_source_url if is_absolute_http_url(direct_source_url) else (linked_source_url or None),
    }

    missing_fields: list[str] = []
    if not company:
        missing_fields.append("company")
    if not role:
        missing_fields.append("role")

    issue = None
    if missing_fields:
        issue = {
            "rowNumber": row.get("__rowNumber"),
            "missingFields": missing_fields,
            "parsed": {
                "company": mapped_offer.get("company"),
                "role": mapped_offer.get("role"),
                "status": mapped_offer.get("status"),
                "location": mapped_offer.get("location"),
                "appliedAt": mapped_offer.get("appliedAt"),
                "source": mapped_offer.get("source"),
                "sourceUrl": mapped_offer.get("sourceUrl"),
                "notes": mapped_offer.get("notes"),
            },
            "raw": {k: _json_safe_value(v) for k, v in row.items() if not str(k).startswith("__link__")},
        }

    if missing_fields:
        return None, issue
    return mapped_offer, issue


def read_excel_rows_with_hyperlinks(content: bytes) -> list[dict[str, Any]]:
    workbook = load_workbook(io.BytesIO(content), data_only=False)
    worksheet = workbook.worksheets[0]

    header_cells = list(next(worksheet.iter_rows(min_row=1, max_row=1), []))
    headers = [to_non_empty_string(cell.value) or "" for cell in header_cells]
    rows: list[dict[str, Any]] = []

    for row_index, row in enumerate(worksheet.iter_rows(min_row=2, max_row=worksheet.max_row), start=2):
        item: dict[str, Any] = {}
        item["__rowNumber"] = row_index
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
                    date_posted AS "datePosted",
                    expires_at AS "expiresAt",
                    CASE
                      WHEN expires_at IS NULL THEN NULL
                      ELSE (expires_at - CURRENT_DATE)
                    END AS "daysToExpire",
                    source,
                    source_url AS "sourceUrl",
                    employment_types AS "employmentTypes",
                    work_time AS "workTime",
                    work_mode AS "workMode",
                    shift_count AS "shiftCount",
                    working_hours AS "workingHours",
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
                INSERT INTO applications (
                    company, role, applied, status, location, notes, applied_at, date_posted, expires_at, source, source_url,
                    employment_types, work_time, work_mode, shift_count, working_hours
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, company, role, applied, status, location, notes,
                          applied_at AS "appliedAt", date_posted AS "datePosted", expires_at AS "expiresAt",
                          CASE
                            WHEN expires_at IS NULL THEN NULL
                            ELSE (expires_at - CURRENT_DATE)
                          END AS "daysToExpire",
                          source, source_url AS "sourceUrl",
                          employment_types AS "employmentTypes", work_time AS "workTime",
                          work_mode AS "workMode", shift_count AS "shiftCount",
                          working_hours AS "workingHours", created_at AS "createdAt"
                """,
                (
                    offer["company"],
                    offer["role"],
                    offer.get("applied", True),
                    normalize_offer_status(offer.get("status"), offer.get("applied") is not False),
                    offer.get("location") or None,
                    offer.get("notes") or None,
                    safe_date(offer.get("appliedAt")),
                    safe_date(offer.get("datePosted")),
                    safe_date(offer.get("expiresAt")),
                    offer.get("source") or None,
                    offer.get("sourceUrl") or None,
                    offer.get("employmentTypes") or None,
                    offer.get("workTime") or None,
                    offer.get("workMode") or None,
                    offer.get("shiftCount") or None,
                    offer.get("workingHours") or None,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def update_offer(offer_id: int, offer: dict[str, Any]) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE applications
                SET
                    company = %s,
                    role = %s,
                    applied = %s,
                    status = %s,
                    location = %s,
                    notes = %s,
                    applied_at = %s,
                    date_posted = %s,
                    expires_at = %s,
                    source = %s,
                    source_url = %s,
                    employment_types = %s,
                    work_time = %s,
                    work_mode = %s,
                    shift_count = %s,
                    working_hours = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, company, role, applied, status, location, notes,
                          applied_at AS "appliedAt", date_posted AS "datePosted", expires_at AS "expiresAt",
                          CASE
                            WHEN expires_at IS NULL THEN NULL
                            ELSE (expires_at - CURRENT_DATE)
                          END AS "daysToExpire",
                          source, source_url AS "sourceUrl",
                          employment_types AS "employmentTypes", work_time AS "workTime",
                          work_mode AS "workMode", shift_count AS "shiftCount",
                          working_hours AS "workingHours", created_at AS "createdAt"
                """,
                (
                    offer["company"],
                    offer["role"],
                    offer.get("applied", True),
                    normalize_offer_status(offer.get("status"), offer.get("applied") is not False),
                    offer.get("location") or None,
                    offer.get("notes") or None,
                    safe_date(offer.get("appliedAt")),
                    safe_date(offer.get("datePosted")),
                    safe_date(offer.get("expiresAt")),
                    offer.get("source") or None,
                    offer.get("sourceUrl") or None,
                    offer.get("employmentTypes") or None,
                    offer.get("workTime") or None,
                    offer.get("workMode") or None,
                    offer.get("shiftCount") or None,
                    offer.get("workingHours") or None,
                    offer_id,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def delete_offer(offer_id: int) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM applications WHERE id = %s", (offer_id,))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


def import_offers_from_excel(content: bytes) -> dict[str, Any]:
    rows = read_excel_rows_with_hyperlinks(content)

    saved: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    skipped = 0
    ignored = 0
    for row in rows:
        mapped_offer, issue = map_excel_row_to_offer(row, import_source="import_excel")
        if mapped_offer:
            saved.append(insert_offer(mapped_offer))
        else:
            if issue:
                skipped += 1
                issues.append(issue)
            else:
                ignored += 1

    return {
        "ok": True,
        "imported": len(saved),
        "skipped": skipped,
        "ignored": ignored,
        "offers": saved,
        "issues": issues,
    }


def export_offers_to_excel_bytes() -> tuple[bytes, str]:
    offers = list_offers()
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "applications"

    headers = [
        "company",
        "role",
        "applied",
        "status",
        "location",
        "notes",
        "appliedAt",
        "datePosted",
        "expiresAt",
        "daysToExpire",
        "source",
        "sourceUrl",
        "employmentTypes",
        "workTime",
        "workMode",
        "shiftCount",
        "workingHours",
        "createdAt",
    ]
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
                safe_date(offer.get("datePosted")) or "",
                safe_date(offer.get("expiresAt")) or "",
                offer.get("daysToExpire") if offer.get("daysToExpire") is not None else "",
                offer.get("source") or "",
                offer.get("sourceUrl") or "",
                ", ".join(offer.get("employmentTypes") or []),
                offer.get("workTime") or "",
                offer.get("workMode") or "",
                offer.get("shiftCount") or "",
                offer.get("workingHours") or "",
                str(offer.get("createdAt") or ""),
            ]
        )

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    filename = f"applymanager-offers-{datetime.now(timezone.utc).date().isoformat()}.xlsx"
    return buffer.read(), filename


def get_offer_stats() -> dict[str, Any]:
    offers = list_offers()
    total = len(offers)
    applied = sum(1 for offer in offers if offer.get("applied") is True)
    active = sum(1 for offer in offers if isinstance(offer.get("daysToExpire"), int) and offer.get("daysToExpire") >= 0)
    expired = sum(1 for offer in offers if isinstance(offer.get("daysToExpire"), int) and offer.get("daysToExpire") < 0)

    status_counts: dict[str, int] = {}
    source_counts: dict[str, int] = {}
    days_values: list[int] = []
    recent_applications = 0
    today = datetime.now(timezone.utc).date()

    for offer in offers:
        status = str(offer.get("status") or "unknown").strip() or "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

        source = str(offer.get("source") or "manual").strip() or "manual"
        source_counts[source] = source_counts.get(source, 0) + 1

        days = offer.get("daysToExpire")
        if isinstance(days, int):
            days_values.append(days)

        applied_at = offer.get("appliedAt")
        if isinstance(applied_at, str) and applied_at:
            try:
                delta = (today - datetime.fromisoformat(applied_at).date()).days
                if 0 <= delta <= 7:
                    recent_applications += 1
            except Exception:
                pass

    avg_days_left = round(sum(days_values) / len(days_values), 1) if days_values else None

    return {
        "totalOffers": total,
        "appliedOffers": applied,
        "activeOffers": active,
        "expiredOffers": expired,
        "averageDaysLeft": avg_days_left,
        "recentApplications7d": recent_applications,
        "statusCounts": status_counts,
        "sourceCounts": source_counts,
    }
