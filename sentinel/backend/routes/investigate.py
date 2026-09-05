"""AI Investigation routes."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_db
from engine.features import compute_features
from engine.ai_agent import investigate

router = APIRouter(prefix="/transactions", tags=["investigate"])


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


@router.post("/{id}/investigate")
async def investigate_transaction_endpoint(id: str):
    """
    Run an AI-powered fraud investigation on a specific transaction.
    Stores the investigation result and writes an audit event.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Load transaction with user info
        tx_row = cursor.execute(
            """
            SELECT t.id, t.user_id, t.amount, t.city, t.device_id, t.timestamp,
                   t.scenario_type, t.risk_score, t.risk_level, t.status,
                   u.name as user_name, u.home_city, u.avg_amount, u.account_age_days,
                   u.known_devices, u.known_locations
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
            """,
            (id,),
        ).fetchone()

        if not tx_row:
            raise HTTPException(status_code=404, detail=f"Transaction {id} not found.")

        transaction_dict = {
            "id": tx_row["id"],
            "user_id": tx_row["user_id"],
            "amount": tx_row["amount"],
            "city": tx_row["city"],
            "device_id": tx_row["device_id"],
            "timestamp": tx_row["timestamp"],
            "scenario_type": tx_row["scenario_type"],
            "risk_score": tx_row["risk_score"],
            "risk_level": tx_row["risk_level"],
            "status": tx_row["status"],
        }

        user_dict = {
            "id": tx_row["user_id"],
            "name": tx_row["user_name"],
            "home_city": tx_row["home_city"],
            "avg_amount": tx_row["avg_amount"],
            "account_age_days": tx_row["account_age_days"],
            "known_devices": json.loads(tx_row["known_devices"]) if tx_row["known_devices"] else [],
            "known_locations": json.loads(tx_row["known_locations"]) if tx_row["known_locations"] else [],
        }

        # Recompute features
        features = compute_features(
            user_id=tx_row["user_id"],
            amount=tx_row["amount"],
            city=tx_row["city"],
            device_id=tx_row["device_id"],
            timestamp=tx_row["timestamp"],
        )

        # Get recent history for context
        history_rows = cursor.execute(
            """
            SELECT id, amount, city, device_id, timestamp, status
            FROM transactions
            WHERE user_id = ? AND id != ?
            ORDER BY timestamp DESC
            LIMIT 5
            """,
            (tx_row["user_id"], id),
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

        # Run AI investigation
        inv_report = investigate(
            transaction=transaction_dict,
            user=user_dict,
            features=features,
            recent_history=recent_history,
        )

        # Store in investigations table
        now_str = datetime.now(timezone.utc).isoformat()
        inv_id = f"inv_{uuid.uuid4().hex[:12]}"

        cursor.execute(
            """
            INSERT INTO investigations (id, transaction_id, summary, key_findings, recommendation, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                inv_id,
                id,
                inv_report["summary"],
                json.dumps(inv_report["key_findings"]),
                inv_report["recommendation"],
                inv_report["confidence"],
                now_str,
            ),
        )

        # Write audit event
        _audit(
            cursor,
            id,
            "investigation_completed",
            f"Investigation ({inv_report.get('source', 'unknown')}): recommendation={inv_report['recommendation']}, confidence={inv_report['confidence']}%",
            now_str,
        )

        conn.commit()

        return {
            "investigation_id": inv_id,
            "transaction_id": id,
            "summary": inv_report["summary"],
            "key_findings": inv_report["key_findings"],
            "risk_assessment": inv_report.get("risk_assessment", ""),
            "recommendation": inv_report["recommendation"],
            "confidence": inv_report["confidence"],
            "source": inv_report.get("source", "fallback"),
            "created_at": now_str,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to investigate transaction {id}: {str(e)}",
        )
    finally:
        if conn:
            conn.close()
