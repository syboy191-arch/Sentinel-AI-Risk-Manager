"""Dashboard summary and analytics routes."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException

from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary():
    """
    Return dashboard summary statistics including:
    - Total transactions
    - Counts by risk_level (LOW, MEDIUM, HIGH)
    - Transactions under review (status 'held' or 'under_review')
    - Estimated potential loss prevented (sum of HIGH risk amounts where status != 'cleared')
    - Time-series data for last 14 days: transactions per day and risk_level counts per day

    NOTE: "potential_loss_prevented" is an ESTIMATE based on HIGH-risk transactions that were
    not cleared. This is NOT a real financial figure and does not account for false positives
    or actual fraud outcomes. Use for trend visualization only.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Total transactions
        total_transactions = cursor.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]

        # Count by risk_level
        risk_counts = cursor.execute(
            """
            SELECT risk_level, COUNT(*) as count
            FROM transactions
            WHERE risk_level IS NOT NULL
            GROUP BY risk_level
            """
        ).fetchall()

        risk_level_counts = {row["risk_level"]: row["count"] for row in risk_counts}

        # Transactions under review (held or under_review status)
        transactions_under_review = cursor.execute(
            """
            SELECT COUNT(*) FROM transactions
            WHERE status IN ('held', 'under_review')
            """
        ).fetchone()[0]

        # Potential loss prevented estimate
        # Sum of amounts for HIGH risk transactions that were NOT cleared
        potential_loss_row = cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE risk_level = 'HIGH' AND status != 'cleared'
            """
        ).fetchone()
        potential_loss_prevented = potential_loss_row["total"] if potential_loss_row else 0

        # Time-series: last 14 days
        now = datetime.now(timezone.utc)
        days_ago_14 = now - timedelta(days=14)

        # Transactions per day
        daily_transactions = cursor.execute(
            """
            SELECT DATE(timestamp) as day, COUNT(*) as count
            FROM transactions
            WHERE timestamp >= ?
            GROUP BY DATE(timestamp)
            ORDER BY day ASC
            """,
            (days_ago_14.isoformat(),),
        ).fetchall()

        transactions_per_day: List[Dict[str, Any]] = [
            {"date": row["day"], "count": row["count"]} for row in daily_transactions
        ]

        # Risk level counts per day
        daily_risk_counts = cursor.execute(
            """
            SELECT DATE(timestamp) as day, risk_level, COUNT(*) as count
            FROM transactions
            WHERE timestamp >= ? AND risk_level IS NOT NULL
            GROUP BY DATE(timestamp), risk_level
            ORDER BY day ASC, risk_level ASC
            """,
            (days_ago_14.isoformat(),),
        ).fetchall()

        # Reshape into array of {date, LOW, MEDIUM, HIGH}
        risk_by_day: Dict[str, Dict[str, int]] = {}
        for row in daily_risk_counts:
            day = row["day"]
            if day not in risk_by_day:
                risk_by_day[day] = {"date": day, "LOW": 0, "MEDIUM": 0, "HIGH": 0}
            risk_by_day[day][row["risk_level"]] = row["count"]

        risk_level_per_day: List[Dict[str, Any]] = list(risk_by_day.values())

        return {
            "total_transactions": total_transactions,
            "risk_level_counts": {
                "LOW": risk_level_counts.get("LOW", 0),
                "MEDIUM": risk_level_counts.get("MEDIUM", 0),
                "HIGH": risk_level_counts.get("HIGH", 0),
            },
            "transactions_under_review": transactions_under_review,
            "potential_loss_prevented_estimate": round(potential_loss_prevented, 2),
            "potential_loss_prevented_note": "This is an ESTIMATE based on HIGH-risk transactions not cleared. NOT a real financial figure.",
            "time_series": {
                "transactions_per_day": transactions_per_day,
                "risk_level_per_day": risk_level_per_day,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate dashboard summary: {str(e)}",
        )
    finally:
        if conn:
            conn.close()
