"""Seed database with realistic initial users and normal historical transactions."""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone

from database import get_db, init_db
from engine.geo import CITY_COORDS

# Deterministic random seed for reproducibility
random.seed(42)

CITIES = list(CITY_COORDS.keys())

USERS_DATA = [
    {"name": "Sarah Chen", "home_city": "New York", "avg_amount": 45.0, "account_age_days": 420},
    {"name": "Marcus Vance", "home_city": "Los Angeles", "avg_amount": 120.0, "account_age_days": 850},
    {"name": "Elena Rostova", "home_city": "Chicago", "avg_amount": 65.0, "account_age_days": 310},
    {"name": "David Kim", "home_city": "Seattle", "avg_amount": 85.0, "account_age_days": 600},
    {"name": "Amira Patel", "home_city": "Austin", "avg_amount": 55.0, "account_age_days": 180},
    {"name": "Carlos Gomez", "home_city": "Miami", "avg_amount": 95.0, "account_age_days": 730},
    {"name": "Emily Watson", "home_city": "New York", "avg_amount": 35.0, "account_age_days": 90},
    {"name": "James O'Connor", "home_city": "Chicago", "avg_amount": 150.0, "account_age_days": 1200},
    {"name": "Priya Sharma", "home_city": "Seattle", "avg_amount": 70.0, "account_age_days": 540},
    {"name": "Lucas Silva", "home_city": "Miami", "avg_amount": 110.0, "account_age_days": 365},
    {"name": "Rachel Green", "home_city": "New York", "avg_amount": 80.0, "account_age_days": 490},
    {"name": "Thomas Mueller", "home_city": "Los Angeles", "avg_amount": 200.0, "account_age_days": 920},
    {"name": "Aaliyah Jackson", "home_city": "Austin", "avg_amount": 40.0, "account_age_days": 210},
    {"name": "Vikram Malhotra", "home_city": "Seattle", "avg_amount": 130.0, "account_age_days": 670},
    {"name": "Chloe Dupont", "home_city": "Chicago", "avg_amount": 90.0, "account_age_days": 450},
]


def seed():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    print("Clearing existing data...")
    cursor.execute("DELETE FROM audit_events")
    cursor.execute("DELETE FROM decisions")
    cursor.execute("DELETE FROM investigations")
    cursor.execute("DELETE FROM features")
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM users")
    conn.commit()

    now = datetime.now(timezone.utc)
    total_transactions = 0

    print("Seeding 15 users and historical transactions...")
    for user_idx, u in enumerate(USERS_DATA, start=1):
        user_id = f"usr_{uuid.uuid4().hex[:12]}"

        # 1-2 known devices
        device_count = random.choice([1, 2])
        devices = [f"dev_{uuid.uuid4().hex[:8]}" for _ in range(device_count)]

        # Known locations always include home city, sometimes 1 nearby/occasional city
        locations = [u["home_city"]]
        if random.random() < 0.35:
            other_city = random.choice([c for c in CITIES if c != u["home_city"]])
            locations.append(other_city)

        cursor.execute(
            """
            INSERT INTO users (id, name, home_city, avg_amount, account_age_days, known_devices, known_locations)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                u["name"],
                u["home_city"],
                u["avg_amount"],
                u["account_age_days"],
                json.dumps(devices),
                json.dumps(locations),
            ),
        )

        # 20 to 40 historical normal transactions over the past 30 days
        tx_count = random.randint(20, 40)
        total_transactions += tx_count

        for _ in range(tx_count):
            tx_id = f"tx_{uuid.uuid4().hex[:12]}"

            # Amount normally distributed around avg_amount (+/- 25%)
            variation = random.uniform(0.75, 1.35)
            amount = round(u["avg_amount"] * variation, 2)

            # Known device & home city
            device_id = random.choice(devices)
            city = u["home_city"]

            # Spread randomly over past 30 days
            days_ago = random.uniform(0.1, 30.0)
            tx_time = now - timedelta(days=days_ago)
            timestamp_str = tx_time.isoformat()

            cursor.execute(
                """
                INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tx_id,
                    user_id,
                    amount,
                    city,
                    device_id,
                    timestamp_str,
                    "NORMAL",
                    random.randint(5, 20),
                    "LOW",
                    "completed",
                ),
            )

    conn.commit()
    conn.close()
    print(f"Done! Seeded 15 users and {total_transactions} historical transactions.")


if __name__ == "__main__":
    seed()
