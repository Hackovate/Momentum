# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# Environment Variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VECTOR_DIR = os.getenv("VECTOR_DIR", "./chroma_db")
POLICY_MODEL_PATH = os.getenv("POLICY_MODEL_PATH", "./models/policy_model.pkl")
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))
PORT = int(os.getenv("PORT", "8001"))

if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY in .env")

