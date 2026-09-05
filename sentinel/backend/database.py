import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "sentinel.db"


def get_db() -> sqlite3.Connection:
    """Return a connection to the sentinel SQLite database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't already exist."""
    conn = get_db()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id                TEXT PRIMARY KEY,
                name              TEXT,
                home_city         TEXT,
                avg_amount        REAL,
                account_age_days  INTEGER,
                known_devices     TEXT,
                known_locations   TEXT
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id             TEXT PRIMARY KEY,
                user_id        TEXT,
                amount         REAL,
                city           TEXT,
                device_id      TEXT,
                timestamp      TEXT,
                scenario_type  TEXT,
                risk_score     INTEGER,
                risk_level     TEXT,
                status         TEXT
            );

            CREATE TABLE IF NOT EXISTS features (
                transaction_id    TEXT PRIMARY KEY,
                amount_ratio      REAL,
                is_new_device     INTEGER,
                is_new_location   INTEGER,
                velocity_10min    INTEGER,
                impossible_travel INTEGER
            );

            CREATE TABLE IF NOT EXISTS investigations (
                id              TEXT PRIMARY KEY,
                transaction_id  TEXT,
                summary         TEXT,
                key_findings    TEXT,
                recommendation  TEXT,
                confidence      INTEGER,
                created_at      TEXT
            );

            CREATE TABLE IF NOT EXISTS decisions (
                id               TEXT PRIMARY KEY,
                transaction_id   TEXT,
                analyst_action   TEXT,
                override_reason  TEXT,
                created_at       TEXT
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id              TEXT PRIMARY KEY,
                transaction_id  TEXT,
                event_type      TEXT,
                detail          TEXT,
                created_at      TEXT
            );
        """)
        conn.commit()
    finally:
        conn.close()
