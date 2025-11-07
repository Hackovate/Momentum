# 🧠 Momentum — AI-Based Student Productivity Assistant

## 🚀 Overview

Momentum is an AI-powered personal productivity platform for students that integrates:

- 📘 Academic management
- 💡 Skill development
- 💰 Financial tracking
- 🧠 AI-based adaptive daily planning

The goal is to create a context-aware learning system that dynamically builds and adjusts schedules, skill learning, and savings advice using Gemini AI and ChromaDB for reasoning and memory.

---

## 🧩 High-Level Architecture

```
React Frontend

↓

Express Backend (Node.js + Prisma + PostgreSQL)

↓

Momentum AI Microservice (Python + FastAPI + Gemini API + ChromaDB)

↓

Gemini → reasoning engine
ChromaDB → vector semantic memory
```

### Roles

- React → UI for onboarding chat, daily planner, finance dashboard.
- Express → REST API for frontend + orchestrator between PostgreSQL and AI service.
- PostgreSQL → stores structured data (users, tasks, finance, skills).
- ChromaDB → stores vector embeddings (semantic memory).
- FastAPI AI service → runs all reasoning logic (Gemini API + Chroma integration).

---

## 🧱 Database Summary (Postgres via Prisma)

Core Models:

- `User` — master entity.
- `Academic`, `Course`, `Assignment`, `Exam`, `AttendanceRecord` — academic data.
- `Skill`, `Milestone`, `LearningResource`, `AIRecommendation` — skill learning.
- `Finance`, `SavingsGoal`, `MonthlyBudget`, `FinanceInsight` — income, expenses, goals.
- `AIPlan`, `AIFeedback`, `AIMemory` — AI-generated plans, feedback, and vector memory links.
- `Lifestyle`, `Journal` — well-being & notes.

---

## 💬 Conversational Onboarding (AI)

- AI asks structured + dynamic questions (schedule, skills, income, etc.).
- User answers saved in PostgreSQL → structured user profile.
- Conversation embeddings saved in ChromaDB → semantic recall.

Rule of thumb:

- PostgreSQL → facts & structured data
- ChromaDB → conversations & meaning

---

## 🗓️ Daily Planner Flow

1. Express gets user’s data (tasks, classes, preferences) from Postgres.
2. Sends it to the AI service (`/plan`).
3. AI service:
   - Retrieves related memory from Chroma.
   - Uses Gemini to generate an optimized daily plan (academics + skills + rest).
   - Returns structured JSON schedule.
4. Express stores this JSON in `AIPlan`.
5. React displays it in the user dashboard.

---

## 💰 Finance AI Flow

1. Express retrieves user finance data (income, expenses, goals).
2. Sends to AI service (`/finance/analyze`).
3. AI (Gemini) analyzes patterns & returns:

```json
{
  "summary": "You saved 22% of your income.",
  "saving_suggestion": "Reduce dining out by 15%",
  "recommendations": ["Automate 10% savings", "Limit entertainment budget"]
}
```

4. Result saved in `FinanceInsight`.
5. React shows it in the finance dashboard.

---

## 🔁 Feedback Loop (Learning)

- When tasks are completed, Express logs them in Postgres (`AIFeedback`).
- Periodic training (`train_policy.py`) updates an ML model (LightGBM) for personalized schedule generation.
- Next-day plans use these learned behavior weights.

---

## 🧠 ChromaDB Memory

- Stores vector embeddings for:
  - Onboarding chats
  - Notes / syllabus
  - Journals
  - Finance summaries
- Linked to `AIMemory` in Postgres via `chromaId` and `metadata`.

---

## ⚙️ AI Microservice Endpoints

| Endpoint             | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `/onboarding/start`  | Start chat-based onboarding                              |
| `/onboarding/answer` | Handle user reply, trigger Gemini, store structured data |
| `/ingest`            | Save syllabus, notes, or finance summaries to Chroma     |
| `/plan`              | Generate daily study + skill plan                        |
| `/rebalance`         | Reschedule missed tasks                                  |
| `/complete`          | Log task completion feedback                             |
| `/finance/analyze`   | Analyze income/expenses for savings tips                 |
| `/health`            | Health check                                             |

All responses are structured JSON, never raw text.

---

## 🧰 Development Rules for Cursor / Copilot

1. Never call Gemini or Chroma directly from Express — always go through the FastAPI AI microservice.
2. Always store structured data in Postgres — use Prisma ORM.
3. AI service logic pattern:

```python
@router.post("/plan")
def generate_plan(data: PlanRequest):
    # 1. Retrieve user memory from Chroma
    # 2. Build prompt using user data
    # 3. Call Gemini API
    # 4. Return JSON schedule
```

4. Frontend calls Express, not the AI service directly.
5. AI responses must be valid JSON, containing:

```json
{
  "summary": "",
  "schedule": [],
  "recommendations": []
}
```

6. Chroma usage pattern:
   - `add()` during onboarding or document upload.
   - `query()` before Gemini calls to get relevant memory snippets.

---

## 🔐 Security Guidelines

- Only summaries/embeddings go to Gemini (no raw data).
- Chroma stores semantic vectors, not raw text.
- Use `.env` for API keys (`GEMINI_API_KEY`, `CHROMA_URL`, `DATABASE_URL`).
- All services must include `/health` endpoint for monitoring.

---

## 🧩 Suggested Directory Layout

```
momentum/
├── backend/ (Express + Prisma)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── user.routes.ts
│   │   │   ├── ai.routes.ts  # Connects to FastAPI
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── services/
│   │   │   └── ai.service.ts
│   └── .env
│
├── ai-service/ (Python + FastAPI)
│   ├── routers/
│   │   ├── onboarding.py
│   │   ├── planner.py
│   │   ├── finance.py
│   ├── core/
│   │   ├── chroma_client.py
│   │   ├── gemini_client.py
│   │   ├── plan_model.py
│   ├── .env
│
├── client/ (React)
│   ├── components/
│   │   ├── OnboardingChat.tsx
│   │   ├── DailyPlanner.tsx
│   │   ├── FinanceDashboard.tsx
│   └── api/
│       └── backend.ts
```

---

## 🧠 TL;DR for Cursor AI

You’re working on Momentum, an AI productivity platform.

- Use Postgres + Prisma for data storage.
- Use FastAPI + Gemini + Chroma for AI logic.
- Keep Express as the bridge between Frontend ↔ AI.
- Store structured data in Postgres and semantic memory in Chroma.
- All AI responses must be structured JSON.
- Do not mix backend and AI responsibilities.

---

## ✅ Cursor’s Goal

Cursor should:

- Autocomplete routes in Express that call FastAPI endpoints.
- Generate FastAPI routes that talk to Gemini & Chroma.
- Use Prisma ORM correctly.
- Suggest clean, modular code aligned with this architecture.
- Understand that Postgres = facts, Chroma = meaning, Gemini = reasoning.


