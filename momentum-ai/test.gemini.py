# test_gemini.py
import os
from dotenv import load_dotenv
load_dotenv()
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise SystemExit("Set GEMINI_API_KEY in .env")

# Initialize client with API key
client = genai.Client(api_key=GEMINI_API_KEY)

prompt = "Write a one-sentence study tip for a student learning calculus"
model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
fallback_model = "gemini-2.5-flash-lite"

print(f"Primary model: {model_name}")
print(f"Fallback model: {fallback_model}")
print("="*60)

try:
    # Try with primary model first
    print(f"Attempting with {model_name}...")
    resp = client.models.generate_content(
        model=model_name,
        contents=prompt
    )
    
    # Extract and print the response
    print("="*60)
    print("Gemini Response:")
    print("="*60)
    print(resp.text)
    print("="*60)
    
except Exception as e:
    # If primary model fails, try fallback model
    print(f"\n⚠️  Primary model failed: {type(e).__name__}: {e}")
    print(f"Retrying with fallback model: {fallback_model}...\n")
    
    try:
        resp = client.models.generate_content(
            model=fallback_model,
            contents=prompt
        )
        
        print("="*60)
        print("Gemini Response (from fallback model):")
        print("="*60)
        print(resp.text)
        print("="*60)
        
    except Exception as fallback_error:
        print(f"❌ Fallback model also failed: {type(fallback_error).__name__}: {fallback_error}")
        import traceback
        traceback.print_exc()
