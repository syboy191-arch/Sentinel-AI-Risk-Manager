"""Feature computation for transaction risk analysis."""

import json
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from database import get_db
from engine.geo import CITY_COORDS


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points in kilometers.
    Uses the Haversine formula.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


def compute_features(
    user_id: str,
    amount: float,
    city: str,
    device_id: str,
    timestamp: str,
) -> Dict[str, Any]:
    """
    Compute transaction features for risk scoring.

    Args:
        user_id: User identifier
        amount: Transaction amount
        city: Transaction city
        device_id: Device identifier
        timestamp: ISO format timestamp string

    Returns:
        Dictionary with keys:
        - amount_ratio: float (amount / user's avg_amount)
        - is_new_device: bool (device not in known_devices)
        - is_new_location: bool (city not in known_locations)
        - velocity_10min: int (transaction count in last 10 minutes)
        - impossible_travel: bool (travel speed >800km/h from most recent prior tx)
    """
    conn = get_db()
    cursor = conn.cursor()

    # Parse timestamp
    tx_time = datetime.fromisoformat(timestamp)

    # Fetch user profile
    user_row = cursor.execute(
        "SELECT avg_amount, known_devices, known_locations FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()

    if not user_row:
        # User doesn't exist — return neutral features
        return {
            "amount_ratio": 1.0,
            "is_new_device": True,
            "is_new_location": True,
            "velocity_10min": 0,
            "impossible_travel": False,
        }

    avg_amount = user_row["avg_amount"]
    known_devices = json.loads(user_row["known_devices"])
    known_locations = json.loads(user_row["known_locations"])

    # 1. Amount ratio
    amount_ratio = amount / avg_amount if avg_amount > 0 else 1.0

    # 2. New device
    is_new_device = device_id not in known_devices

    # 3. New location
    is_new_location = city not in known_locations

    # 4. Velocity in last 10 minutes
    ten_min_ago = tx_time - timedelta(minutes=10)
    velocity_10min = cursor.execute(
        "SELECT COUNT(*) FROM transactions WHERE user_id = ? AND timestamp > ? AND timestamp < ?",
        (user_id, ten_min_ago.isoformat(), timestamp)
    ).fetchone()[0]

    # 5. Impossible travel
    impossible_travel = False

    # Get most recent prior transaction
    prior_tx = cursor.execute(
        "SELECT city, timestamp FROM transactions WHERE user_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1",
        (user_id, timestamp)
    ).fetchone()

    if prior_tx:
        prior_city = prior_tx["city"]
        prior_time = datetime.fromisoformat(prior_tx["timestamp"])

        # Check if different city and within 60 minutes
        if prior_city != city:
            time_delta_minutes = (tx_time - prior_time).total_seconds() / 60

            if 0 < time_delta_minutes < 60:
                # Both cities must be in our geo database
                if prior_city in CITY_COORDS and city in CITY_COORDS:
                    lat1, lon1 = CITY_COORDS[prior_city]
                    lat2, lon2 = CITY_COORDS[city]
                    distance_km = haversine_distance(lat1, lon1, lat2, lon2)

                    # Speed in km/h
                    time_delta_hours = time_delta_minutes / 60
                    speed_kmh = distance_km / time_delta_hours if time_delta_hours > 0 else 0

                    if speed_kmh > 800:
                        impossible_travel = True

    conn.close()

    return {
        "amount_ratio": round(amount_ratio, 2),
        "is_new_device": is_new_device,
        "is_new_location": is_new_location,
        "velocity_10min": velocity_10min,
        "impossible_travel": impossible_travel,
    }
