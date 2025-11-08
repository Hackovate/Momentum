# scheduler.py
import uuid
from datetime import timedelta, datetime
from dateutil import parser

def fallback_scheduler(available_times, tasks, classes, plan_date=None):
    """
    Fallback scheduler that respects due dates and priorities.
    Prioritizes tasks due today/tomorrow, in-progress, and high priority.
    """
    windows = [(parser.isoparse(w.start_iso), parser.isoparse(w.end_iso)) for w in available_times] if available_times else []
    schedule = []
    
    if not windows:
        # If no available times, create default windows (9 AM - 5 PM)
        if plan_date:
            base_date = parser.isoparse(plan_date) if isinstance(plan_date, str) else plan_date
        else:
            base_date = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        windows = [
            (base_date.replace(hour=9), base_date.replace(hour=12)),
            (base_date.replace(hour=13), base_date.replace(hour=17))
        ]
    
    if not tasks:
        return schedule
    
    # Get plan date for due date comparison
    if plan_date:
        plan_dt = parser.isoparse(plan_date) if isinstance(plan_date, str) else plan_date
    else:
        plan_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = plan_dt + timedelta(days=1)
    day_after_tomorrow = plan_dt + timedelta(days=2)
    
    # Categorize tasks
    must_schedule = []  # Due today/tomorrow, in-progress, high priority
    can_schedule = []    # Other tasks
    
    for t in tasks:
        due_date = None
        due_str = t.get("deadline_iso") or t.get("dueDate")
        if due_str:
            try:
                due_date = parser.isoparse(due_str) if isinstance(due_str, str) else due_str
                if due_date.tzinfo:
                    due_date = due_date.replace(tzinfo=None)
            except:
                pass
        
        status = t.get("status", "pending").lower()
        priority = t.get("priority", "medium").lower()
        
        # Check if task must be scheduled
        must_schedule_task = (
            (due_date and due_date <= tomorrow) or  # Due today/tomorrow
            status == "in-progress" or  # In-progress
            priority == "high" or  # High priority
            t.get("examId") or "exam" in t.get("title", "").lower()  # Exam-related
        )
        
        if must_schedule_task:
            must_schedule.append(t)
        else:
            can_schedule.append(t)
    
    # Sort must-schedule tasks: due today first, then in-progress, then high priority
    def sort_key_must(t):
        due_str = t.get("deadline_iso") or t.get("dueDate")
        due_date = None
        if due_str:
            try:
                due_date = parser.isoparse(due_str) if isinstance(due_str, str) else due_str
                if due_date.tzinfo:
                    due_date = due_date.replace(tzinfo=None)
            except:
                pass
        
        status = t.get("status", "pending").lower()
        priority = t.get("priority", "medium").lower()
        
        # Priority order: due today (0), due tomorrow (1), in-progress (2), high priority (3)
        if due_date and due_date.date() == plan_dt.date():
            return (0, due_date)
        elif due_date and due_date <= tomorrow:
            return (1, due_date)
        elif status == "in-progress":
            return (2, datetime.max)
        elif priority == "high":
            return (3, datetime.max)
        else:
            return (4, due_date or datetime.max)
    
    # Sort can-schedule tasks: by priority and due date
    def sort_key_can(t):
        due_str = t.get("deadline_iso") or t.get("dueDate")
        due_date = None
        if due_str:
            try:
                due_date = parser.isoparse(due_str) if isinstance(due_str, str) else due_str
                if due_date.tzinfo:
                    due_date = due_date.replace(tzinfo=None)
            except:
                pass
        
        priority_map = {"high": 0, "medium": 1, "low": 2}
        priority_val = priority_map.get(t.get("priority", "medium").lower(), 1)
        
        return (priority_val, due_date or datetime.max)
    
    must_schedule_sorted = sorted(must_schedule, key=sort_key_must)
    can_schedule_sorted = sorted(can_schedule, key=sort_key_can)
    
    # Combine: must-schedule first, then can-schedule
    tasks_sorted = must_schedule_sorted + can_schedule_sorted
    
    w_idx = 0
    cur = windows[0][0]
    
    for t in tasks_sorted:
        minutes = int(t.get("estimated_minutes") or t.get("estimatedMinutes") or 30)
        end = cur + timedelta(minutes=minutes)
        
        if end > windows[w_idx][1]:
            w_idx += 1
            if w_idx >= len(windows):
                break
            cur = windows[w_idx][0]
            end = cur + timedelta(minutes=minutes)
        
        schedule.append({
            "id": t.get("id") or str(uuid.uuid4()),
            "task_id": t.get("id") or t.get("sourceId"),
            "title": t.get("title", "Task"),
            "type": t.get("type", "task"),
            "start": cur.isoformat(),
            "end": end.isoformat(),
            "priority": t.get("priority", "medium"),
            "estimated_minutes": minutes,
            "notes": t.get("notes") or ""
        })
        cur = end
    
    return schedule

