# routes/planning.py
import json
import uuid
import asyncio
import os
from datetime import datetime
from dateutil import parser
import numpy as np
import joblib
from fastapi import APIRouter
from models import PlanRequest, PlanResponse, CompleteReq
from database import collection
from ai_client import call_gemini_generate
from scheduler import fallback_scheduler
from websocket_manager import ws_manager
from utils import retrieve_user_context, polish_context, format_context_for_prompt
from config import GEMINI_MODEL, POLICY_MODEL_PATH

router = APIRouter()

# Load policy model if exists
policy_model = None
if os.path.exists(POLICY_MODEL_PATH):
    try:
        policy_model = joblib.load(POLICY_MODEL_PATH)
    except Exception as e:
        print("Failed to load policy model:", e)

@router.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    try:
        # 1) get context - optimized retrieval for planning queries
        context_docs = retrieve_user_context(
            req.user_id, 
            query=f"study notes syllabus courses subjects planning schedule",
            k=5,  # Get more context for planning
            min_similarity=0.65,  # Higher threshold to filter low-quality docs
            max_context_length=2500,  # More context allowed for planning
            allowed_types=["plan", "context", "onboarding"],  # Planning-relevant types
            deduplicate=True
        )
        
        # Polish context to remove junk data and duplicates
        polished_docs = polish_context(context_docs, min_similarity=0.65)
        
        # Validate context quality - need at least 2 relevant documents
        if len(polished_docs) < 2:
            print(f"Warning: Only {len(polished_docs)} high-quality context documents found. Using available context.")
        
        # Format context for prompt with structured sections
        user_profile = req.user_profile if req.user_profile else None
        completion_history = req.completion_history if req.completion_history else None
        
        context_text = format_context_for_prompt(
            polished_docs,
            user_profile=user_profile if user_profile else {},
            completion_history=completion_history if completion_history else {},
            max_length=2500
        )
        
        # Pre-filter tasks: Mark tasks that MUST stay (cannot be shifted)
        from datetime import datetime, timedelta
        plan_date = datetime.fromisoformat(req.date_iso.replace('Z', '+00:00')).replace(tzinfo=None)
        tomorrow = plan_date + timedelta(days=1)
        
        tasks_must_stay = []
        tasks_can_shift = []
        
        for task in req.tasks:
            task_dict = task.dict(exclude_none=True)
            due_date = None
            if task_dict.get('dueDate'):
                try:
                    due_date = datetime.fromisoformat(task_dict['dueDate'].replace('Z', '+00:00')).replace(tzinfo=None)
                except:
                    pass
            
            status = task_dict.get('status', 'pending').lower()
            priority = task_dict.get('priority', 'medium').lower()
            
            # Check if task MUST stay
            must_stay = False
            reason = ""
            
            # Due today or tomorrow
            if due_date and due_date <= tomorrow:
                must_stay = True
                reason = "due today or tomorrow"
            # In-progress
            elif status == 'in-progress':
                must_stay = True
                reason = "in-progress"
            # High priority
            elif priority == 'high':
                must_stay = True
                reason = "high priority"
            # Exam-related (check if task has examId or is linked to exam)
            elif task_dict.get('examId') or 'exam' in task_dict.get('title', '').lower():
                must_stay = True
                reason = "exam-related"
            
            if must_stay:
                tasks_must_stay.append({
                    'task': task_dict,
                    'reason': reason
                })
            else:
                tasks_can_shift.append(task_dict)
        
        # Calculate user's daily capacity from completion history
        completion_history = req.completion_history if req.completion_history else {}
        avg_completion = completion_history.get("averageDailyCompletion", 0.7)
        typical_capacity = completion_history.get("typicalCapacity")
        
        # If capacity not provided, estimate from task count and completion rate
        if not typical_capacity and len(req.tasks) > 0:
            # Estimate: user can complete 70-80% of tasks on average (more reasonable)
            typical_capacity = max(4, int(len(req.tasks) * 0.75))  # Use 75% as default, minimum 4 tasks
        
        # 2) build prompt (strict JSON)
        prompt = f"""
You are Momentum — an intelligent student's daily planner assistant. Return ONLY a valid JSON object exactly matching the schema below.

Context:
{context_text}

INPUT:
date: {req.date_iso}
available_windows: { [w.dict() for w in (req.available_times or [])] }
classes: { [c.dict() for c in (req.classes or [])] }
tasks: {json.dumps([t.dict(exclude_none=True) for t in req.tasks], default=str)}
preferences: { req.preferences or {} }

TASKS THAT MUST STAY (DO NOT SHIFT THESE):
{json.dumps([{"task_id": t['task'].get('id') or t['task'].get('sourceId'), "title": t['task'].get('title'), "reason": t['reason']} for t in tasks_must_stay], indent=2) if tasks_must_stay else "None - all tasks can potentially be shifted"}

TASKS THAT CAN BE SHIFTED (if capacity exceeded):
{json.dumps([{"task_id": t.get('id') or t.get('sourceId'), "title": t.get('title'), "dueDate": t.get('dueDate'), "priority": t.get('priority')} for t in tasks_can_shift], indent=2) if tasks_can_shift else "None"}

USER CAPACITY ANALYSIS:
- Average daily completion rate: {avg_completion:.1%}
- Typical daily capacity: {typical_capacity or len(req.tasks)} tasks
- Total tasks provided: {len(req.tasks)}

CRITICAL RULES - DO NOT VIOLATE:
- Tasks due today or tomorrow MUST stay in schedule (NEVER shift these)
- Tasks with status "in-progress" MUST stay in schedule (user is already working on them)
- Tasks linked to exams within 7 days MUST stay in schedule (highest priority)
- High priority tasks MUST stay in schedule (unless truly impossible)
- Only shift tasks that are: due >2 days away, low/medium priority, not started, not critical

CAPACITY LOGIC:
- If total tasks ({len(req.tasks)}) <= capacity ({typical_capacity or len(req.tasks)}) + 1: Keep ALL tasks (allow slight overflow)
- If total tasks > capacity + 1: Keep {typical_capacity or len(req.tasks)} most important, shift only the rest
- Keep at least 60-70% of tasks for today, only shift if truly over capacity
- Example: If user can do 4 tasks and has 5 tasks, keep 4 most important, shift only 1

IMPORTANT TASK INFORMATION:
- Multi-day tasks have daysAllocated and currentDay fields (e.g., Day 2 of 5)
- Progress tracking: progressPercentage (0-100%) shows how much is done
- Status: pending, in-progress, or completed
- Actual time spent vs estimated helps understand user's pace
- Tasks with startDate and daysAllocated span multiple days - schedule accordingly

YOUR TASK:
1. Analyze which tasks are most critical:
   - Tasks with exams within 7 days = HIGHEST priority (NEVER shift)
   - Tasks due today or tomorrow = HIGHEST priority (NEVER shift)
   - Tasks with status "in-progress" = HIGH priority (NEVER shift)
   - Tasks with near deadlines (within 2-3 days) = HIGH priority (NEVER shift)
   - Skill milestones with deadlines = MEDIUM-HIGH priority
   - Other tasks = MEDIUM/LOW priority (can shift if needed)

2. Based on user's typical capacity ({typical_capacity or len(req.tasks)} tasks), select tasks for today:
   - FIRST: Keep ALL tasks that MUST stay (due today/tomorrow, in-progress, high priority, exam-related)
   - THEN: Fill remaining capacity with next most important tasks
   - Respect user's daily capacity, but allow slight overflow if needed
   - Consider task complexity and estimated time

3. Shift less critical tasks to next day (ONLY if capacity truly exceeded):
   - Only shift tasks that meet ALL criteria:
     * Task is not due today or tomorrow
     * Task is not in-progress
     * Task is not high priority
     * Task is not linked to upcoming exam
     * User capacity is truly exceeded
   - For tasks shifted to next day, calculate new dueDate and startDate
   - Next day = {req.date_iso} + 1 day
   - Update dates appropriately (maintain daysAllocated if multi-day task)

SCHEMA:
{{ "summary": string,
  "schedule": [{{"id","task_id","title","type","start","end","priority","estimated_minutes","notes","score"}}],
  "suggestions": [string],
  "shifted_tasks": [
    {{
      "task_id": "original_task_id",
      "title": "Task title",
      "type": "assignment|milestone|task",
      "newDueDate": "ISO8601 date (YYYY-MM-DD)",
      "newStartDate": "ISO8601 date (YYYY-MM-DD) or null",
      "reason": "Why this was shifted"
    }}
  ]
}}

Rules:
- Do not overlap with classes.
- Prioritize tasks with earlier deadlines, then higher priority.
- DO NOT shift tasks due today or tomorrow - these MUST stay in schedule.
- DO NOT shift tasks that are in-progress - user is already working on them.
- DO NOT shift high priority tasks unless absolutely necessary.
- If total tasks <= capacity + 1, keep ALL tasks (allow slight overflow).
- Only shift tasks if capacity is truly exceeded AND task meets all shift criteria.
- For multi-day tasks, consider currentDay and daysAllocated when scheduling.
- Tasks with higher progressPercentage may need less time (already partially done).
- Consider user's actual completion patterns when estimating time.
- Respect user preferred study times when possible.
- Use ISO8601 datetimes for start/end.
- Output VALID JSON ONLY — no extra text.
"""
        try:
            raw = call_gemini_generate(prompt)
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to simple scheduler
            schedule = fallback_scheduler(req.available_times or [], [t.dict() for t in req.tasks], [c.dict() for c in (req.classes or [])], req.date_iso)
            return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                                summary="Error generating plan - using fallback schedule",
                                schedule=schedule, suggestions=["AI service error. Using fallback scheduler."], 
                                rebalanced_tasks=[], shifted_tasks=[],
                                metadata={"model": GEMINI_MODEL, "error": str(e), "retrieved_docs": len(polished_docs)})
        
        import re
        m = re.search(r"\{.*\}", raw, flags=re.S)
        if not m:
            # fallback
            schedule = fallback_scheduler(req.available_times or [], [t.dict() for t in req.tasks], [c.dict() for c in (req.classes or [])], req.date_iso)
            return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                                summary="Fallback schedule (LLM failed to produce JSON)",
                                schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                                shifted_tasks=[], metadata={"model": GEMINI_MODEL, "retrieved_docs": len(polished_docs) if 'polished_docs' in locals() else 0})
        try:
            parsed = json.loads(m.group(0))
        except Exception:
            schedule = fallback_scheduler(req.available_times or [], [t.dict() for t in req.tasks], [c.dict() for c in (req.classes or [])], req.date_iso)
            return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                                summary="Fallback schedule (LLM JSON parse error)",
                                schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                                shifted_tasks=[], metadata={"model": GEMINI_MODEL, "retrieved_docs": len(polished_docs) if 'polished_docs' in locals() else 0})

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

        # VALIDATION: Ensure tasks due today/tomorrow are not shifted
        shifted_tasks = parsed.get("shifted_tasks", [])
        validated_shifted_tasks = []
        moved_back_to_schedule = []
        
        for shifted_task in shifted_tasks:
            task_id = shifted_task.get("task_id")
            # Find the original task
            original_task = None
            for task in req.tasks:
                task_dict = task.dict(exclude_none=True)
                if (task_dict.get('id') == task_id or 
                    task_dict.get('sourceId') == task_id):
                    original_task = task_dict
                    break
            
            if original_task:
                # Check if this task MUST stay
                due_date = None
                if original_task.get('dueDate'):
                    try:
                        due_date = datetime.fromisoformat(original_task['dueDate'].replace('Z', '+00:00')).replace(tzinfo=None)
                    except:
                        pass
                
                status = original_task.get('status', 'pending').lower()
                priority = original_task.get('priority', 'medium').lower()
                
                # Validate: Don't allow shifting if task must stay
                should_not_shift = (
                    (due_date and due_date <= tomorrow) or  # Due today/tomorrow
                    status == 'in-progress' or  # In-progress
                    priority == 'high' or  # High priority
                    original_task.get('examId') or 'exam' in original_task.get('title', '').lower()  # Exam-related
                )
                
                if should_not_shift:
                    # Move this task back to schedule (don't shift it)
                    print(f"VALIDATION: Task '{original_task.get('title')}' should not be shifted (due today/tomorrow, in-progress, high priority, or exam-related). Moving back to schedule.")
                    moved_back_to_schedule.append({
                        "id": str(uuid.uuid4()),
                        "task_id": task_id,
                        "title": original_task.get('title', 'Task'),
                        "type": shifted_task.get("type", "task"),
                        "start": f"{req.date_iso}T09:00:00",
                        "end": f"{req.date_iso}T10:00:00",
                        "priority": original_task.get('priority', 'medium'),
                        "estimated_minutes": original_task.get('estimatedMinutes', 60),
                        "notes": "Kept in schedule (must not be shifted)"
                    })
                else:
                    validated_shifted_tasks.append(shifted_task)
            else:
                # If we can't find the task, allow the shift (might be a new task)
                validated_shifted_tasks.append(shifted_task)
        
        # Add moved-back tasks to schedule
        schedule = parsed.get("schedule", [])
        schedule.extend(moved_back_to_schedule)
        
        # Validate: At least 50% of tasks should be in schedule (not shifted)
        total_tasks = len(req.tasks)
        tasks_in_schedule = len([s for s in schedule if s.get("task_id")])
        if tasks_in_schedule < total_tasks * 0.5:
            print(f"VALIDATION WARNING: Only {tasks_in_schedule}/{total_tasks} tasks in schedule. This seems too aggressive. Adjusting...")
            # If too many tasks shifted, move some back
            if validated_shifted_tasks:
                # Move back the first few shifted tasks
                tasks_to_move_back = validated_shifted_tasks[:max(1, int(total_tasks * 0.3))]
                for task_to_move in tasks_to_move_back:
                    task_id = task_to_move.get("task_id")
                    original_task = None
                    for task in req.tasks:
                        task_dict = task.dict(exclude_none=True)
                        if (task_dict.get('id') == task_id or 
                            task_dict.get('sourceId') == task_id):
                            original_task = task_dict
                            break
                    
                    if original_task:
                        schedule.append({
                            "id": str(uuid.uuid4()),
                            "task_id": task_id,
                            "title": original_task.get('title', 'Task'),
                            "type": task_to_move.get("type", "task"),
                            "start": f"{req.date_iso}T09:00:00",
                            "end": f"{req.date_iso}T10:00:00",
                            "priority": original_task.get('priority', 'medium'),
                            "estimated_minutes": original_task.get('estimatedMinutes', 60),
                            "notes": "Moved back to schedule (validation)"
                        })
                        validated_shifted_tasks.remove(task_to_move)

        # persist policy log and optionally push to frontend (store details in your DB in production)
        # For demo: write a small json to logs/
        os.makedirs("logs", exist_ok=True)
        with open("logs/plan_requests.log", "a") as f:
            f.write(json.dumps({"ts": datetime.utcnow().isoformat(), "user_id": req.user_id, "payload": parsed}) + "\n")

        # send realtime update to frontend (best-effort)
        asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"plan","payload":parsed}))

        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary=parsed.get("summary",""),
                            schedule=schedule,
                            suggestions=parsed.get("suggestions",[]),
                            rebalanced_tasks=parsed.get("rebalanced_tasks",[]),
                            shifted_tasks=validated_shifted_tasks,
                            metadata={"model": GEMINI_MODEL, "retrieved_docs": len(polished_docs), "validation": {"moved_back": len(moved_back_to_schedule)}})
    except Exception as e:
        import traceback
        error_msg = f"Error in plan endpoint: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        # Return a fallback response instead of crashing
        try:
            schedule = fallback_scheduler(req.available_times or [], [t.dict() for t in req.tasks], [c.dict() for c in (req.classes or [])], req.date_iso)
        except Exception as fallback_error:
            print(f"Fallback scheduler also failed: {fallback_error}")
            schedule = []
        
        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary="Error generating plan - using fallback schedule",
                            schedule=schedule, suggestions=["Error occurred. Using fallback scheduler."], rebalanced_tasks=[],
                            shifted_tasks=[],
                            metadata={"model": GEMINI_MODEL, "error": str(e), "retrieved_docs": len(polished_docs) if 'polished_docs' in locals() else 0})

@router.post("/complete")
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

@router.post("/rebalance")
def rebalance(req: dict):
    """
    Rebalance daily plan based on incomplete tasks, completion history, and user habits.
    Expects: user_id, date_iso, incomplete_tasks, completion_history, preferences, existing_plan, user_profile, task_patterns
    """
    user_id = req.get("user_id")
    date_iso = req.get("date_iso")
    incomplete_tasks = req.get("incomplete_tasks", [])
    completion_history = req.get("completion_history", {})
    preferences = req.get("preferences", {})
    existing_plan = req.get("existing_plan")
    user_profile = req.get("user_profile", {})
    task_patterns = req.get("task_patterns", [])
    
    if not user_id or not date_iso:
        return {"error": "user_id and date_iso are required"}
    
    # Get context for rebalancing
    context_docs = retrieve_user_context(
        user_id,
        query=f"task completion habits productivity patterns daily capacity",
        k=5,
        min_similarity=0.65,  # Higher threshold for quality
        max_context_length=2000,
        allowed_types=["plan", "context"],
        deduplicate=True
    )
    
    # Polish context to remove junk data
    polished_docs = polish_context(context_docs, min_similarity=0.65)
    
    # Format context for prompt
    context_text = format_context_for_prompt(
        polished_docs,
        user_profile=user_profile if user_profile else {},
        completion_history=completion_history if completion_history else {},
        max_length=2000
    )
    
    # Build user context string
    user_context_parts = []
    if user_profile:
        if user_profile.get("educationLevel"):
            edu_info = f"Education: {user_profile.get('educationLevel')}"
            if user_profile.get("institution"):
                edu_info += f" at {user_profile.get('institution')}"
            if user_profile.get("major"):
                edu_info += f", Major: {user_profile.get('major')}"
            user_context_parts.append(edu_info)
    
    # Build task patterns context
    patterns_info = ""
    if task_patterns and len(task_patterns) > 0:
        # Calculate average time ratio (actual vs estimated)
        time_ratios = []
        for pattern in task_patterns:
            if pattern.get("estimatedHours") and pattern.get("actualHours"):
                ratio = pattern.get("actualHours") / pattern.get("estimatedHours")
                time_ratios.append(ratio)
        if time_ratios:
            avg_ratio = sum(time_ratios) / len(time_ratios)
            patterns_info = f"\nUser's time patterns:\n- Typically takes {avg_ratio:.1%} of estimated time\n"
    
    # Calculate user's typical daily capacity
    avg_completion = completion_history.get("averageDailyCompletion", 0.7)
    typical_capacity = completion_history.get("typicalCapacity", max(4, int(len(incomplete_tasks) * 0.75)))
    
    # Build prompt for intelligent rebalancing
    prompt = f"""
You are Momentum — an intelligent student's daily planner assistant. The user has incomplete tasks from their daily plan and needs you to rebalance it.

Context about user's habits:
{context_text}
{chr(10).join(user_context_parts) if user_context_parts else ''}
{patterns_info}

User's completion history:
- Average daily completion rate: {avg_completion * 100:.0f}%
- Typical daily capacity: {typical_capacity:.0f} tasks
- Preferred study times: {completion_history.get('preferredStudyTimes', [])}

Incomplete tasks for {date_iso}:
{json.dumps(incomplete_tasks, indent=2)}

Existing plan (if any):
{json.dumps(existing_plan, indent=2) if existing_plan else "None"}

IMPORTANT TASK INFORMATION:
- Multi-day tasks have daysAllocated and currentDay fields (e.g., Day 2 of 5 means 2 days done out of 5 total)
- Progress tracking: progressPercentage (0-100%) shows how much is already done
- Status: pending, in-progress, or completed
- Tasks with higher progressPercentage need less remaining time
- Consider user's actual vs estimated time patterns when scheduling
- Tasks with startDate and daysAllocated span multiple days - adjust scheduling accordingly

CRITICAL RULES - DO NOT VIOLATE:
- Tasks due today or tomorrow MUST stay in schedule (NEVER shift these)
- Tasks with status "in-progress" MUST stay in schedule (user is already working on them)
- Tasks linked to exams within 7 days MUST stay in schedule (highest priority)
- High priority tasks MUST stay in schedule (unless truly impossible)
- Only shift tasks that are: due >2 days away, low/medium priority, not started, not critical

Your task:
1. Analyze which tasks are most critical (upcoming exams, near deadlines, high priority)
2. Prioritize tasks based on:
   - Deadline proximity (exams within 7 days = highest priority, NEVER shift)
   - Tasks due today or tomorrow = HIGHEST priority (NEVER shift)
   - Tasks with status "in-progress" = HIGH priority (NEVER shift)
   - Skill milestone deadlines
   - Progress percentage (tasks closer to completion may be prioritized to finish)
   - Multi-day task status (Day X of Y - consider remaining days)
   - User's typical daily capacity ({typical_capacity:.0f} tasks)
   - User's completion habits and time patterns
3. Keep the most important tasks for today:
   - FIRST: Keep ALL tasks that MUST stay (due today/tomorrow, in-progress, high priority, exam-related)
   - THEN: Fill remaining capacity with next most important incomplete tasks
4. Shift less critical tasks to tomorrow (ONLY if capacity truly exceeded):
   - Only shift tasks that meet ALL criteria:
     * Task is not due today or tomorrow
     * Task is not in-progress
     * Task is not high priority
     * Task is not linked to upcoming exam
     * User capacity is truly exceeded
5. For multi-day tasks, consider if they should continue today or be shifted (but respect must-stay rules)
6. If needed, suggest adjusting due dates for academic assignments based on user performance and learned patterns

Return ONLY a valid JSON object with this schema:
{{
  "summary": "Brief summary of rebalanced plan",
  "schedule": [
    {{
      "id": "unique_id",
      "task_id": "original_task_id",
      "title": "Task title",
      "type": "assignment|milestone|task",
      "start": "ISO8601 datetime",
      "end": "ISO8601 datetime",
      "priority": "high|medium|low",
      "estimated_minutes": 60,
      "notes": "Why this task is prioritized"
    }}
  ],
  "suggestions": ["Actionable suggestions for the user"],
  "shifted_tasks": [
    {{
      "task_id": "original_task_id",
      "title": "Task title",
      "type": "assignment|milestone|task",
      "newDueDate": "ISO8601 date (if assignment, suggest new due date)",
      "reason": "Why this was shifted"
    }}
  ],
  "metadata": {{
    "tasksKept": number,
    "tasksShifted": number,
    "priorityBreakdown": {{"high": number, "medium": number, "low": number}}
  }}
}}

Rules:
- Keep tasks with exams within 7 days
- Keep high-priority tasks with near deadlines
- For multi-day tasks, consider currentDay and remaining days (daysAllocated - currentDay)
- Tasks with high progressPercentage may need less time (already partially done)
- Respect user's typical capacity ({typical_capacity:.0f} tasks)
- Consider user's actual time patterns when estimating remaining time
- Shift non-critical tasks to next day
- For academic assignments, suggest new due dates if user is falling behind based on learned patterns
- Output VALID JSON ONLY — no extra text.
"""
    
    raw = call_gemini_generate(prompt)
    import re
    m = re.search(r"\{.*\}", raw, flags=re.S)
    
    if not m:
        # Fallback: simple greedy scheduling
        schedule = fallback_scheduler([], [t for t in incomplete_tasks[:int(typical_capacity)]], [], date_iso)
        return {
            "user_id": user_id,
            "date_iso": date_iso,
            "summary": "Rebalanced plan (fallback)",
            "schedule": schedule,
            "suggestions": ["Fallback scheduler used. Consider completing high-priority tasks first."],
            "shifted_tasks": [{"task_id": t.get("id"), "title": t.get("title"), "type": t.get("type"), "reason": "Capacity limit"} for t in incomplete_tasks[int(typical_capacity):]],
            "metadata": {"model": GEMINI_MODEL, "fallback": True}
        }
    
    try:
        parsed = json.loads(m.group(0))
        
        # Ensure IDs for schedule items
        for item in parsed.get("schedule", []):
            if "id" not in item:
                item["id"] = str(uuid.uuid4())
        
        # Send realtime update
        asyncio.create_task(ws_manager.send_json(user_id, {"type": "rebalance", "payload": parsed}))
        
        return {
            "user_id": user_id,
            "date_iso": date_iso,
            "summary": parsed.get("summary", "Rebalanced plan"),
            "schedule": parsed.get("schedule", []),
            "suggestions": parsed.get("suggestions", []),
            "shifted_tasks": parsed.get("shifted_tasks", []),
            "metadata": {
                **parsed.get("metadata", {}),
                "model": GEMINI_MODEL,
                "retrieved_docs": len(context_docs)
            }
        }
    except Exception as e:
        print(f"Error parsing rebalance response: {e}")
        # Fallback
        schedule = fallback_scheduler([], [t for t in incomplete_tasks[:int(typical_capacity)]], [], date_iso)
        return {
            "user_id": user_id,
            "date_iso": date_iso,
            "summary": "Rebalanced plan (fallback due to parse error)",
            "schedule": schedule,
            "suggestions": ["Fallback used. Please prioritize tasks with nearest deadlines."],
            "shifted_tasks": [{"task_id": t.get("id"), "title": t.get("title"), "type": t.get("type"), "reason": "Parse error fallback"} for t in incomplete_tasks[int(typical_capacity):]],
            "metadata": {"model": GEMINI_MODEL, "fallback": True, "error": str(e)}
        }

