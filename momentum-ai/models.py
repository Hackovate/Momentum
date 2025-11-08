# models.py
from typing import List, Optional, Union
from pydantic import BaseModel, Field, model_validator

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
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    type: Optional[str] = "study"
    subject_id: Optional[str] = None
    estimated_minutes: Optional[int] = 30
    estimated_hours: Optional[float] = None
    estimatedHours: Optional[float] = None  # Accept both snake_case and camelCase
    priority: Optional[Union[str, int]] = "medium"  # Accept string (high/medium/low) or int
    deadline_iso: Optional[str] = None
    dueDate: Optional[str] = None  # Accept camelCase version (maps to deadline_iso)
    startDate: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    progressPercentage: Optional[float] = None
    actualMinutesSpent: Optional[int] = None
    daysAllocated: Optional[int] = None
    currentDay: Optional[int] = None
    sourceId: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def sync_fields(cls, data):
        # If dueDate is provided but deadline_iso is not, use dueDate
        if isinstance(data, dict):
            if data.get('dueDate') and not data.get('deadline_iso'):
                data['deadline_iso'] = data['dueDate']
            # Sync estimatedHours to estimated_hours if needed
            if data.get('estimatedHours') and not data.get('estimated_hours'):
                data['estimated_hours'] = data['estimatedHours']
        return data
    
    class Config:
        # Ignore extra fields that might be sent
        extra = "ignore"
        # Allow population by field name (for backward compatibility)
        populate_by_name = True

class PlanRequest(BaseModel):
    user_id: str
    date_iso: str
    available_times: List[TimeRange]
    tasks: List[Task]
    classes: Optional[List[Task]] = []
    preferences: Optional[dict] = {}
    user_profile: Optional[dict] = {}
    task_patterns: Optional[List[dict]] = []
    completion_history: Optional[dict] = {}

class PlanResponse(BaseModel):
    user_id: str
    date_iso: str
    summary: str
    schedule: List[dict]
    suggestions: List[str]
    rebalanced_tasks: List[dict] = []
    shifted_tasks: List[dict] = []  # Tasks shifted to next day with new dates
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

# Syllabus task generation models
class GenerateSyllabusTasksRequest(BaseModel):
    user_id: str
    course_id: str
    syllabus_text: str
    months: int

class SyllabusTask(BaseModel):
    title: str
    description: Optional[str] = None
    startDate: Optional[str] = None
    dueDate: Optional[str] = None
    estimatedHours: Optional[float] = None

class GenerateSyllabusTasksResponse(BaseModel):
    tasks: List[SyllabusTask]

