from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from server.modules.db import get_connection


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    for item in value:
        text = str(item).strip()
        if text and text not in normalized:
            normalized.append(text)
    return normalized


def get_preferences() -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                  id,
                  preferred_contract_types AS "preferredContractTypes",
                  preferred_work_times AS "preferredWorkTimes",
                  preferred_work_modes AS "preferredWorkModes",
                  preferred_shift_counts AS "preferredShiftCounts",
                  preferred_working_hours AS "preferredWorkingHours",
                  updated_at AS "updatedAt"
                FROM user_preferences
                WHERE id = 1
                """
            )
            row = cur.fetchone()
            if row:
                return dict(row)

            cur.execute("INSERT INTO user_preferences (id) VALUES (1) RETURNING id")
        conn.commit()

    return {
        "id": 1,
        "preferredContractTypes": [],
        "preferredWorkTimes": [],
        "preferredWorkModes": [],
        "preferredShiftCounts": [],
        "preferredWorkingHours": None,
        "updatedAt": None,
    }


def save_preferences(payload: dict[str, Any]) -> dict[str, Any]:
    contract_types = _as_string_list(payload.get("preferredContractTypes"))
    work_times = _as_string_list(payload.get("preferredWorkTimes"))
    work_modes = _as_string_list(payload.get("preferredWorkModes"))
    shift_counts = _as_string_list(payload.get("preferredShiftCounts"))
    working_hours = str(payload.get("preferredWorkingHours") or "").strip() or None

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO user_preferences (
                  id,
                  preferred_contract_types,
                  preferred_work_times,
                  preferred_work_modes,
                  preferred_shift_counts,
                  preferred_working_hours,
                  updated_at
                )
                VALUES (1, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (id)
                DO UPDATE SET
                  preferred_contract_types = EXCLUDED.preferred_contract_types,
                  preferred_work_times = EXCLUDED.preferred_work_times,
                  preferred_work_modes = EXCLUDED.preferred_work_modes,
                  preferred_shift_counts = EXCLUDED.preferred_shift_counts,
                  preferred_working_hours = EXCLUDED.preferred_working_hours,
                  updated_at = NOW()
                RETURNING
                  id,
                  preferred_contract_types AS "preferredContractTypes",
                  preferred_work_times AS "preferredWorkTimes",
                  preferred_work_modes AS "preferredWorkModes",
                  preferred_shift_counts AS "preferredShiftCounts",
                  preferred_working_hours AS "preferredWorkingHours",
                  updated_at AS "updatedAt"
                """,
                (contract_types, work_times, work_modes, shift_counts, working_hours),
            )
            row = cur.fetchone()
        conn.commit()

    return dict(row) if row else get_preferences()
