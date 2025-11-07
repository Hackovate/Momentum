# utils.py
from database import collection
from ai_client import gemini_embedding

def retrieve_user_context(user_id: str, query: str, k: int = 3):
    """Retrieve user context from ChromaDB"""
    q_emb = gemini_embedding([query])[0]
    res = collection.query(query_embeddings=[q_emb], n_results=k, where={"user_id": user_id})
    docs = []
    for doc_text, meta in zip(res['documents'][0], res['metadatas'][0]):
        docs.append({"text": doc_text, "meta": meta})
    return docs

