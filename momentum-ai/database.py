# database.py
import chromadb
from config import VECTOR_DIR

# Chroma client (updated for new API)
chroma_client = chromadb.PersistentClient(path=VECTOR_DIR)
COLLECTION_NAME = "momentum_docs"

try:
    collection = chroma_client.get_collection(name=COLLECTION_NAME)
except:
    collection = chroma_client.create_collection(name=COLLECTION_NAME)

