# routes/onboarding.py
from fastapi import APIRouter, HTTPException
from models import OnboardingStartRequest, OnboardingAnswerRequest, OnboardingResponse
from routes.onboarding_handlers import (
    handle_education_level, handle_school_details, handle_school_group,
    handle_college_details, handle_university_details, handle_graduate_details,
    handle_institution, handle_academic_courses, handle_study_preferences,
    handle_skill_goals, handle_financial_situation
)

router = APIRouter()

# Onboarding state management (in-memory for now)
onboarding_sessions = {}

@router.post("/onboarding/start", response_model=OnboardingResponse)
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

@router.post("/onboarding/answer", response_model=OnboardingResponse)
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

