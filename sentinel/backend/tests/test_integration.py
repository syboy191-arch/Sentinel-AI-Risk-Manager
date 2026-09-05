"""Integration tests for transaction simulation and analyst decision workflows."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from database import init_db
from seed import seed

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_seeded_db():
    """Ensure clean database with seed users and history before tests."""
    init_db()
    seed()
    yield


def test_simulate_all_six_scenarios_risk_bands():
    """
    Test POST /transactions/simulate for each of the 6 scenarios.
    Assert that each returned risk_level matches its expected risk band.
    """
    expected_bands = {
        "normal": "LOW",
        "large_unusual": "MEDIUM",
        "card_testing": "MEDIUM",
        "velocity_attack": "MEDIUM",
        "impossible_travel": "HIGH",
        "account_takeover": "HIGH",
    }

    for scenario, expected_level in expected_bands.items():
        response = client.post("/transactions/simulate", json={"scenario": scenario})
        assert response.status_code == 200, f"Simulate failed for {scenario}: {response.text}"

        data = response.json()
        assert "transaction" in data
        assert "risk_level" in data
        assert "score" in data

        actual_level = data["risk_level"]
        assert actual_level == expected_level, (
            f"Scenario '{scenario}' returned risk_level '{actual_level}' (score: {data['score']}), "
            f"expected '{expected_level}'"
        )

        # Also verify the transaction record itself reflects the same risk_level
        assert data["transaction"]["risk_level"] == expected_level


def test_decision_updates_transaction_status():
    """
    Test that POST /transactions/{id}/decision correctly updates transaction status:
    - APPROVE -> status 'cleared'
    - REJECT -> status 'held'
    - ESCALATE -> status 'under_review'
    """
    # 1. Simulate a transaction to get a real transaction ID
    sim_res = client.post("/transactions/simulate", json={"scenario": "large_unusual"})
    assert sim_res.status_code == 200
    tx_id = sim_res.json()["transaction"]["id"]

    # 2. Test APPROVE -> status 'cleared'
    res_approve = client.post(f"/transactions/{tx_id}/decision", json={"action": "APPROVE"})
    assert res_approve.status_code == 200
    approve_data = res_approve.json()
    assert approve_data["new_status"] == "cleared"
    assert approve_data["action"] == "APPROVE"

    # Verify via GET /transactions/{id}
    get_res_1 = client.get(f"/transactions/{tx_id}")
    assert get_res_1.status_code == 200
    assert get_res_1.json()["transaction"]["status"] == "cleared"

    # 3. Test REJECT -> status 'held'
    res_reject = client.post(f"/transactions/{tx_id}/decision", json={"action": "REJECT"})
    assert res_reject.status_code == 200
    reject_data = res_reject.json()
    assert reject_data["new_status"] == "held"
    assert reject_data["action"] == "REJECT"

    # Verify via GET /transactions/{id}
    get_res_2 = client.get(f"/transactions/{tx_id}")
    assert get_res_2.status_code == 200
    assert get_res_2.json()["transaction"]["status"] == "held"

    # 4. Test ESCALATE -> status 'under_review'
    res_escalate = client.post(f"/transactions/{tx_id}/decision", json={"action": "ESCALATE"})
    assert res_escalate.status_code == 200
    escalate_data = res_escalate.json()
    assert escalate_data["new_status"] == "under_review"
    assert escalate_data["action"] == "ESCALATE"

    # Verify via GET /transactions/{id}
    get_res_3 = client.get(f"/transactions/{tx_id}")
    assert get_res_3.status_code == 200
    assert get_res_3.json()["transaction"]["status"] == "under_review"
