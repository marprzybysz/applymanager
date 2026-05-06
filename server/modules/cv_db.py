from __future__ import annotations

import json
from typing import Any

import psycopg2

from server.modules.db import get_connection


def _row_to_dict(row: tuple, cursor_description: Any) -> dict[str, Any]:
    return {desc[0]: val for desc, val in zip(cursor_description, row)}


def list_cvs() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, array_length(skills, 1) AS skill_count,
                       (file_data IS NOT NULL) AS has_file,
                       created_at, updated_at
                FROM cvs
                ORDER BY updated_at DESC
                """
            )
            rows = cur.fetchall()
            desc = cur.description
    return [_row_to_dict(row, desc) for row in rows]


def get_cv(cv_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, content, profile, skills,
                       (file_data IS NOT NULL) AS has_file,
                       created_at, updated_at
                FROM cvs WHERE id = %s
                """,
                (cv_id,),
            )
            row = cur.fetchone()
            desc = cur.description
    if row is None:
        return None
    return _row_to_dict(row, desc)


def get_cv_file(cv_id: int) -> bytes | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT file_data FROM cvs WHERE id = %s", (cv_id,))
            row = cur.fetchone()
    if row is None or row[0] is None:
        return None
    value = row[0]
    return bytes(value) if isinstance(value, memoryview) else value


def create_cv(
    title: str,
    content: str | None,
    profile: dict[str, Any] | None,
    skills: list[str],
    file_data: bytes | None = None,
) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cvs (title, content, profile, skills, file_data)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, title, content, profile, skills,
                          (file_data IS NOT NULL) AS has_file,
                          created_at, updated_at
                """,
                (
                    title,
                    content,
                    json.dumps(profile) if profile else None,
                    skills,
                    psycopg2.Binary(file_data) if file_data else None,
                ),
            )
            row = cur.fetchone()
            desc = cur.description
        conn.commit()
    return _row_to_dict(row, desc)


def update_cv_skills(cv_id: int, skills: list[str]) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE cvs
                SET skills = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, title, skills, updated_at
                """,
                (skills, cv_id),
            )
            row = cur.fetchone()
            desc = cur.description
        conn.commit()
    if row is None:
        return None
    return _row_to_dict(row, desc)


def delete_cv(cv_id: int) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM cvs WHERE id = %s", (cv_id,))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted
