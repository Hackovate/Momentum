# scheduler.py
import uuid
from datetime import timedelta
from dateutil import parser

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

