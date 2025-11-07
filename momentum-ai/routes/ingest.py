# routes/ingest.py
import uuid
from fastapi import APIRouter
from models import IngestRequest
from database import collection
from ai_client import gemini_embedding

router = APIRouter()

@router.post("/ingest")
def ingest(req: IngestRequest):
    texts = [d.text for d in req.docs]
    embs = gemini_embedding(texts)
    for d, emb in zip(req.docs, embs):
        doc_id = d.id or str(uuid.uuid4())
        # store documents and embeddings; keep user_id in metadata
        collection.add(documents=[d.text], metadatas=[{"user_id": req.user_id, **(d.meta or {})}], ids=[doc_id], embeddings=[emb])
    return {"status": "ok", "count": len(req.docs)}

