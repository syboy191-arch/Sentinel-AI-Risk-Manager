"""Tests for pattern detection."""

import sys
from pathlib import Path
import pytest

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.patterns import detect_pattern


def test_pattern_impossible_travel():
    """Test 1: Impossible travel flag triggers IMPOSSIBLE_TRAVEL pattern."""
    features = {
        "amount_ratio": 2.0,
        "is_new_device": True,
        "is_new_location": True,
        "velocity_10min": 1,
        "impossible_travel": True,
    }
    pattern = detect_pattern(features, recent_amounts=[50.0, 100.0])
    assert pattern == "IMPOSSIBLE_TRAVEL"


def test_pattern_account_takeover():
    """Test 2: New device + new location + high amount ratio (>5) triggers ACCOUNT_TAKEOVER."""
    features = {
        "amount_ratio": 7.5,
        "is_new_device": True,
        "is_new_location": True,
        "velocity_10min": 1,
        "impossible_travel": False,
    }
    pattern = detect_pattern(features, recent_amounts=[50.0, 375.0])
    assert pattern == "ACCOUNT_TAKEOVER"


def test_pattern_velocity_attack():
    """Test 3: Velocity > 6 in 10 minutes triggers VELOCITY_ATTACK."""
    features = {
        "amount_ratio": 1.1,
        "is_new_device": False,
        "is_new_location": False,
        "velocity_10min": 8,
        "impossible_travel": False,
    }
    pattern = detect_pattern(features, recent_amounts=[20.0, 20.0, 20.0, 20.0, 20.0, 20.0, 20.0, 20.0])
    assert pattern == "VELOCITY_ATTACK"


def test_pattern_card_testing():
    """Test 4: Small probing amounts followed by a large transaction triggers CARD_TESTING."""
    features = {
        "amount_ratio": 3.0,
        "is_new_device": False,
        "is_new_location": False,
        "velocity_10min": 3,
        "impossible_travel": False,
    }
    # Probing with $1.00, $2.50, $5.00 then $350.00
    recent_amounts = [1.00, 2.50, 5.00, 350.00]
    pattern = detect_pattern(features, recent_amounts=recent_amounts)
    assert pattern == "CARD_TESTING"


def test_pattern_none_for_normal():
    """Test 5: Normal transactions return None for pattern."""
    features = {
        "amount_ratio": 1.0,
        "is_new_device": False,
        "is_new_location": False,
        "velocity_10min": 0,
        "impossible_travel": False,
    }
    pattern = detect_pattern(features, recent_amounts=[45.0, 50.0])
    assert pattern is None
