# models.py
from typing import List, Optional
from pydantic import BaseModel

# Document ingestion models
class DocItem(BaseModel):
    id: Optional[str]
    text: str
    meta: Optional[dict] = {}

class IngestRequest(BaseModel):
    user_id: str
    docs: List[DocItem]

# Planning models
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

# Onboarding models
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

# Chat models
class ChatRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    message: str
    conversation_history: Optional[List[dict]] = []
    structured_context: Optional[str] = None

class ChatAction(BaseModel):
    type: str  # "update_user", "add_course", "add_skill", etc.
    data: dict  # The data to update

class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None
    actions: Optional[List[ChatAction]] = []  # Actions AI wants to perform

