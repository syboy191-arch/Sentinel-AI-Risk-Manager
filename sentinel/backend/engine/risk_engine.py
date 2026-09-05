"""Risk scoring engine for transactions."""

from typing import Dict, Any


def score_transaction(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate risk score and level from computed features.

    Scoring formula:
    - Amount ratio: min(amount_ratio * 4, 35) points (max 35)
    - New device: +25 points if True
    - New location: +20 points if True
    - Velocity: min(velocity_10min * 5, 25) points (max 25)
    - Impossible travel: +30 points if True
    - Total capped at 100

    Risk levels:
    - LOW: score < 40
    - MEDIUM: 40 <= score < 70
    - HIGH: score >= 70

    Args:
        features: Dictionary with amount_ratio, is_new_device, is_new_location,
                  velocity_10min, impossible_travel

    Returns:
        Dictionary with "score" (int 0-100) and "level" (LOW/MEDIUM/HIGH)
    """
    amount_ratio = features.get("amount_ratio", 1.0)
    is_new_device = features.get("is_new_device", False)
    is_new_location = features.get("is_new_location", False)
    velocity_10min = features.get("velocity_10min", 0)
    impossible_travel = features.get("impossible_travel", False)

    # Calculate score components
    amount_score = min(amount_ratio * 4, 35)
    device_score = 25 if is_new_device else 0
    location_score = 20 if is_new_location else 0
    velocity_score = min(velocity_10min * 5, 25)
    travel_score = 30 if impossible_travel else 0

    # Total score capped at 100
    score = int(min(amount_score + device_score + location_score + velocity_score + travel_score, 100))

    # Determine level
    if score < 40:
        level = "LOW"
    elif score < 70:
        level = "MEDIUM"
    else:
        level = "HIGH"

    return {
        "score": score,
        "level": level,
    }
