"""Tests for feature computation."""

import json
import sys
from pathlib import Path
import pytest
from datetime import datetime, timedelta, timezone

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db, init_db
from engine.features import compute_features, haversine_distance


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database is initialized before each test."""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield


def test_normal_user_profile_match():
    """Test 1: Normal transaction matching user profile -> all False, ratio ~1.0."""
    conn = get_db()
    cursor = conn.cursor()

    user_id = "test_user_1"
    cursor.execute(
        """
        INSERT INTO users (id, name, home_city, avg_amount, account_age_days, known_devices, known_locations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            "Alice Test",
            "New York",
            50.0,
            365,
            json.dumps(["device_1", "device_2"]),
            json.dumps(["New York", "Chicago"]),
        ),
    )
    conn.commit()
    conn.close()

    now = datetime.now(timezone.utc).isoformat()
    features = compute_features(
        user_id=user_id,
        amount=50.0,
        city="New York",
        device_id="device_1",
        timestamp=now,
    )

    assert features["amount_ratio"] == 1.0
    assert features["is_new_device"] is False
    assert features["is_new_location"] is False
    assert features["velocity_10min"] == 0
    assert features["impossible_travel"] is False


def test_new_device_and_location():
    """Test 2: Transaction from unknown device and location -> flags set."""
    conn = get_db()
    cursor = conn.cursor()

    user_id = "test_user_2"
    cursor.execute(
        """
        INSERT INTO users (id, name, home_city, avg_amount, account_age_days, known_devices, known_locations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            "Bob Test",
            "Seattle",
            100.0,
            180,
            json.dumps(["device_known"]),
            json.dumps(["Seattle"]),
        ),
    )
    conn.commit()
    conn.close()

    now = datetime.now(timezone.utc).isoformat()
    features = compute_features(
        user_id=user_id,
        amount=500.0,
        city="Miami",
        device_id="device_unknown",
        timestamp=now,
    )

    assert features["amount_ratio"] == 5.0
    assert features["is_new_device"] is True
    assert features["is_new_location"] is True
    assert features["velocity_10min"] == 0
    assert features["impossible_travel"] is False


def test_high_velocity():
    """Test 3: Multiple transactions within 10 minutes -> velocity count reflects them."""
    conn = get_db()
    cursor = conn.cursor()

    user_id = "test_user_3"
    cursor.execute(
        """
        INSERT INTO users (id, name, home_city, avg_amount, account_age_days, known_devices, known_locations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            "Charlie Test",
            "Chicago",
            75.0,
            500,
            json.dumps(["device_charlie"]),
            json.dumps(["Chicago"]),
        ),
    )

    now = datetime.now(timezone.utc)

    # Insert 3 transactions within the last 5 minutes
    for i in range(1, 4):
        tx_time = (now - timedelta(minutes=i)).isoformat()
        cursor.execute(
            """
            INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"tx_vel_{i}",
                user_id,
                75.0,
                "Chicago",
                "device_charlie",
                tx_time,
                "NORMAL",
                10,
                "LOW",
                "completed",
            ),
        )

    # Insert 1 older transaction (25 minutes ago — should not count)
    old_time = (now - timedelta(minutes=25)).isoformat()
    cursor.execute(
        """
        INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "tx_vel_old",
            user_id,
            75.0,
            "Chicago",
            "device_charlie",
            old_time,
            "NORMAL",
            10,
            "LOW",
            "completed",
        ),
    )

    conn.commit()
    conn.close()

    features = compute_features(
        user_id=user_id,
        amount=75.0,
        city="Chicago",
        device_id="device_charlie",
        timestamp=now.isoformat(),
    )

    assert features["velocity_10min"] == 3


def test_impossible_travel():
    """Test 4: Two transactions in different distant cities within 15 minutes -> impossible travel detected."""
    conn = get_db()
    cursor = conn.cursor()

    user_id = "test_user_4"
    cursor.execute(
        """
        INSERT INTO users (id, name, home_city, avg_amount, account_age_days, known_devices, known_locations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            "Diana Test",
            "New York",
            60.0,
            300,
            json.dumps(["device_diana"]),
            json.dumps(["New York", "Los Angeles"]),
        ),
    )

    now = datetime.now(timezone.utc)
    # Prior transaction in New York 15 minutes ago
    prior_time = (now - timedelta(minutes=15)).isoformat()
    cursor.execute(
        """
        INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "tx_diana_ny",
            user_id,
            60.0,
            "New York",
            "device_diana",
            prior_time,
            "NORMAL",
            10,
            "LOW",
            "completed",
        ),
    )

    conn.commit()
    conn.close()

    # Current transaction in Los Angeles (~3900 km away in 15 minutes = ~15,600 km/h > 800 km/h)
    features = compute_features(
        user_id=user_id,
        amount=60.0,
        city="Los Angeles",
        device_id="device_diana",
        timestamp=now.isoformat(),
    )

    assert features["impossible_travel"] is True


def test_haversine_distance():
    """Test Haversine distance accuracy between known coordinates."""
    # NYC to LA is approx 3935 km
    nyc_la = haversine_distance(40.7128, -74.0060, 34.0522, -118.2437)
    assert 3900 < nyc_la < 4000
