"""Transaction simulation and retrieval routes."""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database import get_db
from engine.features import compute_features
from engine.risk_engine import score_transaction
from engine.explain import explain
from engine.patterns import detect_pattern
from engine.geo import CITY_COORDS
from engine.ai_agent import investigate

router = APIRouter(prefix="/transactions", tags=["transactions"])

CITIES = list(CITY_COORDS.keys())


class SimulateRequest(BaseModel):
    scenario: str  # "normal" | "large_unusual" | "card_testing" | "velocity_attack" | "impossible_travel" | "account_takeover"


def _audit(cursor, transaction_id: str, event_type: str, detail: str, created_at: str):
    """Insert an audit log event."""
    audit_id = f"aud_{uuid.uuid4().hex[:12]}"
    cursor.execute(
        """
        INSERT INTO audit_events (id, transaction_id, event_type, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (audit_id, transaction_id, event_type, detail, created_at),
    )


@router.post("/simulate")
async def simulate_transaction(req: SimulateRequest):
    """
    Simulate a realistic transaction matching a specific fraud/risk scenario.
    Runs the full risk scoring and detection pipeline, records audit logs, and returns the result.
    """
    valid_scenarios = [
        "normal",
        "large_unusual",
        "card_testing",
        "velocity_attack",
        "impossible_travel",
        "account_takeover",
    ]
    if req.scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{req.scenario}'. Must be one of: {', '.join(valid_scenarios)}",
        )

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get random existing seeded user
        users = cursor.execute(
            "SELECT id, name, home_city, avg_amount, account_age_days, known_devices, known_locations FROM users"
        ).fetchall()
        if not users:
            raise HTTPException(status_code=500, detail="No seeded users found in database.")

        user = random.choice(users)
        user_id = user["id"]
        avg_amount = user["avg_amount"]
        home_city = user["home_city"]
        known_devices = json.loads(user["known_devices"])
        known_locations = json.loads(user["known_locations"])

        now = datetime.now(timezone.utc)
        timestamp_str = now.isoformat()
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"

        # Other cities / foreign device for anomaly construction
        other_cities = [c for c in CITIES if c not in known_locations]
        if not other_cities:
            other_cities = [c for c in CITIES if c != home_city]
        new_city = random.choice(other_cities) if other_cities else "Miami"
        new_device = f"dev_unknown_{uuid.uuid4().hex[:6]}"
        known_device = known_devices[0] if known_devices else f"dev_{uuid.uuid4().hex[:6]}"

        recent_amounts: List[float] = []

        # Scenario parameters construction
        if req.scenario == "normal":
            amount = round(avg_amount * random.uniform(0.85, 1.15), 2)
            city = home_city
            device_id = known_device
            scenario_type = "NORMAL"

        elif req.scenario == "large_unusual":
            # 8x to 12x normal amount, unusual location
            amount = round(avg_amount * random.uniform(8.0, 12.0), 2)
            city = new_city
            device_id = known_device
            scenario_type = "LARGE_UNUSUAL"

        elif req.scenario == "card_testing":
            # Insert 3 micro-transactions in the last 3 minutes, followed by a larger transaction
            for i, probe_amt in enumerate([1.25, 2.50, 4.99], start=1):
                probe_time = (now - timedelta(seconds=(4 - i) * 45)).isoformat()
                probe_id = f"tx_probe_{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    """
                    INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (probe_id, user_id, probe_amt, home_city, new_device, probe_time, "CARD_TESTING_PROBE", 15, "LOW", "completed"),
                )
                recent_amounts.append(probe_amt)

            amount = round(avg_amount * 3.5, 2)
            recent_amounts.append(amount)
            city = home_city
            device_id = new_device
            scenario_type = "CARD_TESTING"

        elif req.scenario == "velocity_attack":
            # Insert 7 rapid transactions in the last 4 minutes
            for i in range(1, 8):
                vel_time = (now - timedelta(seconds=(8 - i) * 30)).isoformat()
                vel_id = f"tx_vel_{uuid.uuid4().hex[:8]}"
                vel_amt = round(avg_amount * random.uniform(0.9, 1.5), 2)
                cursor.execute(
                    """
                    INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (vel_id, user_id, vel_amt, home_city, new_device, vel_time, "VELOCITY_BURST", 50, "MEDIUM", "completed"),
                )
                recent_amounts.append(vel_amt)

            amount = round(avg_amount * 1.8, 2)
            recent_amounts.append(amount)
            city = home_city
            device_id = new_device
            scenario_type = "VELOCITY_ATTACK"

        elif req.scenario == "impossible_travel":
            # Insert a transaction 15 minutes ago in home_city, and current transaction in new_city
            prior_city = home_city
            prior_time = (now - timedelta(minutes=15)).isoformat()
            prior_id = f"tx_travel_prior_{uuid.uuid4().hex[:8]}"
            cursor.execute(
                """
                INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (prior_id, user_id, avg_amount, prior_city, known_device, prior_time, "NORMAL", 10, "LOW", "completed"),
            )

            amount = round(avg_amount * 2.5, 2)
            city = new_city
            device_id = new_device
            scenario_type = "IMPOSSIBLE_TRAVEL"

        elif req.scenario == "account_takeover":
            # New device + new location + high amount ratio (7x - 10x)
            amount = round(avg_amount * random.uniform(7.0, 10.0), 2)
            city = new_city
            device_id = new_device
            scenario_type = "ACCOUNT_TAKEOVER"

        # 1. Insert initial transaction row and commit so compute_features can query it
        cursor.execute(
            """
            INSERT INTO transactions (id, user_id, amount, city, device_id, timestamp, scenario_type, risk_score, risk_level, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (tx_id, user_id, amount, city, device_id, timestamp_str, scenario_type, None, None, "pending"),
        )
        _audit(cursor, tx_id, "transaction_created", f"Transaction created for user {user_id} (${amount:.2f})", timestamp_str)
        conn.commit()

        # 2. Compute features
        features = compute_features(
            user_id=user_id,
            amount=amount,
            city=city,
            device_id=device_id,
            timestamp=timestamp_str,
        )
        cursor.execute(
            """
            INSERT OR REPLACE INTO features (transaction_id, amount_ratio, is_new_device, is_new_location, velocity_10min, impossible_travel)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                tx_id,
                features["amount_ratio"],
                1 if features["is_new_device"] else 0,
                1 if features["is_new_location"] else 0,
                features["velocity_10min"],
                1 if features["impossible_travel"] else 0,
            ),
        )
        _audit(
            cursor,
            tx_id,
            "features_computed",
            f"Features: ratio={features['amount_ratio']}, new_device={features['is_new_device']}, new_loc={features['is_new_location']}, vel={features['velocity_10min']}, imp_travel={features['impossible_travel']}",
            timestamp_str,
        )

        # 3. Score transaction
        risk_res = score_transaction(features)
        score = risk_res["score"]
        level = risk_res["level"]
        status = "flagged" if level in ("MEDIUM", "HIGH") else "approved"

        cursor.execute(
            """
            UPDATE transactions
            SET risk_score = ?, risk_level = ?, status = ?
            WHERE id = ?
            """,
            (score, level, status, tx_id),
        )
        _audit(
            cursor,
            tx_id,
            "risk_scored",
            f"Score: {score}/100, Level: {level}, Status: {status}",
            timestamp_str,
        )

        # 4. Explain and detect pattern
        explanations = explain(features)
        pattern = detect_pattern(features, recent_amounts=recent_amounts)

        # 5. If HIGH risk, automatically run AI investigation
        investigation = None
        if level == "HIGH":
            transaction_dict = {
                "id": tx_id,
                "user_id": user_id,
                "amount": amount,
                "city": city,
                "device_id": device_id,
                "timestamp": timestamp_str,
                "scenario_type": scenario_type,
                "risk_score": score,
                "risk_level": level,
                "status": status,
            }
            user_dict = {
                "id": user_id,
                "name": user["name"],
                "home_city": user["home_city"],
                "avg_amount": user["avg_amount"],
                "account_age_days": user["account_age_days"],
                "known_devices": json.dumps(known_devices),
                "known_locations": json.dumps(known_locations),
            }

            # Get recent history
            history_rows = cursor.execute(
                """
                SELECT id, amount, city, device_id, timestamp, status
                FROM transactions
                WHERE user_id = ? AND id != ?
                ORDER BY timestamp DESC
                LIMIT 5
                """,
                (user_id, tx_id),
            ).fetchall()
            recent_history = [
                {
                    "id": h["id"],
                    "amount": h["amount"],
                    "city": h["city"],
                    "device_id": h["device_id"],
                    "timestamp": h["timestamp"],
                    "status": h["status"],
                }
                for h in history_rows
            ]

            inv_report = investigate(
                transaction=transaction_dict,
                user=user_dict,
                features=features,
                recent_history=recent_history,
            )

            # Store investigation
            inv_id = f"inv_{uuid.uuid4().hex[:12]}"
            cursor.execute(
                """
                INSERT INTO investigations (id, transaction_id, summary, key_findings, recommendation, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    inv_id,
                    tx_id,
                    inv_report["summary"],
                    json.dumps(inv_report["key_findings"]),
                    inv_report["recommendation"],
                    inv_report["confidence"],
                    timestamp_str,
                ),
            )
            _audit(
                cursor,
                tx_id,
                "investigation_completed",
                f"Auto-investigation ({inv_report.get('source', 'unknown')}): {inv_report['recommendation']} at {inv_report['confidence']}% confidence",
                timestamp_str,
            )

            investigation = {
                "id": inv_id,
                "summary": inv_report["summary"],
                "key_findings": inv_report["key_findings"],
                "risk_assessment": inv_report.get("risk_assessment", ""),
                "recommendation": inv_report["recommendation"],
                "confidence": inv_report["confidence"],
                "source": inv_report.get("source", "fallback"),
            }

        conn.commit()

        return {
            "transaction": {
                "id": tx_id,
                "user_id": user_id,
                "user_name": user["name"],
                "amount": amount,
                "city": city,
                "device_id": device_id,
                "timestamp": timestamp_str,
                "scenario_type": scenario_type,
                "risk_score": score,
                "risk_level": level,
                "status": status,
            },
            "features": features,
            "score": score,
            "risk_level": level,
            "explanations": explanations,
            "pattern": pattern,
            "investigation": investigation,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transaction simulation failed: {str(e)}",
        )
    finally:
        if conn:
            conn.close()


@router.get("")
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    risk_level: Optional[str] = Query(default=None),
):
    """List transactions ordered by timestamp desc with pagination."""
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        query = """
            SELECT t.id, t.user_id, u.name as user_name, t.amount, t.city, t.device_id,
                   t.timestamp, t.scenario_type, t.risk_score, t.risk_level, t.status
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
        """
        params = []
        if risk_level:
            query += " WHERE t.risk_level = ?"
            params.append(risk_level)

        query += " ORDER BY t.timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = cursor.execute(query, params).fetchall()

        total_count = cursor.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]

        transactions = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "user_name": r["user_name"],
                "amount": r["amount"],
                "city": r["city"],
                "device_id": r["device_id"],
                "timestamp": r["timestamp"],
                "scenario_type": r["scenario_type"],
                "risk_score": r["risk_score"],
                "risk_level": r["risk_level"],
                "status": r["status"],
            }
            for r in rows
        ]

        return {
            "transactions": transactions,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list transactions: {str(e)}",
        )
    finally:
        if conn:
            conn.close()


@router.get("/{id}")
async def get_transaction(id: str):
    """Get single transaction with full details, features, and explanations."""
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        row = cursor.execute(
            """
            SELECT t.id, t.user_id, u.name as user_name, u.home_city, u.avg_amount,
                   t.amount, t.city, t.device_id, t.timestamp, t.scenario_type,
                   t.risk_score, t.risk_level, t.status
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
            """,
            (id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Transaction {id} not found.")

        # Recompute features and explanations
        features = compute_features(
            user_id=row["user_id"],
            amount=row["amount"],
            city=row["city"],
            device_id=row["device_id"],
            timestamp=row["timestamp"],
        )
        explanations = explain(features)
        pattern = detect_pattern(features)

        # Get audit events
        audit_rows = cursor.execute(
            "SELECT event_type, detail, created_at FROM audit_events WHERE transaction_id = ? ORDER BY created_at ASC",
            (id,),
        ).fetchall()

        audit_events = [
            {"event_type": a["event_type"], "detail": a["detail"], "created_at": a["created_at"]}
            for a in audit_rows
        ]

        # Get latest investigation
        inv_row = cursor.execute(
            """
            SELECT id, summary, key_findings, recommendation, confidence, created_at
            FROM investigations
            WHERE transaction_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (id,),
        ).fetchone()

        investigation = None
        if inv_row:
            try:
                findings = json.loads(inv_row["key_findings"])
            except Exception:
                findings = []
            investigation = {
                "id": inv_row["id"],
                "summary": inv_row["summary"],
                "key_findings": findings,
                "recommendation": inv_row["recommendation"],
                "confidence": inv_row["confidence"],
                "created_at": inv_row["created_at"],
                "source": "ai" if any(
                    "Auto-investigation (ai)" in a["detail"] or "Investigation (ai)" in a["detail"]
                    for a in audit_events if a["event_type"] == "investigation_completed"
                ) else "fallback",
            }

        # Get latest decision
        dec_row = cursor.execute(
            """
            SELECT id, analyst_action, override_reason, created_at
            FROM decisions
            WHERE transaction_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (id,),
        ).fetchone()

        decision = None
        if dec_row:
            decision = {
                "id": dec_row["id"],
                "action": dec_row["analyst_action"],
                "override_reason": dec_row["override_reason"],
                "created_at": dec_row["created_at"],
            }

        return {
            "transaction": {
                "id": row["id"],
                "user_id": row["user_id"],
                "user_name": row["user_name"],
                "home_city": row["home_city"],
                "avg_amount": row["avg_amount"],
                "amount": row["amount"],
                "city": row["city"],
                "device_id": row["device_id"],
                "timestamp": row["timestamp"],
                "scenario_type": row["scenario_type"],
                "risk_score": row["risk_score"],
                "risk_level": row["risk_level"],
                "status": row["status"],
            },
            "features": features,
            "score": row["risk_score"],
            "risk_level": row["risk_level"],
            "explanations": explanations,
            "pattern": pattern,
            "investigation": investigation,
            "decision": decision,
            "audit_events": audit_events,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get transaction {id}: {str(e)}",
        )
    finally:
        if conn:
            conn.close()
