"""Attack and fraud pattern detection based on transaction features and history."""

from typing import Dict, Any, List, Optional


def _is_card_testing(recent_amounts: List[float]) -> bool:
    """
    Detect card testing pattern:
    - Multiple small probing amounts (e.g. <= $15) followed by a significantly larger transaction
    - OR at least 3 consecutive micro-transactions (<= $5.00)
    """
    if not recent_amounts or len(recent_amounts) < 3:
        return False

    prior = recent_amounts[:-1]
    current = recent_amounts[-1]

    # Pattern A: 2+ small probing amounts followed by a larger transaction (> $50 and >= 3x prior max)
    if len(prior) >= 2 and all(a <= 15.0 for a in prior) and current >= 50.0 and current >= 3 * max(prior):
        return True

    # Pattern B: 3+ consecutive micro-transactions (e.g. testing active card status)
    if len(recent_amounts) >= 3 and all(a <= 5.0 for a in recent_amounts):
        return True

    return False


def detect_pattern(features: Dict[str, Any], recent_amounts: Optional[List[float]] = None) -> Optional[str]:
    """
    Identify known fraud or attack patterns from features and recent transaction amounts.

    Returns one of:
    - "IMPOSSIBLE_TRAVEL"
    - "ACCOUNT_TAKEOVER"
    - "VELOCITY_ATTACK"
    - "CARD_TESTING"
    - None (if no specific pattern matches)
    """
    if recent_amounts is None:
        recent_amounts = []

    # 1. Impossible Travel
    if features.get("impossible_travel", False):
        return "IMPOSSIBLE_TRAVEL"

    # 2. Account Takeover: New device + new location + high amount ratio (> 5x avg)
    if (
        features.get("is_new_device", False)
        and features.get("is_new_location", False)
        and features.get("amount_ratio", 1.0) > 5.0
    ):
        return "ACCOUNT_TAKEOVER"

    # 3. Velocity Attack: High burst of transactions (> 6 in 10 minutes)
    if features.get("velocity_10min", 0) > 6:
        return "VELOCITY_ATTACK"

    # 4. Card Testing: Small probing amounts followed by large amount or micro-bursts
    if _is_card_testing(recent_amounts):
        return "CARD_TESTING"

    return None
