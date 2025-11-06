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

# ---------- Health ----------
@app.get("/health")
def health():
    return {"status":"ok","model":GEMINI_MODEL}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=PORT, reload=True)
