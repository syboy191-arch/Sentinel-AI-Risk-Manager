"""Tests for risk scoring and explanations across demo scenarios."""

import sys
from pathlib import Path
import pytest

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.risk_engine import score_transaction
from engine.explain import explain


def test_scenario_normal():
    """Scenario 1: Normal transaction -> LOW risk (<40), no explanations."""
    features = {
        "amount_ratio": 1.0,
        "is_new_device": False,
        "is_new_location": False,
        "velocity_10min": 0,
        "impossible_travel": False,
    }
    result = score_transaction(features)
    assert result["score"] == 4  # 1.0 * 4 = 4
    assert result["level"] == "LOW"

    reasons = explain(features)
    assert len(reasons) == 0  # No anomalies triggered


def test_scenario_large_unusual():
    """Scenario 2: Large unusual amount (e.g. 8x avg) + new location -> MEDIUM risk (40-69)."""
    features = {
        "amount_ratio": 8.0,
        "is_new_device": False,
        "is_new_location": True,
        "velocity_10min": 0,
        "impossible_travel": False,
    }
    # score = min(8*4, 35) + 0 + 20 + 0 + 0 = 32 + 20 = 52
    result = score_transaction(features)
    assert result["score"] == 52
    assert result["level"] == "MEDIUM"

    reasons = explain(features)
    assert len(reasons) == 2
    assert "8.0x higher" in reasons[0]
    assert "Unusual location" in reasons[1]


def test_scenario_card_testing_high_ratio():
    """Scenario 3: Card testing / micro-testing or sudden high ratio + new device -> MEDIUM/HIGH."""
    features = {
        "amount_ratio": 10.0,
        "is_new_device": True,
        "is_new_location": False,
        "velocity_10min": 1,
        "impossible_travel": False,
    }
    # score = min(10*4, 35) + 25 + 0 + min(1*5, 25) + 0 = 35 + 25 + 5 = 65
    result = score_transaction(features)
    assert result["score"] == 65
    assert result["level"] == "MEDIUM"

    reasons = explain(features)
    assert len(reasons) == 3
    assert "10.0x higher" in reasons[0]
    assert "New device" in reasons[1]
    assert "1 transactions attempted" in reasons[2]


def test_scenario_high_velocity():
    """Scenario 4: High velocity (e.g. 5 tx in 10 min) + new device -> MEDIUM/HIGH."""
    features = {
        "amount_ratio": 1.2,
        "is_new_device": True,
        "is_new_location": False,
        "velocity_10min": 5,
        "impossible_travel": False,
    }
    # score = min(1.2*4, 35) + 25 + 0 + min(5*5, 25) + 0 = 4.8 + 25 + 25 = 54.8 -> 54
    result = score_transaction(features)
    assert 40 <= result["score"] < 70
    assert result["level"] == "MEDIUM"

    reasons = explain(features)
    assert "5 transactions attempted" in reasons[1]


def test_scenario_impossible_travel():
    """Scenario 5: Impossible travel + new location -> HIGH risk (>=70)."""
    features = {
        "amount_ratio": 2.5,
        "is_new_device": False,
        "is_new_location": True,
        "velocity_10min": 0,
        "impossible_travel": True,
    }
    # score = min(2.5*4, 35) + 0 + 20 + 0 + 30 = 10 + 20 + 30 = 60 (MEDIUM)
    # Let's test with new device as well for high-risk travel:
    features_high = {
        "amount_ratio": 3.0,
        "is_new_device": True,
        "is_new_location": True,
        "velocity_10min": 1,
        "impossible_travel": True,
    }
    # score = min(3*4, 35) + 25 + 20 + 5 + 30 = 12 + 25 + 20 + 5 + 30 = 92
    result = score_transaction(features_high)
    assert result["score"] == 92
    assert result["level"] == "HIGH"

    reasons = explain(features_high)
    assert any("Impossible travel" in r for r in reasons)


def test_scenario_account_takeover_combo():
    """Scenario 6: Account takeover combo (high amount, new device, new location, velocity) -> HIGH risk."""
    features = {
        "amount_ratio": 9.0,
        "is_new_device": True,
        "is_new_location": True,
        "velocity_10min": 3,
        "impossible_travel": False,
    }
    # score = min(9*4, 35) + 25 + 20 + min(3*5, 25) + 0 = 35 + 25 + 20 + 15 = 95
    result = score_transaction(features)
    assert result["score"] == 95
    assert result["level"] == "HIGH"

    reasons = explain(features)
    assert len(reasons) == 4
    assert any("9.0x higher" in r for r in reasons)
    assert any("New device" in r for r in reasons)
    assert any("Unusual location" in r for r in reasons)
    assert any("3 transactions" in r for r in reasons)


def test_score_capping_at_100():
    """Test score does not exceed 100 even with all max features."""
    features = {
        "amount_ratio": 20.0,
        "is_new_device": True,
        "is_new_location": True,
        "velocity_10min": 10,
        "impossible_travel": True,
    }
    # 35 + 25 + 20 + 25 + 30 = 135 -> capped at 100
    result = score_transaction(features)
    assert result["score"] == 100
    assert result["level"] == "HIGH"
