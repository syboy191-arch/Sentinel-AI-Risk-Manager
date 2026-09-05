Sentinel AI Risk Manager

AI-powered fraud detection, risk scoring, investigation, and human-in-the-loop decision platform

Sentinel AI Risk Manager is a web-based financial risk command center designed to help merchants, payment companies, and financial risk teams identify suspicious transactions, understand why they are risky, investigate them with AI, make analyst-approved decisions, and preserve an auditable history of those decisions.

This README documents the current implementation in the main branch, rather than the original project concept/specification. Some features from the original concept are intentionally not described as implemented unless they are present in the current codebase.

1. Current Project Status

Implemented

React + TypeScript + Vite frontend

FastAPI backend

SQLite persistence

Seeded users and transaction data

Transaction listing and pagination

Transaction detail retrieval

Deterministic transaction feature engineering

Deterministic risk scoring from 0–100

LOW / MEDIUM / HIGH risk classification

Explainable risk factors

Fraud/attack pattern detection

Anthropic Claude-powered investigation

Deterministic investigation fallback when Claude is unavailable

Human analyst approval/rejection/escalation workflow

Audit event logging

Risk dashboard with metrics and time-series charts

Transaction simulator

Simulation pipeline visualization

Frontend loading, empty, retry, and error states

Backend API health endpoint

Backend automated tests for core feature/pattern/risk/integration behavior

Not currently exposed as separate frontend routes

The current frontend routing exposes:

/

/transactions

/simulator

/audit-log

The repository also contains reusable investigation/approval/evidence components, but the current App.tsx does not expose a separate /investigations route.

Not currently part of the implemented frontend

The original concept included additional pages such as a dedicated Analytics page, Risk Alerts page, and AI Assistant/chat page. These should be treated as future work unless they are added to the current frontend.

2. High-Level Architecture

                    ┌──────────────────────────┐
                    │     Sentinel Frontend    │
                    │ React + TypeScript + Vite│
                    └────────────┬─────────────┘
                                 │ HTTP / JSON
                                 ▼
                    ┌──────────────────────────┐
                    │       FastAPI API        │
                    │        main.py           │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
      Transaction Routes   Investigation Routes   Dashboard
              │                  │                  │
              ▼                  ▼                  ▼
        Feature Engine      AI Investigation    Aggregations
              │                  │
              ▼                  ▼
        Risk Engine       Claude API / Fallback
              │
              ▼
       Pattern Detection
              │
              ▼
           SQLite

The backend is intentionally simple: a single FastAPI service communicates with a local SQLite database and exposes the fraud/risk functionality through route modules.

3. Repository Structure

Sentinel-AI-Risk-Manager/
│
├── .vscode/
│
├── sentinel/
│   │
│   ├── backend/
│   │   ├── engine/
│   │   │   ├── ai_agent.py
│   │   │   ├── explain.py
│   │   │   ├── features.py
│   │   │   ├── geo.py
│   │   │   ├── patterns.py
│   │   │   └── risk_engine.py
│   │   │
│   │   ├── routes/
│   │   │   ├── approvals.py
│   │   │   ├── audit.py
│   │   │   ├── dashboard.py
│   │   │   ├── investigate.py
│   │   │   └── transactions.py
│   │   │
│   │   ├── tests/
│   │   │   ├── test_features.py
│   │   │   ├── test_integration.py
│   │   │   ├── test_patterns.py
│   │   │   └── test_risk_engine.py
│   │   │
│   │   ├── .env.example
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── seed.py
│   │   └── sentinel.db
│   │
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── api/
│       │   │   └── client.ts
│       │   ├── assets/
│       │   ├── components/
│       │   │   ├── ApprovalControls.tsx
│       │   │   ├── EmptyState.tsx
│       │   │   ├── ErrorState.tsx
│       │   │   ├── EvidenceList.tsx
│       │   │   ├── InvestigationPanel.tsx
│       │   │   ├── InvestigationReport.tsx
│       │   │   ├── MetricCard.tsx
│       │   │   ├── RiskBadge.tsx
│       │   │   └── Sidebar.tsx
│       │   ├── pages/
│       │   │   ├── AuditLog.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Simulator.tsx
│       │   │   └── Transactions.tsx
│       │   └── App.tsx
│       │
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.ts
│       └── tsconfig*.json
│
└── README.md

4. Frontend

Technology

The current frontend uses:

React

TypeScript

Vite

React Router

TanStack React Query

Axios

Recharts

Lucide React

Tailwind CSS

The frontend's package scripts currently provide:

npm run dev
npm run build
npm run lint
npm run preview

5. Frontend Navigation

The current sidebar exposes four primary destinations:

Route

Page

Purpose

/

Dashboard

Risk command center and overall transaction/risk overview

/transactions

Transactions

Transaction ledger with risk assessment and expandable investigation details

/simulator

Simulator

Generate controlled fraud/risk scenarios and run the pipeline

/audit-log

Audit Log

Review recorded system and decision events

The sidebar is implemented as a reusable component and uses Lucide icons for navigation.

6. Dashboard

The Dashboard is the main risk command center.

It currently retrieves:

Total transaction count

LOW / MEDIUM / HIGH risk counts

Transactions under review

Estimated potential loss prevented

Transaction time-series data

Daily risk-level counts

Recent transactions

The frontend refreshes the dashboard and recent transaction data periodically.

Main visualizations

The dashboard uses Recharts for:

Transaction trend lines

Risk-level trend data

Other dashboard visualizations currently implemented in the page

High-risk alerts

Recent transactions are filtered for HIGH-risk entries and displayed as live/high-risk alert information.

Dashboard data flow

GET /dashboard/summary
        +
GET /transactions?limit=50
        ↓
Dashboard.tsx
        ↓
Metric cards + charts + high-risk transaction view

7. Transaction Ledger

The Transactions page provides the transaction-monitoring interface.

It supports:

Paginated transaction retrieval

Risk-level filtering

Sorting

Refresh

Transaction ID

User profile

Amount

Location

Risk score / assessment

Timestamp

Status

Expandable transaction details

Investigation/approval-related UI components

The page includes loading and error states and provides a retry path when the backend cannot be reached.

8. Transaction Simulator

The Simulator is one of the main demonstration features.

It can trigger these scenarios:

Scenario

Expected Risk Band

Purpose

Normal Transaction

LOW

Demonstrates a normal transaction matching the user's profile

Large Unusual Amount

MEDIUM

Demonstrates an abnormal spending amount

Card Testing Sequence

MEDIUM

Demonstrates small probing payments followed by a larger payment

High Velocity Burst

MEDIUM

Demonstrates many rapid transaction attempts

Impossible Travel

HIGH

Demonstrates geographically impossible transaction movement

Account Takeover (ATO)

HIGH

Demonstrates multiple compounding account-risk indicators

When a simulation is executed, the frontend presents a staged pipeline visualization.

Conceptually:

Transaction Scenario
        ↓
Transaction Ingestion
        ↓
Behavioral Feature Calculation
        ↓
Risk Scoring
        ↓
Pattern Detection
        ↓
Explanation
        ↓
AI Investigation
        ↓
Analyst Decision
        ↓
Audit Event

The simulator is connected to the backend rather than being only a visual mockup.

9. Feature Engineering

The backend computes transaction-level behavioral features.

Current features include:

Amount Ratio

transaction amount / user's average transaction amount

This measures how unusual the transaction value is compared with the user's normal behavior.

New Device

Checks whether the transaction device is present in the user's known device list.

New Location

Checks whether the transaction city is present in the user's known location list.

Transaction Velocity

Counts recent transactions within the configured short time window.

Impossible Travel

Uses geographic distance and transaction timestamps to estimate whether the user's movement would require an implausibly high travel speed.

The feature engine includes a Haversine distance calculation for geographic distance.

10. Risk Scoring Engine

The current risk engine is deterministic, not a trained machine-learning model.

The score is calculated from the following signals:

Amount anomaly:
    min(amount_ratio × 4, 35)

New device:
    +25

New location:
    +20

Transaction velocity:
    min(velocity_10min × 5, 25)

Impossible travel:
    +30

The final score is capped at 100.

Risk bands

0–39    → LOW
40–69   → MEDIUM
70–100  → HIGH

This deterministic approach is intentional because it makes the risk score:

Fast

Reproducible

Explainable

Easy to test

Suitable for controlled demonstrations

It should not currently be described as a trained ML fraud classifier.

11. Explainable Risk

Sentinel produces human-readable explanations from the computed signals.

The goal is to answer:

"Why is this transaction risky?"

Examples of evidence include:

Transaction amount is unusually high relative to the user's historical average

Device is not recognized

Location is not recognized

Transaction velocity is unusually high

Travel between transactions is implausible

The explanations are derived from structured transaction features rather than relying on an LLM to invent evidence.

12. Fraud Pattern Detection

The pattern engine identifies specific patterns in addition to the numerical risk score.

Current patterns include:

Impossible Travel

Triggered when geographic movement indicates an implausibly high travel speed.

Account Takeover

Triggered by a combination including:

New device

New location

High amount ratio

Velocity Attack

Triggered when the short-window transaction count exceeds the configured threshold.

Card Testing

Detects small probing payments and micro-transaction patterns, including sequences of small amounts followed by a larger transaction.

This distinction is important:

Risk Score
    ≠
Fraud Pattern

A transaction can have a risk score based on several signals while also being assigned a specific detected pattern.

13. AI Investigation Agent

Sentinel contains an AI investigation layer implemented in:

backend/engine/ai_agent.py

The agent uses the Anthropic Claude API when an API key is configured.

The investigation receives structured evidence including:

Transaction information

User profile

Average transaction amount

Account age

Known devices

Known locations

Computed risk features

Recent transaction history

The expected AI output contains:

summary
key_findings
risk_assessment
recommendation
confidence

Recommendations are constrained to:

ALLOW
HOLD
ESCALATE

The implementation currently uses the Claude Sonnet 4.6 model when the Anthropic API is available.

14. AI Failure Fallback

A major reliability feature is the deterministic fallback.

If:

ANTHROPIC_API_KEY is missing

the Claude API fails

the API times out

the AI response cannot be parsed

Sentinel falls back to a deterministic investigation report.

The fallback derives findings from the same computed risk signals.

This means the application can continue demonstrating its investigation workflow without making the entire application dependent on an external AI API.

15. Human-in-the-Loop Decisions

The backend implements analyst decision handling.

Supported analyst actions are:

APPROVE
REJECT
ESCALATE

These map to transaction states:

APPROVE  → cleared
REJECT   → held
ESCALATE → under_review

An optional override reason can be stored when the analyst's action differs from the AI recommendation.

This creates the intended workflow:

Risk Detection
      ↓
AI Investigation
      ↓
AI Recommendation
      ↓
Human Analyst
      ↓
APPROVE / REJECT / ESCALATE
      ↓
Audit Event

16. Audit Logging

Important system events are persisted in the audit_events table.

The current audit API supports:

Retrieving audit events

Filtering by transaction ID

Pagination

Ordering by creation time

Audit records are linked to transactions where applicable.

The purpose is to preserve:

What happened

Which transaction was involved

What event occurred

Additional event details

When it occurred

17. Database

The current application uses SQLite.

Database file:

sentinel/backend/sentinel.db

The backend initializes the database when the FastAPI application starts.

Current database tables include:

users

Stores:

User ID

Name

Home city

Average transaction amount

Account age

Known devices

Known locations

transactions

Stores:

Transaction ID

User ID

Amount

City

Device

Timestamp

Scenario type

Risk score

Risk level

Status

features

Stores computed risk features associated with transactions.

investigations

Stores:

Investigation ID

Transaction ID

Summary

Key findings

Recommendation

Confidence

Creation time

decisions

Stores:

Decision ID

Transaction ID

Analyst action

Override reason

Creation time

audit_events

Stores:

Audit event ID

Transaction ID

Event type

Details

Creation time

18. Backend API

The FastAPI application is created in:

sentinel/backend/main.py

The API currently registers route modules for:

transactions
investigate
approvals
audit
dashboard

Health check

GET /health

Expected response:

{
  "status": "ok"
}

Dashboard

GET /dashboard/summary

Returns dashboard metrics and time-series information.

Transactions

GET /transactions
GET /transactions/{id}
POST /transactions/simulate

Transaction listing supports pagination and risk-level filtering.

Investigation

POST /transactions/{id}/investigate

Runs an investigation, stores the investigation result, and records an audit event.

Analyst decision

POST /transactions/{id}/decision

Records an analyst action and updates transaction status.

Audit log

GET /audit-log

Supports optional transaction filtering and pagination.

19. CORS / Local Development

The backend currently allows the local Vite development ports:

localhost:5173
localhost:5174
localhost:5175
localhost:5176

and corresponding 127.0.0.1 ports.

The frontend API client uses:

VITE_API_URL

and falls back to:

http://localhost:8000

when the variable is not configured.

20. Environment Variables

The backend provides:

backend/.env.example

The AI investigation layer expects:

ANTHROPIC_API_KEY

If the key is unavailable, the investigation system uses its deterministic fallback.

The frontend can optionally use:

VITE_API_URL

to point to the backend API.

Do not commit real API keys or secrets.

21. Testing

The backend contains tests for:

test_features.py
test_integration.py
test_patterns.py
test_risk_engine.py

The testing focus is currently on:

Feature calculation

Fraud pattern detection

Risk scoring

Backend integration behavior

This is intentionally focused on the core risk engine rather than attempting to test every UI element.

22. Current Technology Stack

Frontend

React
TypeScript
Vite
React Router
TanStack React Query
Axios
Tailwind CSS
Recharts
Lucide React

Backend

Python
FastAPI
Pydantic
SQLite
Anthropic Python SDK
python-dotenv

AI

Anthropic Claude API
Claude Sonnet 4.6
Deterministic fallback investigation

23. Current End-to-End Workflow

The implemented system is designed around this workflow:

                 TRANSACTION
                      │
                      ▼
             Feature Engineering
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Amount Ratio   New Device   New Location
        │             │             │
        └─────────────┼─────────────┘
                      ▼
               Velocity / Geo
                      │
                      ▼
                Risk Engine
                      │
                      ▼
              Risk Score 0–100
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
       Risk Level          Pattern Detection
                              │
                              ▼
                    Explainable Findings
                              │
                              ▼
                    AI Investigation
                     │            │
                Claude API      Fallback
                     │            │
                     └─────┬──────┘
                           ▼
                    Recommendation
                    ALLOW / HOLD /
                       ESCALATE
                           │
                           ▼
                    Human Decision
                           │
                           ▼
                       Database
                           │
                           ▼
                     Audit Event

24. Demo Workflow

The strongest current demonstration path is:

Step 1 — Dashboard

Show the overall transaction/risk situation.

Step 2 — Simulator

Select a scenario such as:

Account Takeover

or:

Impossible Travel

Step 3 — Watch the pipeline

Show:

Transaction
→ Feature calculation
→ Risk scoring
→ Pattern detection
→ Investigation

Step 4 — Review the result

Show:

Risk score

Risk level

Explanation

Detected pattern

Investigation

Recommendation

Step 5 — Human decision

Use:

APPROVE
REJECT
ESCALATE

Step 6 — Audit Log

Show that the decision and investigation activity were recorded.

This demonstrates the core Sentinel concept without requiring a real payment processor.

25. Current Limitations / Work in Progress

The following should NOT currently be presented as fully implemented unless they are added in a future change:

A trained ML fraud-classification model

A separate Analytics page

A dedicated Risk Alerts page

A dedicated AI chat assistant

A full standalone Investigation page/route

Production payment-provider integration

Production authentication/RBAC

Cloud deployment

Real-time streaming transaction ingestion

Enterprise-scale database infrastructure

Production-grade fraud-model evaluation against a labeled external dataset

The current risk engine is deterministic and explainable. The current AI investigation layer is the component using Claude.

26. Development Philosophy

Sentinel is currently optimized for:

Clear fraud/risk reasoning

Explainability

Demonstrable end-to-end workflow

Human control over automated decisions

Reliable local development

Graceful AI failure

Simple architecture

Testable risk logic

The project intentionally separates:

Deterministic Risk Logic

from:

Generative AI Investigation

This keeps the critical scoring and evidence generation predictable while allowing Claude to provide a richer investigation narrative.

27. Future Development Roadmap

Potential next-stage improvements include:

Priority 1

Refine the Risk Command Center UI

Add a dedicated transaction investigation route

Improve dashboard visual hierarchy

Improve simulator result presentation

Add richer transaction filtering

Priority 2

Add a dedicated Alerts view

Add Analytics page

Add investigation history

Add richer audit filtering

Priority 3

Add an AI analyst chat interface

Add a trained ML fraud model

Add model evaluation metrics

Add external fraud datasets

Add authentication/RBAC

Add production database/deployment

Future features should be added without replacing the existing deterministic risk and fallback architecture.

28. Important Disclaimer

Sentinel AI Risk Manager is a project/prototype for demonstrating fraud-risk detection, investigation, explainability, and human-in-the-loop workflows.

It is not a production financial fraud-detection system and its risk scores should not be treated as real financial decisions.

The estimated loss-prevention metric is an application estimate, not a verified financial-loss measurement.

Repository

GitHub:

https://github.com/syboy191-arch/Sentinel-AI-Risk-Manager

Local development frontend:

http://localhost:5173

Local development backend:

http://localhost:8000
