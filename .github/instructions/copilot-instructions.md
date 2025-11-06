---
applyTo: "**"
---

# 🧠 Project Context for GitHub Copilot

## 🚀 Project: Momentum — AI-Based Student Productivity Assistant

**Momentum** is an intelligent AI-powered productivity platform designed to help students organize academics, skills, and finances.  
It generates personalized daily routines, learns from behavior, and provides actionable insights.

---

## ⚙️ Tech Stack Overview

| Layer               | Tech                                                            |
| ------------------- | --------------------------------------------------------------- |
| **Frontend**        | React + Vite, TailwindCSS, shadcn/ui                            |
| **Backend**         | Node.js (Express) + Prisma ORM + PostgreSQL                     |
| **AI Microservice** | FastAPI (Python) + Gemini API + ChromaDB + LangChain            |
| **ML Layer**        | scikit-learn / LightGBM (for reinforcement learning)            |
| **Infrastructure**  | REST APIs, `.env` configs                      |
| **Hosting**         | Vercel (Frontend), Render/Railway (Backend), Cloud Run/EC2 (AI) |

---

## 🧩 Architecture Summary

```
React Frontend (Vite)
    ↓ REST API
Express Backend (Prisma + PostgreSQL)
    ↓ REST API
Momentum AI Microservice (FastAPI + Gemini + ChromaDB)
    ↓
    ├─ Gemini API → reasoning and generation
    └─ ChromaDB → semantic memory (syllabus, notes, chat, finance summaries)
```

---

## 🧱 Database (PostgreSQL via Prisma)

Core tables include:

| Category           | Tables                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| **User**           | `User`, `Lifestyle`, `Journal`                                                  |
| **Academics**      | `Academic`, `Course`, `Assignment`, `Exam`, `ClassSchedule`, `AttendanceRecord` |
| **Skills**         | `Skill`, `Milestone`, `LearningResource`, `AIRecommendation`                    |
| **Finance**        | `Finance`, `SavingsGoal`, `MonthlyBudget`, `FinanceInsight`                     |
| **AI Integration** | `AIPlan`, `AIFeedback`, `AIMemory`, `Task`                                      |
| **System**         | Timestamps, relations, cascading deletes via Prisma                             |

### Key Prisma Models:

- **User**: Central user model with relations to all features
- **Course**: Academic courses with schedules, assignments, exams, and attendance
- **Skill**: Skill tracking with milestones, resources, and AI recommendations
- **Finance**: Income/expense tracking with savings goals and monthly budgets
- **AIMemory**: Stores ChromaDB vector IDs for semantic memory
- **AIPlan**: Stores AI-generated daily plans
- **AIFeedback**: Reinforcement learning feedback for task completion
- **FinanceInsight**: AI-generated financial insights and recommendations
- **Task**: User tasks with type, priority, and estimated time

---

## 💬 Conversational Onboarding

- Users complete onboarding through an **AI chat conversation**.
- AI asks structured and dynamic questions about:
  - Academic load (courses, schedules, assignments)
  - Study hours & preferences
  - Skill-building goals
  - Financial habits
- **Structured outputs** (study preferences, schedule, skill goals, financial baselines) → stored in **PostgreSQL**.
- **Raw chat conversation embeddings** (semantic memory) → stored in **ChromaDB**.
- This lets Gemini recall user context later for personalized reasoning.

**Data Flow:**

- 🗄️ **Postgres** → Facts and structured data (courses, tasks, finances)
- 🧠 **ChromaDB** → Meaning and conversation memory (embeddings)

---

## 🗓️ Daily Planner Flow

1. Frontend requests daily plan from backend
2. Express fetches user data (tasks, classes, preferences) from Postgres
3. Backend sends data to AI service `/plan` endpoint
4. AI retrieves relevant context (syllabus, notes) from ChromaDB
5. Gemini generates optimized daily schedule and recommendations
6. Response (plan JSON) stored in Postgres `AIPlan` table
7. Frontend displays the personalized schedule

---

## 💰 Finance Intelligence Flow

1. User logs income and expenses in Postgres via Express API
2. Express sends summary data to AI service `/finance/analyze`
3. AI uses Gemini to generate financial insights:
   ```json
   {
     "summary": "You saved 20% of income last month.",
     "saving_suggestion": "Reduce dining-out expenses by 15%.",
     "recommendations": ["Use campus meal plan", "Automate savings transfer"]
   }
   ```
4. Result saved in `FinanceInsight` table
5. Frontend displays insights on Finance dashboard

---

## 🔁 Feedback Loop (Reinforcement Learning)

1. User marks task as complete → Express updates Postgres
2. Backend calls AI service `/complete` endpoint
3. AI logs performance data in `AIFeedback` table
4. Weekly script (`train_policy.py`) trains a model to personalize future schedules
5. Model learns user preferences and adjusts recommendations

---

## 🧠 AI Microservice Endpoints

| Endpoint             | Method | Purpose                                                 |
| -------------------- | ------ | ------------------------------------------------------- |
| `/onboarding/start`  | POST   | Starts conversational onboarding                        |
| `/onboarding/answer` | POST   | Receives user answer → AI continues Q&A or saves result |
| `/ingest`            | POST   | Adds syllabus/notes to ChromaDB memory                  |
| `/plan`              | POST   | Generates daily academic + skill plan                   |
| `/rebalance`         | POST   | Reschedules incomplete tasks                            |
| `/complete`          | POST   | Logs task completion feedback                           |
| `/finance/analyze`   | POST   | Analyzes income/expenses for savings advice             |
| `/health`            | GET    | Service health check                                    |

---

## 🧩 Design Rules for Copilot

### Backend (Express + Prisma)

- ✅ **Should orchestrate** communication between Frontend ↔ AI ↔ Postgres
- ✅ Use Prisma for all database operations
- ✅ Validate requests and handle errors gracefully
- ❌ **Never** make direct Gemini or ChromaDB calls here
- ❌ No business logic in routes (use controllers/services)

### AI Service (FastAPI)

- ✅ **Handles all AI reasoning** and context retrieval
- ✅ Always return **structured JSON** responses
- ✅ Use **Gemini API** for reasoning and generation
- ✅ Use **ChromaDB** for semantic memory retrieval
- ✅ Use **LangChain** for document processing and retrieval
- ❌ Never directly access Postgres (use backend API)

### Frontend (React + Vite)

- ✅ Chat UI for onboarding
- ✅ Dashboards for plans, skills, finances, academics
- ✅ **Consume REST APIs** from Express backend only
- ✅ Use **shadcn/ui** components for consistent design
- ✅ Use **TailwindCSS** for styling
- ❌ Never call AI service directly
- ❌ No business logic in components (use hooks/context)

### PostgreSQL (via Prisma)

- ✅ Stores **structured and factual data**
- ✅ Use Prisma ORM for all queries and relations
- ✅ Always use transactions for related updates
- ✅ Use cascading deletes (`onDelete: Cascade`)
- ❌ Never write raw SQL unless absolutely necessary

### ChromaDB

- ✅ Stores **semantic memory** (vector embeddings)
- ✅ Indexed by `user_id` and context type
- ✅ Use for retrieval-augmented generation (RAG)
- ✅ Store metadata with embeddings for filtering
- ❌ Never store PII or sensitive data

### AI Response Format

All AI responses **must** include structured JSON:

```json
{
  "summary": "Brief overview",
  "schedule": [...],
  "suggestions": [...],
  "recommendations": [...]
}
```

---

## 🧰 Example Copilot Tasks

Copilot should be able to:

1. ✅ Generate Express routes calling the AI service
2. ✅ Implement FastAPI endpoints using Gemini API
3. ✅ Write Prisma queries for tasks, skills, and finance data
4. ✅ Build React components for chat onboarding and planner dashboards
5. ✅ Suggest LangChain retrieval strategies and Gemini prompts
6. ✅ Create Prisma migrations for schema changes
7. ✅ Generate TypeScript types from Prisma schema
8. ✅ Implement error handling and validation
9. ✅ Create reusable UI components with shadcn/ui

---

## ⚡ Copilot Should Avoid

- ❌ Mixing Gemini API calls inside Express backend
- ❌ Writing business logic directly in React components
- ❌ Duplicating models (always use Prisma schema as source of truth)
- ❌ Hardcoding API URLs or secrets (use environment variables)
- ❌ Making AI service calls from frontend
- ❌ Storing sensitive data in ChromaDB
- ❌ Using raw SQL instead of Prisma queries
- ❌ Creating duplicate API endpoints

---

## 🔐 Data Privacy & Security

- 🔒 Only **summarized context** sent to Gemini API
- 🔒 Raw user text stored **securely in Postgres**
- 🔒 Embeddings (vectorized data) stored **only in ChromaDB**
- 🔒 Use **environment variables** for all secrets
- 🔒 Implement **JWT authentication** for API routes
- 🔒 **Never log** sensitive user data
- 🔒 Use HTTPS for all external API calls

---

## 📁 Project Structure

```
AI-Student-Life-Dashboard/
├── backend/                 # Express + Prisma backend
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation
│   │   ├── routes/         # API routes
│   │   └── server.ts       # Entry point
│   └── prisma/
│       └── schema.prisma   # Database schema
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── pages/      # Page components
│   │   │   ├── modals/     # Modal dialogs
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── lib/            # Utils, API client
│   │   └── App.tsx         # Main app component
│   └── vite.config.ts
└── momentum-ai/             # FastAPI AI microservice
    ├── ai_service.py       # Main service
    ├── requirements.txt
    └── chroma_db/          # ChromaDB storage
```

---

## 🎯 Development Workflow

1. **Schema Changes**: Update `schema.prisma` → Run `prisma migrate dev` → Run `prisma generate`
2. **Backend Changes**: Update routes/controllers → Test with Postman/Thunder Client
3. **AI Service Changes**: Update endpoints → Test with Python requests
4. **Frontend Changes**: Update components → Test in browser
5. **Integration**: Test full flow Frontend → Backend → AI → Database

---

## 📝 Coding Conventions

- **TypeScript**: Use strict mode, avoid `any` types
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Imports**: Group by external → internal → relative
- **Comments**: Use JSDoc for functions, inline comments for complex logic
- **Error Handling**: Always use try-catch with meaningful error messages
- **API Responses**: Consistent format `{ success, data, error }`

---

## 🚦 Testing Guidelines

- Write unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Mock external services (Gemini API, ChromaDB) in tests
- Use meaningful test descriptions

---

**Last Updated**: November 6, 2025
