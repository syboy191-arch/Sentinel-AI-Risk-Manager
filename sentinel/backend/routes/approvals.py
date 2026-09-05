"""Analyst decision and approval workflow routes."""

import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import get_db

router = APIRouter(prefix="/transactions", tags=["approvals"])

# Map analyst action to transaction status
ACTION_TO_STATUS = {
    "APPROVE": "cleared",
    "REJECT": "held",
    "ESCALATE": "under_review",
}

# Map analyst action to AI recommendation equivalent
ACTION_TO_AI_REC = {
    "APPROVE": "ALLOW",
    "REJECT": "HOLD",
    "ESCALATE": "ESCALATE",
}


class DecisionRequest(BaseModel):
    action: Literal["APPROVE", "REJECT", "ESCALATE"]
    override_reason: Optional[str] = Field(default=None, description="Reason if overriding AI recommendation")


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


@router.post("/{id}/decision")
async def record_decision(id: str, req: DecisionRequest):
    """
    Record an analyst's decision on a flagged or investigated transaction.
    Updates transaction status, records the decision, and logs an audit trail comparing with AI recommendation.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # 1. Verify transaction exists
        tx_row = cursor.execute(
            "SELECT id, status, risk_score, risk_level FROM transactions WHERE id = ?",
            (id,),
        ).fetchone()

        if not tx_row:
            raise HTTPException(status_code=404, detail=f"Transaction {id} not found.")

        new_status = ACTION_TO_STATUS[req.action]
        now_str = datetime.now(timezone.utc).isoformat()
        decision_id = f"dec_{uuid.uuid4().hex[:12]}"

        # 2. Check for latest AI investigation recommendation
        inv_row = cursor.execute(
            """
            SELECT recommendation, confidence, created_at
            FROM investigations
            WHERE transaction_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (id,),
        ).fetchone()

        ai_recommendation = inv_row["recommendation"] if inv_row else None
        matched_ai: Optional[bool] = None

        if ai_recommendation:
            expected_ai_rec = ACTION_TO_AI_REC[req.action]
            matched_ai = (ai_recommendation == expected_ai_rec)

            if matched_ai:
                comparison_note = f"matches AI recommendation ({ai_recommendation})"
            else:
                comparison_note = f"OVERRODE AI recommendation (AI recommended {ai_recommendation}, Analyst chose {req.action})"
                if req.override_reason:
                    comparison_note += f" - Reason: {req.override_reason}"
        else:
            comparison_note = "no prior AI investigation"

        # 3. Insert into decisions table
        cursor.execute(
            """
            INSERT INTO decisions (id, transaction_id, analyst_action, override_reason, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (decision_id, id, req.action, req.override_reason, now_str),
        )

        # 4. Update transaction status
        cursor.execute(
            "UPDATE transactions SET status = ? WHERE id = ?",
            (new_status, id),
        )

        # 5. Write audit event
        audit_detail = f"Analyst action '{req.action}' ({comparison_note}) -> status updated to '{new_status}'"
        _audit(cursor, id, "decision_recorded", audit_detail, now_str)

        conn.commit()

        return {
            "decision_id": decision_id,
            "transaction_id": id,
            "action": req.action,
            "previous_status": tx_row["status"],
            "new_status": new_status,
            "override_reason": req.override_reason,
            "ai_recommendation": ai_recommendation,
            "matched_ai": matched_ai,
            "created_at": now_str,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record decision for transaction {id}: {str(e)}",
        )
    finally:
        if conn:
            conn.close()
