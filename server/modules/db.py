from __future__ import annotations

import os

import psycopg2

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "user": os.getenv("DB_USER", "applymanager"),
    "password": os.getenv("DB_PASSWORD"),
    "dbname": os.getenv("DB_NAME", "applymanager"),
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def ensure_schema() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS applications (
                  id SERIAL PRIMARY KEY,
                  company TEXT NOT NULL,
                  role TEXT NOT NULL,
                  applied BOOLEAN NOT NULL DEFAULT TRUE,
                  status TEXT NOT NULL DEFAULT 'applied',
                  location TEXT,
                  notes TEXT,
                  applied_at DATE,
                  date_posted DATE,
                  expires_at DATE,
                  source TEXT,
                  source_url TEXT,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied BOOLEAN")
            cur.execute("UPDATE applications SET applied = TRUE WHERE applied IS NULL")
            cur.execute("ALTER TABLE applications ALTER COLUMN applied SET DEFAULT TRUE")
            cur.execute("ALTER TABLE applications ALTER COLUMN applied SET NOT NULL")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source TEXT")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_url TEXT")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS date_posted DATE")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS expires_at DATE")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS employment_types TEXT[]")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS work_time TEXT")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS work_mode TEXT")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS shift_count TEXT")
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS working_hours TEXT")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_preferences (
                  id SMALLINT PRIMARY KEY DEFAULT 1,
                  preferred_contract_types TEXT[] NOT NULL DEFAULT '{}',
                  preferred_work_times TEXT[] NOT NULL DEFAULT '{}',
                  preferred_work_modes TEXT[] NOT NULL DEFAULT '{}',
                  preferred_shift_counts TEXT[] NOT NULL DEFAULT '{}',
                  preferred_working_hours TEXT,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                INSERT INTO user_preferences (id)
                VALUES (1)
                ON CONFLICT (id) DO NOTHING
                """
            )
        conn.commit()
