"""Audit log retrieval routes."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import get_db

router = APIRouter(prefix="/audit-log", tags=["audit"])


@router.get("")
async def get_audit_log(
    transaction_id: Optional[str] = Query(default=None, description="Filter by transaction ID"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    Retrieve audit log events with optional filtering by transaction_id.
    Results are ordered by created_at DESC and paginated.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        query = """
            SELECT ae.id, ae.transaction_id, ae.event_type, ae.detail, ae.created_at,
                   t.amount, t.risk_level, u.name as user_name
            FROM audit_events ae
            LEFT JOIN transactions t ON ae.transaction_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
        """
        params = []

        if transaction_id:
            query += " WHERE ae.transaction_id = ?"
            params.append(transaction_id)

        query += " ORDER BY ae.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = cursor.execute(query, params).fetchall()

        # Get total count for pagination
        count_query = "SELECT COUNT(*) FROM audit_events"
        if transaction_id:
            count_query += " WHERE transaction_id = ?"
            total_count = cursor.execute(count_query, [transaction_id]).fetchone()[0]
        else:
            total_count = cursor.execute(count_query).fetchone()[0]

        events = [
            {
                "id": r["id"],
                "transaction_id": r["transaction_id"],
                "event_type": r["event_type"],
                "detail": r["detail"],
                "created_at": r["created_at"],
                "transaction_amount": r["amount"],
                "transaction_risk_level": r["risk_level"],
                "user_name": r["user_name"],
            }
            for r in rows
        ]

        return {
            "events": events,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "transaction_id_filter": transaction_id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve audit log: {str(e)}",
        )
    finally:
        if conn:
            conn.close()
