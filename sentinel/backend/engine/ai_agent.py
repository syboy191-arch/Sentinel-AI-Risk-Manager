"""AI-powered fraud investigation agent using Anthropic Claude API."""

import json
import os
import re
from typing import Dict, Any, List, Optional
from anthropic import Anthropic

from engine.explain import explain


def _clean_json_response(text: str) -> str:
    """Strip markdown code fences and whitespace from response text."""
    text = text.strip()
    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _fallback_investigation(
    transaction: Dict[str, Any],
    user: Dict[str, Any],
    features: Dict[str, Any],
    risk_level: str = "HIGH",
) -> Dict[str, Any]:
    """Generate a deterministic investigation report if the AI API fails or is unavailable."""
    explanations = explain(features)

    # Derive recommendation from risk level
    if risk_level == "LOW":
        recommendation = "ALLOW"
    elif risk_level == "MEDIUM":
        recommendation = "ESCALATE"
    else:
        recommendation = "HOLD"

    amount = transaction.get("amount", 0)
    city = transaction.get("city", "Unknown")
    user_name = user.get("name", "User")
    home_city = user.get("home_city", "Unknown")
    avg_amount = user.get("avg_amount", 0)

    summary = (
        f"Rule-based analysis for {user_name}: Transaction of ${amount:.2f} in {city} "
        f"exhibits {len(explanations)} anomaly indicator(s) against historical profile "
        f"(avg: ${avg_amount:.2f} in {home_city})."
    )

    risk_assessment = (
        f"Risk level evaluated as {risk_level}. Multiple risk features triggered: "
        f"{'; '.join(explanations) if explanations else 'No major anomalies'}."
    )

    return {
        "summary": summary,
        "key_findings": explanations if explanations else ["Transaction appears normal."],
        "risk_assessment": risk_assessment,
        "recommendation": recommendation,
        "confidence": 60,
        "source": "fallback",
    }


def investigate(
    transaction: Dict[str, Any],
    user: Dict[str, Any],
    features: Dict[str, Any],
    recent_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Investigate a suspicious transaction using Anthropic Claude API.
    Falls back gracefully to deterministic rule-based analysis if API key is missing or fails.

    Args:
        transaction: Transaction details (id, amount, city, device_id, timestamp, risk_score, risk_level)
        user: User profile (id, name, home_city, avg_amount, known_devices, known_locations)
        features: Computed features (amount_ratio, is_new_device, is_new_location, velocity_10min, impossible_travel)
        recent_history: Optional list of recent historical transactions for this user

    Returns:
        Dict matching {"summary": str, "key_findings": [str], "risk_assessment": str, "recommendation": str, "confidence": int, "source": str}
    """
    if recent_history is None:
        recent_history = []

    risk_level = transaction.get("risk_level", "HIGH")
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    # If no API key is set, use fallback immediately
    if not api_key:
        return _fallback_investigation(transaction, user, features, risk_level)

    # Prepare evidence payload for Claude
    evidence = {
        "transaction": {
            "id": transaction.get("id"),
            "amount": transaction.get("amount"),
            "city": transaction.get("city"),
            "device_id": transaction.get("device_id"),
            "timestamp": transaction.get("timestamp"),
            "risk_score": transaction.get("risk_score"),
            "risk_level": transaction.get("risk_level"),
            "scenario_type": transaction.get("scenario_type"),
        },
        "user_profile": {
            "id": user.get("id"),
            "name": user.get("name"),
            "home_city": user.get("home_city"),
            "avg_transaction_amount": user.get("avg_amount"),
            "account_age_days": user.get("account_age_days"),
            "known_devices": user.get("known_devices"),
            "known_locations": user.get("known_locations"),
        },
        "computed_features": features,
        "recent_history_sample": recent_history[:5],  # Last 5 transactions for context
    }

    system_prompt = """You are an expert fraud investigation analyst for Sentinel AI, an enterprise financial security system.
Your job is to analyze suspicious transactions against the user's historical profile and computed risk features.

You must evaluate the evidence provided and return ONLY a valid JSON object (no markdown fences, no conversational prose) with this exact schema:
{
  "summary": "Concise 1-2 sentence executive summary of the investigation",
  "key_findings": ["Bullet point 1 detailing specific anomaly", "Bullet point 2 with concrete numbers/locations", "Bullet point 3"],
  "risk_assessment": "1-2 sentence technical assessment of why this is or is not fraudulent",
  "recommendation": "ALLOW" | "HOLD" | "ESCALATE",
  "confidence": <integer between 0 and 100 representing confidence in this recommendation>
}

Guidelines for recommendations:
- ALLOW: If anomalies are minor or consistent with benign user travel/holiday shopping
- HOLD: If strong indicators of account takeover, impossible travel, or credential stuffing
- ESCALATE: If high amount with ambiguous indicators requiring human analyst verification
"""

    try:
        client = Anthropic(api_key=api_key, timeout=15.0)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Investigate this suspicious transaction evidence:\n\n{json.dumps(evidence, indent=2)}",
                }
            ],
        )

        content_text = response.content[0].text
        cleaned_json = _clean_json_response(content_text)
        result = json.loads(cleaned_json)

        # Validate required keys
        required_keys = ["summary", "key_findings", "risk_assessment", "recommendation", "confidence"]
        if not all(k in result for k in required_keys):
            raise ValueError("Missing required keys in AI response JSON")

        # Validate recommendation value
        if result["recommendation"] not in ("ALLOW", "HOLD", "ESCALATE"):
            result["recommendation"] = "HOLD" if risk_level == "HIGH" else "ESCALATE"

        result["confidence"] = int(result["confidence"])
        result["source"] = "ai"
        return result

    except Exception as e:
        # Graceful fallback on API error, timeout, or parsing failure
        fallback = _fallback_investigation(transaction, user, features, risk_level)
        fallback["error_detail"] = str(e)
        return fallback
