# routes/chat.py
import json
import re
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse, ChatAction
from database import collection
from ai_client import call_gemini_generate, gemini_embedding
from utils import retrieve_user_context

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat with AI assistant using user context from ChromaDB"""
    try:
        # Retrieve user context from ChromaDB (onboarding, previous chats, plans, routines, user context)
        # Use a broader query to catch all types of context including user-edited unstructured context
        context_query = f"user {req.user_id} context preferences notes learning skills routine daily plan schedule tasks onboarding"
        context_docs = retrieve_user_context(req.user_id, context_query, k=10)  # Get more context for better recall
        
        # Prioritize context type documents (user-edited unstructured context)
        # Sort by priority and type to ensure user context is always included
        if context_docs:
            context_docs.sort(key=lambda x: (
                0 if x.get('meta', {}).get('priority') == 'high' else 1,  # High priority first
                0 if x.get('meta', {}).get('type') == 'context' else 1,  # Context type next
                1  # Others last
            ))
        
        context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""
        
        # Build conversation history string
        conversation_str = ""
        if req.conversation_history:
            for msg in req.conversation_history:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                conversation_str += f"{role.capitalize()}: {content}\n"
        
        # Build prompt with user context
        user_name_part = f" (User's name: {req.user_name})" if req.user_name else ""
        
        # Combine structured context from PostgreSQL with unstructured from ChromaDB
        full_context = ""
        if req.structured_context:
            full_context += f"Structured Information:\n{req.structured_context}\n\n"
        if context_text:
            full_context += f"Additional Context from Memory:\n{context_text}"
        
        # Build personalized prompt with structured instructions
        name_greeting = f"Hi {req.user_name}!" if req.user_name else "Hello!"
        first_name = req.user_name.split()[0] if req.user_name else "there"
        personalization_note = f"\n\nPERSONALIZATION: The user's name is {req.user_name}. Always use their name naturally in conversation to make it feel personal and friendly, like ChatGPT does. For example: 'Hi {first_name}!' or 'That's great, {first_name}!'" if req.user_name else ""
        
        prompt = f"""You are Momentum, an AI-powered student productivity assistant. {name_greeting}

CORE BEHAVIOR:
- Be warm, friendly, and conversational - like a helpful friend who knows the user well
- Use the user's name ({req.user_name}) naturally throughout the conversation to personalize interactions
- Be proactive: ask follow-up questions, offer suggestions, and show genuine interest
- Remember context from previous conversations and reference them naturally
{personalization_note}

DATA UPDATE INSTRUCTIONS:
When the user asks you to UPDATE or CHANGE information (name, courses, skills, major, etc.), you MUST:
1. Acknowledge the change warmly in your conversational response
2. Include an "Actions:" section at the end with JSON array of actions to perform
3. Format: 
   Response: [your friendly conversational response confirming the change]
   
   Actions: [{{"type": "update_user", "data": {{"firstName": "NewName", "lastName": "NewLastName"}}}}]

Available action types:
- "update_user": Update user profile fields (firstName, lastName, major, institution, year, etc.)
- "add_course": Add a new course (data: {{"name": "Course Name", "code": "CODE", "credits": 3}})
- "add_skill": Add a new skill (data: {{"name": "Skill Name", "category": "Category", "level": "beginner"}})

User Context:
{full_context}

Previous Conversation:
{conversation_str}

User: {req.message}

Assistant:"""
        
        # Generate response using Gemini
        raw_response = call_gemini_generate(prompt)
        
        # Parse response to extract actions
        response_text = raw_response
        actions = []
        
        # Try to extract actions from response
        actions_match = re.search(r'Actions:\s*(\[.*?\])', raw_response, re.DOTALL)
        if actions_match:
            try:
                actions_json = json.loads(actions_match.group(1))
                actions = [ChatAction(**action) for action in actions_json]
                # Remove actions section from response text
                response_text = re.sub(r'\nActions:.*$', '', response_text, flags=re.DOTALL).strip()
            except Exception as e:
                print(f"Error parsing actions: {e}")
        
        # Also check if user message mentions updates and try to extract them (fallback if AI doesn't return actions)
        update_keywords = ["change", "update", "set", "modify", "edit", "my name is", "call me"]
        if any(keyword in req.message.lower() for keyword in update_keywords) and not actions:
            # Try to extract name changes with better patterns
            name_patterns = [
                r"(?:my name is|call me|name should be|change my name to|update my name to|set my name to)\s+([A-Za-z\s]+?)(?:\.|$|,|\s+and)",
                r"(?:name|it['']s|it is)\s*:?\s*([A-Za-z\s]+?)(?:\.|$|,|\s+and)",
                r"([A-Z][a-z]+\s+[A-Z][a-z]+)",  # Pattern like "Al Amin"
            ]
            for pattern in name_patterns:
                match = re.search(pattern, req.message, re.IGNORECASE)
                if match:
                    new_name = match.group(1).strip()
                    # Handle names like "Al Amin" - if it's two words, treat as first and last
                    name_parts = new_name.split()
                    action_data = {}
                    if len(name_parts) == 1:
                        # Single name - update first name only
                        action_data["firstName"] = name_parts[0]
                    elif len(name_parts) >= 2:
                        # Multiple words - first is first name, rest is last name
                        action_data["firstName"] = name_parts[0]
                        action_data["lastName"] = " ".join(name_parts[1:])
                    if action_data:
                        actions.append(ChatAction(type="update_user", data=action_data))
                        print(f"Extracted name change from message: {action_data}")
                    break
        
        # Store conversation in ChromaDB for future context
        conversation_text = f"User: {req.message}\nAssistant: {response_text}"
        doc_id = f"chat_{req.user_id}_{datetime.now().isoformat()}"
        
        try:
            # Generate embedding for the conversation
            emb = gemini_embedding([conversation_text])[0]
            collection.add(
                documents=[conversation_text],
                ids=[doc_id],
                embeddings=[emb],
                metadatas=[{
                    "user_id": req.user_id,
                    "type": "chat",
                    "timestamp": datetime.now().isoformat()
                }]
            )
        except Exception as e:
            print(f"Error storing chat conversation: {e}")
        
        return ChatResponse(
            response=response_text,
            conversation_id=doc_id,
            actions=actions
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

