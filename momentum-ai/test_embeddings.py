# test_embeddings.py
import os
from dotenv import load_dotenv
load_dotenv()
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise SystemExit("Set GEMINI_API_KEY in .env")

# Initialize client with API key (no genai.configure needed)
client = genai.Client(api_key=GEMINI_API_KEY)

texts = ["Learn actively by practicing problems.", "Review notes within 24 hours of class."]
embedding_model = "text-embedding-004"

print(f"Using embedding model: {embedding_model}")
print(f"Number of texts to embed: {len(texts)}")
print("="*60)

try:
    # Generate embeddings using the correct API
    res = client.models.embed_content(
        model=embedding_model,
        contents=texts
    )
    
    print("Embeddings generated successfully!")
    print("="*60)
    
    # Check if embeddings are in the response
    if hasattr(res, 'embeddings') and res.embeddings:
        for i, emb_obj in enumerate(res.embeddings):
            # Extract the actual embedding values
            if hasattr(emb_obj, 'values'):
                emb_values = emb_obj.values
                print(f"Text {i}: '{texts[i]}'")
                print(f"  Embedding length: {len(emb_values)}")
                print(f"  First 5 values: {emb_values[:5]}")
                print()
            else:
                print(f"Embedding object {i}:", emb_obj)
    else:
        print("Response structure:", res)
        
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
