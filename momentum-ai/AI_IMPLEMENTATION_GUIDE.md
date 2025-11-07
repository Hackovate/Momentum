# 🧠 AI Implementation Guide: LangChain + ChromaDB + Gemini

This guide helps you understand and implement AI features in the Momentum project using LangChain, ChromaDB, and Gemini API.

## 📚 Table of Contents

1. [Understanding the Stack](#understanding-the-stack)
2. [LangChain Basics](#langchain-basics)
3. [ChromaDB Basics](#chromadb-basics)
4. [RAG (Retrieval Augmented Generation) Pattern](#rag-pattern)
5. [Implementation Examples](#implementation-examples)
6. [Best Practices](#best-practices)

---

## Understanding the Stack

### What Each Component Does

**LangChain**: A framework for building applications with LLMs
- **Text Splitters**: Break large documents into smaller chunks
- **Document Loaders**: Load documents from various sources (PDF, text, etc.)
- **Chains**: Connect multiple steps (load → split → embed → retrieve → generate)
- **Retrievers**: Query vector databases to find relevant context

**ChromaDB**: A vector database for storing embeddings
- Stores text as **embeddings** (numerical vectors that capture meaning)
- Allows **semantic search** (finding similar content by meaning, not just keywords)
- Fast retrieval of relevant context for AI prompts

**Gemini API**: Google's LLM for generation
- Generates text responses
- Creates embeddings (text → vectors)
- Understands context and generates structured outputs

### How They Work Together

```
User Document
    ↓
LangChain Text Splitter (chunks document)
    ↓
Gemini Embeddings API (converts chunks to vectors)
    ↓
ChromaDB (stores vectors with metadata)
    ↓
[Later: User asks question]
    ↓
Query Embedding (Gemini converts question to vector)
    ↓
ChromaDB Retrieval (finds similar chunks)
    ↓
LangChain RAG Chain (combines retrieved context + question)
    ↓
Gemini Generation (creates answer using context)
    ↓
Response to User
```

---

## LangChain Basics

### 1. Text Splitting

**Why**: Large documents need to be split into smaller chunks that fit in AI context windows.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Create a text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # Each chunk is ~1000 characters
    chunk_overlap=200,    # Overlap between chunks (keeps context)
    length_function=len,
)

# Split a document
text = "Your long document text here..."
chunks = text_splitter.split_text(text)
# Result: List of smaller text chunks
```

**For this project**: Use this when ingesting syllabus, notes, or long documents.

### 2. Document Structure

LangChain uses `Document` objects:

```python
from langchain.schema import Document

doc = Document(
    page_content="The actual text content",
    metadata={
        "user_id": "user123",
        "type": "syllabus",
        "course": "CS101",
        "timestamp": "2025-01-01"
    }
)
```

### 3. Embeddings

**What**: Convert text to numerical vectors that capture meaning.

```python
# Using Gemini embeddings (already in your code)
def gemini_embedding(texts: List[str]) -> List[List[float]]:
    """Convert texts to embeddings using Gemini"""
    res = genai_client.models.embed_content(
        model="text-embedding-004",
        contents=texts
    )
    embeddings = []
    for emb_obj in res.embeddings:
        embeddings.append(emb_obj.values)
    return embeddings
```

**Why**: Similar texts have similar vectors, enabling semantic search.

### 4. Retrievers

**What**: Query ChromaDB to find relevant documents.

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import Embeddings

# Create a retriever from ChromaDB
vectorstore = Chroma(
    client=chroma_client,
    collection_name="momentum_docs",
    embedding_function=gemini_embedding_function
)

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3, "filter": {"user_id": user_id}}
)

# Retrieve relevant docs
docs = retriever.get_relevant_documents("What are my study notes about?")
```

---

## ChromaDB Basics

### 1. Collections

**What**: A collection is like a table in a database, but for vectors.

```python
import chromadb

# Create or get a collection
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="momentum_docs",
    metadata={"description": "User documents and conversations"}
)
```

### 2. Adding Documents

```python
# Prepare data
documents = ["Document text 1", "Document text 2"]
embeddings = gemini_embedding(documents)  # Generate embeddings
ids = ["doc1", "doc2"]
metadatas = [
    {"user_id": "user123", "type": "notes"},
    {"user_id": "user123", "type": "syllabus"}
]

# Add to ChromaDB
collection.add(
    documents=documents,
    embeddings=embeddings,
    ids=ids,
    metadatas=metadatas
)
```

### 3. Querying (Retrieval)

```python
# Generate query embedding
query = "What did I learn about Python?"
query_embedding = gemini_embedding([query])[0]

# Query ChromaDB
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=3,  # Get top 3 most similar
    where={"user_id": "user123"},  # Filter by user
    where_document={"$contains": "Python"}  # Optional: text filter
)

# Results contain:
# - results['documents'][0] - List of document texts
# - results['metadatas'][0] - List of metadata dicts
# - results['distances'][0] - Similarity scores (lower = more similar)
```

### 4. Metadata Filtering

**Why**: Filter by user, document type, date, etc.

```python
# Get only user's notes
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={
        "user_id": "user123",
        "type": "notes"  # Only notes, not syllabus
    }
)
```

---

## RAG Pattern

**RAG = Retrieval Augmented Generation**

**What it does**: 
1. Retrieve relevant context from ChromaDB
2. Add that context to the prompt
3. Generate answer using both context and question

### Simple RAG Example

```python
def rag_query(user_id: str, question: str) -> str:
    """
    RAG: Retrieve relevant context, then generate answer
    """
    # 1. Retrieve relevant documents
    query_embedding = gemini_embedding([question])[0]
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3,
        where={"user_id": user_id}
    )
    
    # 2. Build context from retrieved docs
    context = "\n\n".join(results['documents'][0])
    
    # 3. Create prompt with context
    prompt = f"""
    Context from user's documents:
    {context}
    
    Question: {question}
    
    Answer based on the context above:
    """
    
    # 4. Generate answer
    answer = call_gemini_generate(prompt)
    return answer
```

### Using LangChain RAG Chain

```python
from langchain.chains import RetrievalQA
from langchain.llms import BaseLLM

# Create a RAG chain (simplified - you'll adapt for Gemini)
chain = RetrievalQA.from_chain_type(
    llm=gemini_llm,  # Your Gemini LLM wrapper
    chain_type="stuff",
    retriever=retriever,
    return_source_documents=True
)

# Use the chain
result = chain({"query": "What are my study notes about?"})
answer = result["result"]
sources = result["source_documents"]
```

---

## Implementation Examples

### Example 1: Ingesting Syllabus with LangChain

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Ingest documents using LangChain for proper chunking
    """
    # 1. Create text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    
    # 2. Split each document
    all_chunks = []
    all_metadatas = []
    
    for doc in req.docs:
        # Split into chunks
        chunks = text_splitter.split_text(doc.text)
        
        # Create metadata for each chunk
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                "user_id": req.user_id,
                "doc_id": doc.id or str(uuid.uuid4()),
                "chunk_index": i,
                "total_chunks": len(chunks),
                **(doc.meta or {})
            })
    
    # 3. Generate embeddings for all chunks
    embeddings = gemini_embedding(all_chunks)
    
    # 4. Generate IDs
    ids = [f"{req.user_id}_{i}" for i in range(len(all_chunks))]
    
    # 5. Add to ChromaDB
    collection.add(
        documents=all_chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=all_metadatas
    )
    
    return {"status": "ok", "chunks_created": len(all_chunks)}
```

### Example 2: RAG for Daily Planning

```python
def retrieve_study_context(user_id: str, query: str, k: int = 5):
    """
    Retrieve relevant study context using RAG pattern
    """
    # 1. Generate query embedding
    query_embedding = gemini_embedding([query])[0]
    
    # 2. Query ChromaDB with filters
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        where={
            "user_id": user_id,
            "type": {"$in": ["notes", "syllabus", "onboarding"]}
        }
    )
    
    # 3. Format context
    context_docs = []
    for doc, meta, distance in zip(
        results['documents'][0],
        results['metadatas'][0],
        results['distances'][0]
    ):
        context_docs.append({
            "text": doc,
            "metadata": meta,
            "relevance_score": 1 - distance  # Convert distance to similarity
        })
    
    return context_docs

@app.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    # 1. Retrieve relevant context using RAG
    context_docs = retrieve_study_context(
        req.user_id,
        query=f"study schedule preferences and course requirements",
        k=5
    )
    
    # 2. Build context string
    context_text = "\n\n---\n\n".join([
        f"Context {i+1}:\n{doc['text']}"
        for i, doc in enumerate(context_docs)
    ])
    
    # 3. Build prompt with context
    prompt = f"""
    You are Momentum — an intelligent student planner.
    
    User Context (from their documents):
    {context_text}
    
    User's Request:
    Date: {req.date_iso}
    Available Times: {req.available_times}
    Tasks: {req.tasks}
    Classes: {req.classes}
    
    Generate an optimized daily schedule...
    """
    
    # 4. Generate plan
    response = call_gemini_generate(prompt)
    # ... parse and return
```

### Example 3: LangChain + ChromaDB Integration

```python
from langchain.vectorstores import Chroma
from langchain.embeddings.base import Embeddings

class GeminiEmbeddings(Embeddings):
    """Wrapper to use Gemini embeddings with LangChain"""
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return gemini_embedding(texts)
    
    def embed_query(self, text: str) -> List[float]:
        return gemini_embedding([text])[0]

# Create vectorstore
vectorstore = Chroma(
    client=chroma_client,
    collection_name="momentum_docs",
    embedding_function=GeminiEmbeddings()
)

# Use LangChain retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={
        "k": 5,
        "filter": {"user_id": user_id}
    }
)

# Retrieve documents
docs = retriever.get_relevant_documents("What are my study notes?")
```

---

## Best Practices

### 1. Chunk Size Guidelines

- **Small chunks (200-500 chars)**: Good for precise retrieval, but may lose context
- **Medium chunks (1000-1500 chars)**: Good balance (recommended for this project)
- **Large chunks (2000+ chars)**: Better context, but less precise retrieval

**For Momentum**: Use 1000 chars with 200 char overlap.

### 2. Metadata Strategy

Always include:
- `user_id`: Filter by user
- `type`: onboarding, notes, syllabus, journal, finance
- `timestamp`: When document was added
- `source`: Where it came from (optional)

### 3. Query Optimization

```python
# Good: Filtered query
results = collection.query(
    query_embeddings=[embedding],
    n_results=5,
    where={"user_id": user_id, "type": "notes"}
)

# Bad: No filters (searches all users' data)
results = collection.query(
    query_embeddings=[embedding],
    n_results=5
)
```

### 4. Error Handling

```python
def safe_retrieve(user_id: str, query: str, k: int = 3):
    try:
        query_embedding = gemini_embedding([query])[0]
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where={"user_id": user_id}
        )
        return results['documents'][0] if results['documents'] else []
    except Exception as e:
        print(f"Retrieval error: {e}")
        return []  # Return empty list, don't crash
```

### 5. Embedding Caching

**Tip**: Cache embeddings for frequently accessed documents to save API calls.

```python
# Simple in-memory cache (use Redis in production)
embedding_cache = {}

def cached_embedding(text: str) -> List[float]:
    if text in embedding_cache:
        return embedding_cache[text]
    
    embedding = gemini_embedding([text])[0]
    embedding_cache[text] = embedding
    return embedding
```

---

## Common Patterns for Momentum

### Pattern 1: Onboarding Conversation Storage

```python
async def store_onboarding_conversation(user_id: str, conversation: list):
    # 1. Combine conversation into text
    conversation_text = "\n".join([
        f"{msg['role']}: {msg['content']}"
        for msg in conversation
    ])
    
    # 2. Split if too long
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)
    chunks = text_splitter.split_text(conversation_text)
    
    # 3. Embed and store
    embeddings = gemini_embedding(chunks)
    ids = [f"onboarding_{user_id}_{i}" for i in range(len(chunks))]
    metadatas = [{
        "user_id": user_id,
        "type": "onboarding",
        "timestamp": datetime.now().isoformat()
    } for _ in chunks]
    
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )
```

### Pattern 2: Syllabus Ingestion

```python
@app.post("/ingest/syllabus")
def ingest_syllabus(user_id: str, course_id: str, syllabus_text: str):
    # 1. Split syllabus
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  # Syllabi can be longer
        chunk_overlap=300
    )
    chunks = text_splitter.split_text(syllabus_text)
    
    # 2. Embed
    embeddings = gemini_embedding(chunks)
    
    # 3. Store with course metadata
    ids = [f"syllabus_{course_id}_{i}" for i in range(len(chunks))]
    metadatas = [{
        "user_id": user_id,
        "type": "syllabus",
        "course_id": course_id,
        "chunk_index": i
    } for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )
```

### Pattern 3: Study Notes Retrieval

```python
def get_relevant_notes(user_id: str, course_id: str, query: str):
    """
    Get notes relevant to a specific course and query
    """
    query_embedding = gemini_embedding([query])[0]
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5,
        where={
            "user_id": user_id,
            "type": "notes",
            "course_id": course_id
        }
    )
    
    return results['documents'][0]
```

---

## Next Steps

1. **Update `/ingest` endpoint** to use LangChain text splitting
2. **Implement RAG pattern** in `/plan` endpoint
3. **Add LangChain retriever** for better document management
4. **Test with real documents** to tune chunk sizes
5. **Monitor retrieval quality** and adjust `n_results` and filters

---

## Resources

- **LangChain Docs**: Check via Context7: `resolve-library-id("langchain")`
- **ChromaDB Docs**: Check via Context7: `resolve-library-id("chromadb")`
- **Gemini API Docs**: Check via Context7: `resolve-library-id("google-genai")`

**Remember**: Always use Context7 to verify latest patterns before implementing!

