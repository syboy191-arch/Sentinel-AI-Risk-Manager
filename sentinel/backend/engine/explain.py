"""Human-readable explanations for risk features."""

from typing import Dict, Any, List


def explain(features: Dict[str, Any]) -> List[str]:
    """
    Generate plain-English explanations for triggered risk features.

    Only includes explanations for features that are actually present/triggered.
    Never invents reasons not backed by the feature data.

    Args:
        features: Dictionary with amount_ratio, is_new_device, is_new_location,
                  velocity_10min, impossible_travel

    Returns:
        List of explanation strings, one per triggered feature
    """
    reasons = []

    amount_ratio = features.get("amount_ratio", 1.0)
    is_new_device = features.get("is_new_device", False)
    is_new_location = features.get("is_new_location", False)
    velocity_10min = features.get("velocity_10min", 0)
    impossible_travel = features.get("impossible_travel", False)

    # Amount ratio (only mention if significantly different from 1.0)
    if amount_ratio > 1.5:
        reasons.append(f"Transaction amount is {amount_ratio}x higher than the user's normal amount.")
    elif amount_ratio < 0.5:
        reasons.append(f"Transaction amount is {amount_ratio}x lower than the user's normal amount.")

    # New device
    if is_new_device:
        reasons.append("New device detected on this account.")

    # New location
    if is_new_location:
        reasons.append("Unusual location detected.")

    # Velocity (only mention if > 0)
    if velocity_10min > 0:
        reasons.append(f"{velocity_10min} transactions attempted in the last 10 minutes.")

    # Impossible travel
    if impossible_travel:
        reasons.append("Impossible travel detected between recent transaction locations.")

    return reasons
