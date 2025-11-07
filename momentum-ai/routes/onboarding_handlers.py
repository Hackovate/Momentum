# routes/onboarding_handlers.py
import json
from datetime import datetime
from models import OnboardingResponse
from database import collection
from ai_client import genai_client, gemini_embedding
from config import GEMINI_MODEL

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
        
        # Store in ChromaDB with embeddings
        doc_id = f"onboarding_{user_id}_{datetime.now().isoformat()}"
        emb = gemini_embedding([conversation_text])[0]
        
        collection.add(
            documents=[conversation_text],
            ids=[doc_id],
            embeddings=[emb],
            metadatas=[{
                "user_id": user_id,
                "type": "onboarding",
                "timestamp": datetime.now().isoformat()
            }]
        )
        
    except Exception as e:
        print(f"Error storing conversation: {e}")

