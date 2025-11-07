# test_ai_service.py
"""
Quick test to verify ai_service.py is properly configured and working.
"""
import sys
import os

print("="*60)
print("Testing AI Service Configuration")
print("="*60)

# Test 1: Check environment variables
print("\n1. Checking environment variables...")
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
PORT = int(os.getenv("PORT", "8001"))

if GEMINI_API_KEY:
    print(f"   ✓ GEMINI_API_KEY: {'*' * 20}{GEMINI_API_KEY[-4:]}")
else:
    print("   ✗ GEMINI_API_KEY not found!")
    sys.exit(1)

print(f"   ✓ GEMINI_MODEL: {GEMINI_MODEL}")
print(f"   ✓ PORT: {PORT}")

# Test 2: Import and initialize Google GenAI
print("\n2. Testing Google GenAI initialization...")
try:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("   ✓ GenAI client initialized successfully")
except Exception as e:
    print(f"   ✗ Failed to initialize GenAI client: {e}")
    sys.exit(1)

# Test 3: Test text generation
print("\n3. Testing text generation...")
try:
    prompt = "Say 'Hello, this is a test' in one sentence."
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )
    
    if hasattr(resp, 'text') and resp.text:
        print(f"   ✓ Text generation works!")
        print(f"   Response: {resp.text[:100]}...")
    else:
        print("   ⚠ Response received but no text attribute")
except Exception as e:
    print(f"   ✗ Text generation failed: {e}")
    
    # Try fallback model
    print("   Trying fallback model (gemini-2.5-flash-lite)...")
    try:
        resp = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        if hasattr(resp, 'text') and resp.text:
            print(f"   ✓ Fallback model works!")
            print(f"   Response: {resp.text[:100]}...")
    except Exception as fallback_e:
        print(f"   ✗ Fallback also failed: {fallback_e}")

# Test 4: Test embeddings
print("\n4. Testing embeddings...")
try:
    texts = ["Test text for embedding"]
    res = client.models.embed_content(
        model="text-embedding-004",
        contents=texts
    )
    
    if hasattr(res, 'embeddings') and res.embeddings:
        emb_obj = res.embeddings[0]
        if hasattr(emb_obj, 'values'):
            emb_values = emb_obj.values
            print(f"   ✓ Embeddings work!")
            print(f"   Embedding dimension: {len(emb_values)}")
        else:
            print("   ⚠ Embedding object has no 'values' attribute")
    else:
        print("   ⚠ No embeddings in response")
except Exception as e:
    print(f"   ✗ Embeddings failed: {e}")

# Test 5: Import FastAPI dependencies
print("\n5. Testing FastAPI dependencies...")
try:
    from fastapi import FastAPI
    import uvicorn
    print("   ✓ FastAPI and uvicorn imported successfully")
except Exception as e:
    print(f"   ✗ FastAPI import failed: {e}")

# Test 6: Import ChromaDB
print("\n6. Testing ChromaDB...")
try:
    import chromadb
    print("   ✓ ChromaDB imported successfully")
except Exception as e:
    print(f"   ✗ ChromaDB import failed: {e}")

# Test 7: Import other dependencies
print("\n7. Testing other dependencies...")
try:
    import joblib
    import numpy as np
    from dateutil import parser
    print("   ✓ All other dependencies imported successfully")
except Exception as e:
    print(f"   ✗ Some dependencies failed: {e}")

print("\n" + "="*60)
print("Configuration Test Complete!")
print("="*60)
print("\nTo start the AI service, run:")
print("  python ai_service.py")
print("\nOr with uvicorn:")
print("  uvicorn ai_service:app --reload --port 8001")
print("="*60)
