# Setup Guide - Momentum AI Student Dashboard

Complete setup guide for Backend, Client, and AI Service on a new PC.

## Prerequisites

Install these before starting:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Python 3.11** - [Download](https://www.python.org/downloads/)
- **Git** (optional, for cloning)

---

## 1. Backend Setup (Node.js/Express)

### Step 1: Install Dependencies
```powershell
cd backend
npm install
```

### Step 2: Create PostgreSQL Database
```sql
-- Open PostgreSQL (pgAdmin or psql)
CREATE DATABASE student_dashboard;
```

### Step 3: Configure Environment
Create `backend/.env` file:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/student_dashboard"
PORT=5000
JWT_SECRET="your-secret-key-change-in-production"
CLIENT_URL="http://localhost:3000"
AI_SERVICE_URL="http://localhost:8001"
```

**Replace `YOUR_PASSWORD` with your PostgreSQL password.**

### Step 4: Setup Database
```powershell
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### Step 5: Start Backend
```powershell
npm run server
```

Backend runs on: `http://localhost:5000`

---

## 2. AI Service Setup (Python/FastAPI)

### Step 1: Navigate to AI Service Directory
```powershell
cd momentum-ai
```

### Step 2: Create Virtual Environment
```powershell
# Windows
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Configure Environment
Create `momentum-ai/.env` file:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.5-flash"
VECTOR_DIR="./chroma_db"
PORT=8001
TEMPERATURE=0.1
```

**Get your Gemini API key from:** [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 5: Start AI Service
```powershell
# Make sure virtual environment is activated
uvicorn ai_service:app --reload --port 8001
```

AI Service runs on: `http://localhost:8001`

---

## 3. Client Setup (React/Vite)

### Step 1: Install Dependencies
```powershell
cd client
npm install
```

### Step 2: Configure Environment
Create `client/.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Client
```powershell
npm run dev
```

Client runs on: `http://localhost:3000`

---

## 4. Verify Setup

### Check All Services Are Running:

1. **Backend**: `http://localhost:5000/api/health`
   - Should return: `{"status": "OK"}`

2. **AI Service**: `http://localhost:8001/health`
   - Should return: `{"status": "ok", "model": "gemini-2.5-flash"}`

3. **Client**: `http://localhost:3000`
   - Should show the landing page

---

## Quick Start Commands

Open **3 separate terminal windows**:

### Terminal 1 - Backend:
```powershell
cd backend
npm run server
```

### Terminal 2 - AI Service:
```powershell
cd momentum-ai
.venv\Scripts\Activate.ps1
uvicorn ai_service:app --reload --port 8001
```

### Terminal 3 - Client:
```powershell
cd client
npm run dev
```

---

## Troubleshooting

### PostgreSQL Connection Error
- Ensure PostgreSQL service is running
- Check password in `backend/.env` matches your PostgreSQL password
- Verify database `student_dashboard` exists

### Port Already in Use
- Backend (5000): Change `PORT` in `backend/.env`
- AI Service (8001): Change `PORT` in `momentum-ai/.env`
- Client (3000): Change in `client/vite.config.ts`

### Python Virtual Environment Issues
- Make sure you're using Python 3.11
- Activate venv before running: `.venv\Scripts\Activate.ps1` (Windows)
- Reinstall if needed: `pip install -r requirements.txt`

### Missing Gemini API Key
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add to `momentum-ai/.env` as `GEMINI_API_KEY`

### CORS Errors
- Ensure all services are running
- Check `CLIENT_URL` in `backend/.env` matches client URL
- Verify `VITE_API_URL` in `client/.env` matches backend URL

---

## Project Structure

```
AI-Student-Life-Dashboard/
├── backend/          # Node.js/Express API (Port 5000)
├── client/           # React/Vite Frontend (Port 3000)
└── momentum-ai/      # Python/FastAPI AI Service (Port 8001)
```

---

## Environment Variables Summary

### Backend (`backend/.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Backend port (default: 5000)
- `JWT_SECRET` - Secret for JWT tokens
- `CLIENT_URL` - Frontend URL
- `AI_SERVICE_URL` - AI service URL

### AI Service (`momentum-ai/.env`)
- `GEMINI_API_KEY` - **Required** - Google Gemini API key
- `GEMINI_MODEL` - Model name (default: gemini-2.5-flash)
- `PORT` - AI service port (default: 8001)

### Client (`client/.env`)
- `VITE_API_URL` - Backend API URL

---

## Next Steps

1. ✅ All services running
2. ✅ Open `http://localhost:3000` in browser
3. ✅ Register a new account
4. ✅ Complete onboarding
5. ✅ Start using the dashboard!

---

## Need Help?

- Check service logs in terminal windows
- Verify all environment variables are set
- Ensure all ports are available
- Check database connection

