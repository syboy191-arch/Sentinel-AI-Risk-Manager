Sentinel AI Risk Manager

> AI-powered fraud detection, risk scoring, investigation, and human-in-the-loop decision platform.

Sentinel AI Risk Manager is a fintech risk-management platform designed to help merchants and financial risk teams detect suspicious transactions, understand why they are risky, investigate them using AI, and make controlled decisions with a complete audit trail.

🚀 Current Features

Risk Detection
- Transaction risk scoring from 0–100
- LOW / MEDIUM / HIGH risk classification
- Amount anomaly detection
- New device detection
- New location detection
- Transaction velocity detection
- Impossible travel detection

Fraud Pattern Detection
- Card testing
- High transaction velocity
- Impossible travel
- Account takeover

AI Investigation
- Claude-powered transaction investigation
- AI-generated investigation summary
- Key findings
- Risk assessment
- Recommended action
- Confidence score
- Deterministic fallback when Claude API is unavailable

Human-in-the-Loop
Risk analysts can:
- Approve transactions
- Reject transactions
- Escalate transactions
- Add an override reason

Audit Trail
Important events are recorded, including:
- Transaction events
- Risk assessment
- AI investigation
- Analyst decisions

Transaction Simulator
The simulator can demonstrate:

- Normal Transaction
- Large Unusual Transaction
- Card Testing Attack
- High Transaction Velocity
- Impossible Travel
- Account Takeover

---

🖥️ Current Frontend

The frontend is built with:

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- Axios
- Tailwind CSS
- Recharts
- Lucide React

Current Pages

```text
/                  → Dashboard
/transactions      → Transactions
/simulator         → Transaction Simulator
/audit-log         → Audit Logs

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
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── seed.py
│   │   ├── requirements.txt
│   │   └── sentinel.db
│   │
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── pages/
│       │   └── App.tsx
│       │
│       ├── package.json
│       ├── package-lock.json
│       └── vite.config.ts
│
└── README.md
```
⚙️ Backend

The backend is built using:

Python
FastAPI
SQLite
Pydantic
Anthropic Claude API

Main backend responsibilities:
Transaction
      ↓
Feature Engineering
      ↓
Risk Engine
      ↓
Risk Score
      ↓
Fraud Pattern Detection
      ↓
Explanation
      ↓
AI Investigation
      ↓
Recommendation
      ↓
Human Decision
      ↓
Audit Log

🧠 Risk Engine

The current risk engine is deterministic and produces a score between 0 and 100.

Risk levels:

0–39     LOW
40–69    MEDIUM
70–100   HIGH

The score considers factors such as:

Transaction amount anomaly
New device
New location
Transaction velocity
Impossible travel

The deterministic approach makes the risk calculation reproducible and explainable.

🤖 AI Investigation

For high-risk transactions, Sentinel can perform an AI investigation using Claude.

The investigation considers structured evidence such as:

Transaction information
User history
Device history
Location history
Transaction velocity
Amount anomaly
Account information
Previous transactions

The AI produces:

Investigation Summary
Key Findings
Risk Assessment
Recommendation
Confidence

Possible recommendations:

ALLOW
HOLD
ESCALATE

If the Claude API is unavailable, Sentinel uses a deterministic fallback so the application can continue functioning.

🗄️ Database

Sentinel currently uses SQLite.

Main database entities include:

users
transactions
features
investigations
decisions
audit_events

🔌 API

Main API areas:

GET  /health

GET  /dashboard/summary

GET  /transactions
GET  /transactions/{id}
POST /transactions/simulate

POST /transactions/{id}/investigate

POST /transactions/{id}/decision

GET  /audit-log

🧪 Testing

The backend contains tests covering important parts of the system, including:

Feature engineering
Risk scoring
Fraud pattern detection
Backend integration

Test files are located in:

sentinel/backend/tests/

🔐 Environment Variables

Create your environment configuration using:

sentinel/backend/.env.example

The AI investigation system can use:

ANTHROPIC_API_KEY

The frontend can optionally use:

VITE_API_URL

▶️ Running the Project
Backend

From:

sentinel/backend/

activate the Python environment and run:

uvicorn main:app --reload

Backend:

http://localhost:8000
Frontend

From:

sentinel/frontend/

run:

npm install
npm run dev

Frontend:

http://localhost:5173

🎯 Project Goal

Sentinel AI Risk Manager demonstrates how an AI-assisted financial risk system can combine:

Risk Detection
      +
Explainable Risk Factors
      +
Fraud Pattern Detection
      +
AI Investigation
      +
Human Approval
      +
Auditability

The project is currently focused on a reliable local prototype and demonstration rather than production financial infrastructure.

🔮 Future Improvements

Potential future features include:

Dedicated Risk Alerts page
Dedicated Analytics page
AI Risk Analyst chat assistant
Trained ML fraud-classification model
Authentication and role-based access
Real-time transaction streaming
Production database
Payment-provider integration
Cloud deployment


One correction from the previous version

I would use **this version** rather than the longer README I generated earlier. It's easier for someone visiting your GitHub repository to understand the project quickly, while still documenting the important architecture and current functionality.

And importantly, it **doesn't falsely claim that you already have a trained ML fraud model**—your current risk engine is deterministic, while Claude is being used for the investigation layer.
