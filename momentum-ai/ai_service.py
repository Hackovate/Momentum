# ai_service.py
import os, json, uuid, time, asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from dateutil import parser
import chromadb
from google import genai
import joblib
import numpy as np
import threading

load_dotenv()

# ENV
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VECTOR_DIR = os.getenv("VECTOR_DIR", "./chroma_db")
POLICY_MODEL_PATH = os.getenv("POLICY_MODEL_PATH", "./models/policy_model.pkl")
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))
PORT = int(os.getenv("PORT", "8001"))

if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY in .env")

# Initialize Google GenAI client (no configure method in newer SDK)
genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Chroma client (updated for new API)
chroma_client = chromadb.PersistentClient(path=VECTOR_DIR)
COLLECTION_NAME = "momentum_docs"
try:
    collection = chroma_client.get_collection(name=COLLECTION_NAME)
except:
    collection = chroma_client.create_collection(name=COLLECTION_NAME)

# Load policy model if exists
policy_model = None
if os.path.exists(POLICY_MODEL_PATH):
    try:
        policy_model = joblib.load(POLICY_MODEL_PATH)
    except Exception as e:
        print("Failed to load policy model:", e)

# simple in-memory websockets manager for push updates
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id].remove(websocket)

    async def send_json(self, user_id: str, data):
        conns = self.active.get(user_id, [])
        for ws in conns:
            try:
                await ws.send_json(data)
            except:
                pass

ws_manager = ConnectionManager()

app = FastAPI(title="Momentum AI microservice")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Pydantic schemas ----------
class DocItem(BaseModel):
    id: Optional[str]
    text: str
    meta: Optional[dict] = {}

class IngestRequest(BaseModel):
    user_id: str
    docs: List[DocItem]

class TimeRange(BaseModel):
    start_iso: str
    end_iso: str

class Task(BaseModel):
    id: Optional[str]
    title: str
    type: Optional[str] = "study"
    subject_id: Optional[str] = None
    estimated_minutes: Optional[int] = 30
    priority: Optional[int] = 3
    deadline_iso: Optional[str] = None
    notes: Optional[str] = None

class PlanRequest(BaseModel):
    user_id: str
    date_iso: str
    available_times: List[TimeRange]
    tasks: List[Task]
    classes: Optional[List[Task]] = []
    preferences: Optional[dict] = {}

class PlanResponse(BaseModel):
    user_id: str
    date_iso: str
    summary: str
    schedule: List[dict]
    suggestions: List[str]
    rebalanced_tasks: List[dict]
    metadata: dict

class CompleteReq(BaseModel):
    user_id: str
    task_id: str
    scheduled_slot_id: Optional[str]
    actual_minutes: int
    outcome: str  # done/partial/missed
    feedback: Optional[str] = None

# ---------- Helpers: embeddings & retrieval ----------
def gemini_embedding(texts: List[str]) -> List[List[float]]:
    """
    Use genai embeddings API with the newer SDK.
    """
    try:
        res = genai_client.models.embed_content(
            model="text-embedding-004",
            contents=texts
        )
        # Extract embedding values from response
        embeddings = []
        for emb_obj in res.embeddings:
            if hasattr(emb_obj, 'values'):
                embeddings.append(emb_obj.values)
            else:
                # Fallback if structure is different
                embeddings.append(list(emb_obj))
        return embeddings
    except Exception as e:
        print(f"Embedding error: {e}")
        # Return zero embeddings as fallback
        return [[0.0] * 768 for _ in texts]

@app.post("/ingest")
def ingest(req: IngestRequest):
    texts = [d.text for d in req.docs]
    embs = gemini_embedding(texts)
    for d, emb in zip(req.docs, embs):
        doc_id = d.id or str(uuid.uuid4())
        # store documents and embeddings; keep user_id in metadata
        collection.add(documents=[d.text], metadatas=[{"user_id": req.user_id, **(d.meta or {})}], ids=[doc_id], embeddings=[emb])
    return {"status": "ok", "count": len(req.docs)}

def retrieve_user_context(user_id: str, query: str, k: int = 3):
    q_emb = gemini_embedding([query])[0]
    res = collection.query(query_embeddings=[q_emb], n_results=k, where={"user_id": user_id})
    docs = []
    for doc_text, meta in zip(res['documents'][0], res['metadatas'][0]):
        docs.append({"text": doc_text, "meta": meta})
    return docs

# ---------- Gemini call ----------
def call_gemini_generate(prompt: str) -> str:
    """
    Generate content using Gemini with fallback to lite model if rate limited.
    """
    fallback_model = "gemini-2.5-flash-lite"
    
    try:
        # Try primary model first
        resp = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        # Extract text from response
        if hasattr(resp, 'text') and resp.text:
            return resp.text
        
        # Fallback extraction methods
        if hasattr(resp, 'candidates') and resp.candidates:
            for candidate in resp.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                return part.text
        
        return str(resp)
        
    except Exception as e:
        print(f"Primary model ({GEMINI_MODEL}) failed: {e}")
        print(f"Retrying with fallback model: {fallback_model}")
        
        try:
            # Try fallback model
            resp = genai_client.models.generate_content(
                model=fallback_model,
                contents=prompt
            )
            
            if hasattr(resp, 'text') and resp.text:
                return resp.text
            
            return str(resp)
            
        except Exception as fallback_error:
            print(f"Fallback model also failed: {fallback_error}")
            return "Error: Unable to generate response from Gemini API"

# ---------- Fallback scheduler ----------
def fallback_scheduler(available_times, tasks, classes):
    windows = [(parser.isoparse(w.start_iso), parser.isoparse(w.end_iso)) for w in available_times]
    schedule = []
    if not windows:
        return schedule
    w_idx = 0
    cur = windows[0][0]
    tasks_sorted = sorted(tasks, key=lambda t: (t.get("priority", 3), t.get("deadline_iso") or "9999"))
    for t in tasks_sorted:
        minutes = int(t.get("estimated_minutes", 30))
        end = cur + timedelta(minutes=minutes)
        if end > windows[w_idx][1]:
            w_idx += 1
            if w_idx >= len(windows):
                break
            cur = windows[w_idx][0]
            end = cur + timedelta(minutes=minutes)
        schedule.append({
            "id": t.get("id", str(uuid.uuid4())),
            "task_id": t.get("id"),
            "title": t.get("title"),
            "type": t.get("type"),
            "start": cur.isoformat(),
            "end": end.isoformat(),
            "priority": t.get("priority"),
            "estimated_minutes": minutes,
            "notes": t.get("notes") or ""
        })
        cur = end
    return schedule

# ---------- Plan endpoint ----------
@app.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    # 1) get context
    context_docs = retrieve_user_context(req.user_id, query=f"{req.user_id} study notes and syllabus", k=3)
    context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""

    # 2) build prompt (strict JSON)
    prompt = f"""
You are Momentum — an intelligent student's daily planner assistant. Return ONLY a valid JSON object exactly matching the schema below.

Context:
{context_text}

INPUT:
date: {req.date_iso}
available_windows: { [w.dict() for w in req.available_times] }
classes: { [c.dict() for c in req.classes] }
tasks: { [t.dict() for t in req.tasks] }
preferences: { req.preferences or {} }

SCHEMA:
{{ "summary": string,
  "schedule": [{{"id","task_id","title","type","start","end","priority","estimated_minutes","notes","score"}}],
  "suggestions": [string],
  "rebalanced_tasks": [{{"original_task_id","new_slot"}}]
}}

Rules:
- Do not overlap with classes.
- Prioritize tasks with earlier deadlines, then higher priority.
- Respect user preferred study times when possible.
- Use ISO8601 datetimes for start/end.
- Output VALID JSON ONLY — no extra text.
"""
    raw = call_gemini_generate(prompt)
    import re
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if not m:
        # fallback
        schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary="Fallback schedule (LLM failed to produce JSON)",
                            schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                            metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})
    try:
        parsed = json.loads(m.group(0))
    except Exception:
        schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary="Fallback schedule (LLM JSON parse error)",
                            schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                            metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})

    # 3) score with policy model if available
    if policy_model is not None:
        for s in parsed.get("schedule", []):
            try:
                start_dt = parser.isoparse(s["start"])
                feat = np.array([[start_dt.hour, start_dt.weekday(), s.get("priority", 3), s.get("estimated_minutes", 30)]])
                if hasattr(policy_model, "predict_proba"):
                    prob = policy_model.predict_proba(feat)[:,1][0]
                else:
                    prob = float(policy_model.predict(feat)[0])
                s["score"] = float(prob)
            except Exception:
                s["score"] = 0.0
        parsed["schedule"].sort(key=lambda x: x.get("score",0), reverse=True)

    # ensure ids
    for item in parsed.get("schedule", []):
        if "id" not in item:
            item["id"] = str(uuid.uuid4())

    # persist policy log and optionally push to frontend (store details in your DB in production)
    # For demo: write a small json to logs/
    os.makedirs("logs", exist_ok=True)
    with open("logs/plan_requests.log", "a") as f:
        f.write(json.dumps({"ts": datetime.utcnow().isoformat(), "user_id": req.user_id, "payload": parsed}) + "\n")

    # send realtime update to frontend (best-effort)
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"plan","payload":parsed}))

    return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                        summary=parsed.get("summary",""),
                        schedule=parsed.get("schedule",[]),
                        suggestions=parsed.get("suggestions",[]),
                        rebalanced_tasks=parsed.get("rebalanced_tasks",[]),
                        metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})

# ---------- Completion logging ----------
@app.post("/complete")
def complete(req: CompleteReq):
    # compute simple reward and append to completions log for offline training
    base = 1.0 if req.outcome == "done" else (0.5 if req.outcome == "partial" else 0.0)
    reward = base  # you can tune with lateness penalties later
    log = {
        "ts": datetime.utcnow().isoformat(),
        "user_id": req.user_id,
        "task_id": req.task_id,
        "scheduled_slot_id": req.scheduled_slot_id,
        "actual_minutes": req.actual_minutes,
        "outcome": req.outcome,
        "feedback": req.feedback,
        "reward": reward
    }
    os.makedirs("logs", exist_ok=True)
    with open("logs/completions.log", "a") as f:
        f.write(json.dumps(log) + "\n")
    # trigger optional immediate small rebalancer (here done synchronously for simplicity)
    # In production enqueue async rebalancer
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"complete","payload":log}))
    return {"status":"ok","reward":reward}

# ---------- Simple rebalance endpoint (deterministic) ----------
@app.post("/rebalance")
def rebalance(req: PlanRequest):
    # greedy pack missed/remaining tasks into available windows
    schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"rebalance","payload":{"schedule":schedule}}))
    return {"status":"ok","schedule": schedule}

# ---------- WebSocket for realtime ----------
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # ping/pong or client messages can be handled (not required)
            await websocket.send_text("ack")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

# ---------- Onboarding Endpoints ----------

# Onboarding state management (in-memory for now)
onboarding_sessions = {}

class OnboardingStartRequest(BaseModel):
    user_id: str
    first_name: Optional[str] = None

class OnboardingAnswerRequest(BaseModel):
    user_id: str
    answer: str

class OnboardingResponse(BaseModel):
    question: Optional[str] = None
    completed: bool = False
    structured_data: Optional[dict] = None
    next_step: Optional[str] = None

@app.post("/onboarding/start", response_model=OnboardingResponse)
async def start_onboarding(request: OnboardingStartRequest):
    """Initialize conversational onboarding with Bangladeshi education context"""
    try:
        user_id = request.user_id
        first_name = request.first_name or "there"
        
        # Initialize session
        onboarding_sessions[user_id] = {
            "stage": "education_level",
            "stage_index": 0,
            "data": {},
            "conversation_history": []
        }
        
        # First question about education level (Bangladeshi context)
        greeting = f"আসসালামু আলাইকুম {first_name}! 👋\n\nI'm here to help you set up Momentum for your academic journey.\n\n"
        question = "Let's start with your education background. Are you currently studying in:\n\n1. স্কুল (School) 🏫\n2. কলেজ (College) 🎓\n3. বিশ্ববিদ্যালয় (University) 🏛️\n4. মাস্টার্স/পিএইচডি (Graduate Studies) 📚\n\nJust type the number or name in English (e.g., '1' or 'school')!"
        
        full_message = greeting + question
        
        # Store in conversation history
        onboarding_sessions[user_id]["conversation_history"].append({
            "role": "assistant",
            "content": full_message
        })
        
        return OnboardingResponse(
            question=full_message,
            completed=False,
            next_step="education_level"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/onboarding/answer", response_model=OnboardingResponse)
async def process_answer(request: OnboardingAnswerRequest):
    """Process user answer and continue conversation"""
    try:
        user_id = request.user_id
        answer = request.answer
        
        if user_id not in onboarding_sessions:
            raise HTTPException(status_code=404, detail="Onboarding session not found. Please start onboarding first.")
        
        session = onboarding_sessions[user_id]
        current_stage = session["stage"]
        
        # Store user's answer
        session["conversation_history"].append({
            "role": "user",
            "content": answer
        })
        
        # Process based on current stage
        if current_stage == "education_level":
            return await handle_education_level(user_id, answer, session)
        elif current_stage == "school_details":
            return await handle_school_details(user_id, answer, session)
        elif current_stage == "school_group":
            return await handle_school_group(user_id, answer, session)
        elif current_stage == "college_details":
            return await handle_college_details(user_id, answer, session)
        elif current_stage == "university_details":
            return await handle_university_details(user_id, answer, session)
        elif current_stage == "graduate_details":
            return await handle_graduate_details(user_id, answer, session)
        elif current_stage == "institution":
            return await handle_institution(user_id, answer, session)
        elif current_stage == "academic_courses":
            return await handle_academic_courses(user_id, answer, session)
        elif current_stage == "study_preferences":
            return await handle_study_preferences(user_id, answer, session)
        elif current_stage == "skill_goals":
            return await handle_skill_goals(user_id, answer, session)
        elif current_stage == "financial_situation":
            return await handle_financial_situation(user_id, answer, session)
        else:
            raise HTTPException(status_code=400, detail="Invalid stage")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_education_level(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle education level question with Bangladeshi context"""
    prompt = f"""
    Extract the education level from this answer: "{answer}"
    
    The user is from Bangladesh. Map their answer to one of: "school", "college", "university", "graduate"
    
    Common variations:
    - school, স্কুল, class, maddrasah, 1
    - college, কলেজ, 2
    - university, বিশ্ববিদ্যালয়, versity, uni, 3
    - graduate, masters, phd, 4
    
    Return ONLY a JSON object like:
    {{"education_level": "school"}}
    """
    
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        # Remove markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(text)
        education_level = result.get("education_level")
        
        session["data"]["education_level"] = education_level
        
        # Ask follow-up based on education level
        if education_level == "school":
            session["stage"] = "school_details"
            question = "Great! Which class are you studying in?\n\nFor example:\n- ক্লাস ৬ (Class 6)\n- ক্লাস ৯ (Class 9)\n- এসএসসি (SSC)\n\nJust type the class number (6, 7, 8, 9, 10, 11, or 12)!"
        
        elif education_level == "college":
            session["stage"] = "college_details"
            question = "Awesome! Which year and group are you in?\n\nFor example:\n- '1st year Science'\n- 'HSC 2nd year Commerce'\n- 'Year 1, Arts'\n\nPlease mention both year (1 or 2) and group (Science/Commerce/Arts)!"
        
        elif education_level == "university":
            session["stage"] = "university_details"
            question = "Excellent! Which year are you in and what's your major/department?\n\nFor example:\n- '2nd year, Computer Science'\n- 'Year 3, BBA'\n- '1st year, English Literature'"
        
        else:  # graduate
            session["stage"] = "graduate_details"
            question = "That's great! What are you studying?\n\nFor example:\n- 'Masters in Economics'\n- 'PhD in Physics'\n- 'MBA'"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step=session["stage"]
        )
        
    except Exception as e:
        question = "I didn't quite catch that. Could you tell me if you're in school (স্কুল), college (কলেজ), university (বিশ্ববিদ্যালয়), or doing graduate studies?"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="education_level"
        )

async def handle_school_details(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle school details (Bangladeshi context)"""
    prompt = f"""
    Extract class information from this answer: "{answer}"
    
    The user is a school student in Bangladesh. Extract:
    1. Class number (6, 7, 8, 9, 10, 11, 12)
    2. Group (only for class 9-12): "science", "commerce", "arts"
    
    Common variations:
    - Class 6, ৬, six, sixth
    - SSC = class 9 or 10
    - HSC = class 11 or 12
    - Science, বিজ্ঞান
    - Commerce, ব্যবসায় শিক্ষা
    - Arts, মানবিক
    
    Return ONLY a JSON object like:
    {{
        "class": "9",
        "group": "science"
    }}
    
    If group is not mentioned and class is 6-8, set group to null.
    """
    
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(text)
        class_num = result.get("class")
        group = result.get("group")
        
        session["data"]["class"] = class_num
        session["data"]["group"] = group
        
        # If class 9-12 but no group mentioned, ask for group
        if class_num in ["9", "10", "11", "12"] and not group:
            question = "Which group are you in?\n\n1. Science (বিজ্ঞান) 🔬\n2. Commerce (ব্যবসায় শিক্ষা) 💼\n3. Arts/Humanities (মানবিক) 📚"
            
            session["conversation_history"].append({
                "role": "assistant",
                "content": question
            })
            
            session["stage"] = "school_group"
            return OnboardingResponse(
                question=question,
                completed=False,
                next_step="school_group"
            )
        
        # Move to institution
        session["stage"] = "institution"
        question = "What's the name of your school? 🏫\n\nFor example: 'Dhaka Residential Model College', 'Rajuk Uttara Model College'"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="institution"
        )
        
    except Exception as e:
        question = "Please tell me which class you're in (6, 7, 8, 9, 10, 11, or 12)?"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="school_details"
        )

async def handle_school_group(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle school group selection"""
    prompt = f"""
    Extract group from this answer: "{answer}"
    
    Map to one of: "science", "commerce", "arts"
    
    Common variations:
    - Science, বিজ্ঞান, sci, 1
    - Commerce, ব্যবসায় শিক্ষা, business, 2
    - Arts, মানবিক, humanities, 3
    
    Return ONLY a JSON object like:
    {{"group": "science"}}
    """
    
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(text)
        group = result.get("group")
        session["data"]["group"] = group
        
        session["stage"] = "institution"
        question = "What's the name of your school? 🏫"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="institution"
        )
        
    except Exception as e:
        question = "Please tell me your group: Science (বিজ্ঞান), Commerce (ব্যবসায় শিক্ষা), or Arts (মানবিক)?"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="school_group"
        )

async def handle_college_details(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle college details (Bangladeshi context)"""
    prompt = f"""
    Extract college information from this answer: "{answer}"
    
    The user is a college student in Bangladesh (HSC level). Extract:
    1. Year: 1 or 2 (1st year or 2nd year)
    2. Group: "science", "commerce", "arts"
    
    Common variations:
    - 1st year, first year, HSC 1st year, 1, one
    - 2nd year, second year, HSC 2nd year, 2, two
    - Science, বিজ্ঞান
    - Commerce, ব্যবসায় শিক্ষা
    - Arts, মানবিক
    
    Return ONLY a JSON object like:
    {{
        "year": 1,
        "group": "science"
    }}
    """
    
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(text)
        year = result.get("year")
        group = result.get("group")
        
        session["data"]["year"] = year
        session["data"]["group"] = group
        
        session["stage"] = "institution"
        question = "What's the name of your college? 🎓\n\nFor example: 'Notre Dame College', 'Dhaka City College'"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="institution"
        )
        
    except Exception as e:
        question = "Please tell me which year (1 or 2) and group (Science/Commerce/Arts) you're in?"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="college_details"
        )

async def handle_university_details(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle university details"""
    prompt = f"""
    Extract university information from this answer: "{answer}"
    
    Extract:
    1. Year of study: 1, 2, 3, or 4
    2. Major/Department
    
    Common variations:
    - 1st year, first year, fresher, 1
    - Computer Science, CSE, CS
    - BBA, Business Administration
    - Economics, English, Physics, etc.
    
    Return ONLY a JSON object like:
    {{
        "year": 2,
        "major": "Computer Science"
    }}
    """
    
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(text)
        year = result.get("year")
        major = result.get("major")
        
        session["data"]["year"] = year
        session["data"]["major"] = major
        
        session["stage"] = "institution"
        question = "Which university are you attending? 🏛️\n\nFor example: 'Dhaka University', 'BUET', 'NSU'"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="institution"
        )
        
    except Exception as e:
        question = "Please tell me which year you're in and what you're studying?"
        
        session["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        
        return OnboardingResponse(
            question=question,
            completed=False,
            next_step="university_details"
        )

async def handle_graduate_details(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle graduate studies details"""
    session["data"]["major"] = answer.strip()
    
    session["stage"] = "institution"
    question = "Which university/institution are you studying at?"
    
    session["conversation_history"].append({
        "role": "assistant",
        "content": question
    })
    
    return OnboardingResponse(
        question=question,
        completed=False,
        next_step="institution"
    )

async def handle_institution(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle institution name"""
    session["data"]["institution"] = answer.strip()
    session["stage"] = "academic_courses"
    
    education_level = session["data"].get("education_level", "")
    
    if education_level == "school":
        class_num = session["data"].get("class", "")
        question = f"Perfect! Now let's talk about your subjects. 📚\n\nWhat subjects are you studying in Class {class_num}?\n\nFor example:\n- Bangla, English, Math, Physics, Chemistry\n- বাংলা, ইংরেজি, গণিত, পদার্থবিজ্ঞান"
    
    elif education_level == "college":
        question = "Great! What subjects are you studying in HSC?\n\nFor example:\n- Physics, Chemistry, Higher Math, Biology\n- পদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত"
    
    else:
        question = "Excellent! What courses are you taking this semester? 📚\n\nList the course names and codes if you have them.\n\nFor example:\n- Data Structures (CSE205)\n- Digital Logic Design\n- Microeconomics"
    
    session["conversation_history"].append({
        "role": "assistant",
        "content": question
    })
    
    return OnboardingResponse(
        question=question,
        completed=False,
        next_step="academic_courses"
    )

async def handle_academic_courses(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle course list extraction"""
    if answer.lower() in ["none", "skip", "no"]:
        session["data"]["courses"] = []
    else:
        prompt = f"""
        Extract course/subject information from this answer: "{answer}"
        
        Return ONLY a JSON array like:
        [
            {{
                "courseName": "Introduction to Python",
                "courseCode": "CS101",
                "credits": 3
            }},
            {{
                "courseName": "Calculus II",
                "courseCode": null,
                "credits": 4
            }}
        ]
        
        Estimate credits if not mentioned (usually 3-4 per course).
        For school subjects, set credits to 0.
        """
        
        try:
            response = genai_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            courses = json.loads(text)
            session["data"]["courses"] = courses
        except:
            session["data"]["courses"] = []
    
    session["stage"] = "study_preferences"
    question = "Great! 📖 Now let's understand your study habits.\n\nHow many hours per day do you usually prefer to study, and what time of day works best for you?\n\nFor example: 'I prefer studying 3 hours a day, mostly in the evening'"
    
    session["conversation_history"].append({
        "role": "assistant",
        "content": question
    })
    
    return OnboardingResponse(
        question=question,
        completed=False,
        next_step="study_preferences"
    )

async def handle_study_preferences(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle study preferences"""
    session["data"]["study_preferences"] = {"raw_answer": answer}
    
    session["stage"] = "skill_goals"
    question = "Awesome! 🎯 Let's talk about skills you want to build.\n\nAre there any skills you'd like to learn or improve? (e.g., programming, design, languages, etc.)\n\nYou can list multiple skills, or type 'none' if you want to skip this for now."
    
    session["conversation_history"].append({
        "role": "assistant",
        "content": question
    })
    
    return OnboardingResponse(
        question=question,
        completed=False,
        next_step="skill_goals"
    )

async def handle_skill_goals(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle skill goals"""
    if answer.lower() in ["none", "skip", "no", "nope"]:
        session["data"]["skills"] = []
    else:
        prompt = f"""
        Extract skills from this answer: "{answer}"
        
        Return ONLY a JSON array like:
        [
            {{
                "name": "Python Programming",
                "category": "programming",
                "level": "beginner"
            }},
            {{
                "name": "Graphic Design",
                "category": "design",
                "level": "intermediate"
            }}
        ]
        
        Estimate the category and current level based on context.
        """
        
        try:
            response = genai_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            skills = json.loads(text)
            session["data"]["skills"] = skills
        except:
            session["data"]["skills"] = []
    
    session["stage"] = "financial_situation"
    question = "Almost done! 💰 Let's briefly talk about finances.\n\nDo you have any regular income (allowance, part-time job, etc.)? And what are your typical monthly expenses?\n\nFor example: 'I get 5000 taka monthly allowance and spend about 3000 on food and transport'\n\nOr type 'skip' if you prefer not to share now."
    
    session["conversation_history"].append({
        "role": "assistant",
        "content": question
    })
    
    return OnboardingResponse(
        question=question,
        completed=False,
        next_step="financial_situation"
    )

async def handle_financial_situation(user_id: str, answer: str, session: dict) -> OnboardingResponse:
    """Handle financial information and complete onboarding"""
    if answer.lower() not in ["skip", "none", "no"]:
        prompt = f"""
        Extract financial information from this answer: "{answer}"
        
        Return ONLY a JSON object like:
        {{
            "monthly_income": 5000,
            "monthly_expenses": 3000,
            "income_sources": ["allowance"],
            "expense_categories": ["food", "transport"]
        }}
        
        Convert amounts to numbers. Extract categories from context.
        """
        
        try:
            response = genai_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            finances = json.loads(text)
            session["data"]["finances"] = finances
        except:
            session["data"]["finances"] = {"raw_answer": answer}
    else:
        session["data"]["finances"] = None
    
    # Mark as complete
    session["stage"] = "complete"
    
    # Store conversation embeddings in ChromaDB
    await store_onboarding_conversation(user_id, session["conversation_history"])
    
    # Return structured data for backend to save
    return OnboardingResponse(
        question="🎉 All done! Your Momentum dashboard is being set up...",
        completed=True,
        structured_data=session["data"],
        next_step="complete"
    )

async def store_onboarding_conversation(user_id: str, conversation: list):
    """Store conversation in ChromaDB for future context"""
    try:
        # Create conversation text
        conversation_text = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in conversation
        ])
        
        # Store in ChromaDB
        doc_id = f"onboarding_{user_id}_{datetime.now().isoformat()}"
        
        collection.add(
            documents=[conversation_text],
            ids=[doc_id],
            metadatas=[{
                "user_id": user_id,
                "type": "onboarding",
                "timestamp": datetime.now().isoformat()
            }]
        )
        
    except Exception as e:
        print(f"Error storing conversation: {e}")

# ---------- Health ----------
@app.get("/health")
def health():
    return {"status":"ok","model":GEMINI_MODEL}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=PORT, reload=True)
