---
title: "Building a RAG Pipeline from Scratch: Embeddings, Vector Databases, and Retrieval"
description: "Step-by-step guide to building a production-ready RAG pipeline in Python. Covers embeddings, chunking strategies, Chroma and Pinecone setup, hybrid search, reranking, and evaluation with RAGAS."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["rag", "ai-engineering", "embeddings", "vector-database", "pinecone", "chroma", "python", "llm", "langchain"]
readingTime: "12 min read"
---

Retrieval-Augmented Generation (RAG) is the architecture that makes LLMs useful over your own data. Instead of fine-tuning a model (expensive, slow, requires retraining on updates), you build a retrieval system: store your documents as embeddings, find the relevant ones at query time, and feed them to the LLM as context.

This guide builds a complete RAG pipeline from scratch — no magic abstractions until you understand what they're abstracting.

---

## The RAG Architecture

```
Documents → Chunking → Embedding → Vector Store
                                        ↓
User Query → Embedding → Similarity Search → Retrieved Chunks
                                                    ↓
                                    LLM + Context → Answer
```

Three phases:
1. **Indexing** (offline): chunk documents, embed chunks, store in vector database
2. **Retrieval** (online): embed query, find similar chunks
3. **Generation** (online): pass query + chunks to LLM, return answer

---

## Step 1: Document Chunking

Chunking strategy dramatically affects retrieval quality. Too small: chunks lack context. Too large: irrelevant content dilutes relevance scores.

### Fixed-Size Chunking

```python
def chunk_by_size(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """Split text into overlapping fixed-size chunks."""
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk:
            chunks.append(chunk)

    return chunks
```

### Semantic Chunking (Better)

Semantic chunking splits at natural boundaries — paragraphs, sections, sentences — rather than arbitrary character counts.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # max characters per chunk
    chunk_overlap=200,    # overlap to preserve context across chunks
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],  # split preference order
)

def chunk_document(content: str, metadata: dict) -> list[dict]:
    chunks = splitter.split_text(content)
    return [
        {
            "text": chunk,
            "metadata": {
                **metadata,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
        }
        for i, chunk in enumerate(chunks)
    ]
```

### Chunking Strategy by Document Type

| Document Type | Recommended Strategy | Chunk Size |
|---------------|---------------------|------------|
| Technical docs | Semantic (by section) | 800-1200 chars |
| Code files | By function/class | Variable |
| PDFs | By page + paragraph | 500-800 chars |
| Support tickets | Whole document | As-is |
| News articles | By paragraph | 400-600 chars |

---

## Step 2: Embeddings

Embeddings convert text into dense vectors. Similar texts produce similar vectors (high cosine similarity). Choose your embedding model based on your language and latency requirements.

```python
from openai import OpenAI

client = OpenAI()

def embed_texts(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """Embed a batch of texts. Returns list of embedding vectors."""
    response = client.embeddings.create(
        input=texts,
        model=model,
    )
    return [item.embedding for item in response.data]

# Batch for efficiency — max 2048 inputs per API call
def embed_chunks(chunks: list[dict], batch_size: int = 100) -> list[dict]:
    result = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        texts = [c["text"] for c in batch]
        embeddings = embed_texts(texts)
        for chunk, embedding in zip(batch, embeddings):
            result.append({**chunk, "embedding": embedding})
    return result
```

**Model comparison (2026)**:

| Model | Dimensions | Cost | Quality | Use case |
|-------|-----------|------|---------|----------|
| text-embedding-3-small | 1536 | $0.02/1M tokens | Good | General, cost-sensitive |
| text-embedding-3-large | 3072 | $0.13/1M tokens | Best | High-accuracy retrieval |
| nomic-embed-text | 768 | Open source | Good | Self-hosted |
| mxbai-embed-large | 1024 | Open source | Very good | Self-hosted, MTEB top |

---

## Step 3: Vector Databases

### Chroma (Local/Development)

Chroma is an open-source vector database that runs in-process — great for prototyping.

```python
import chromadb
from chromadb.config import Settings

# Persistent local storage
client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="documentation",
    metadata={"hnsw:space": "cosine"},  # cosine similarity
)

def index_chunks(chunks_with_embeddings: list[dict]):
    """Store chunks in Chroma."""
    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks_with_embeddings))],
        embeddings=[c["embedding"] for c in chunks_with_embeddings],
        documents=[c["text"] for c in chunks_with_embeddings],
        metadatas=[c["metadata"] for c in chunks_with_embeddings],
    )

def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Find the most relevant chunks for a query."""
    query_embedding = embed_texts([query])[0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    return [
        {
            "text": doc,
            "metadata": meta,
            "score": 1 - dist,  # convert distance to similarity
        }
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )
    ]
```

### Pinecone (Production)

Pinecone is a managed vector database designed for production scale.

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create index (one-time setup)
pc.create_index(
    name="documentation",
    dimension=1536,  # match your embedding model
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

index = pc.Index("documentation")

def index_chunks_pinecone(chunks_with_embeddings: list[dict]):
    vectors = [
        {
            "id": f"chunk_{i}",
            "values": chunk["embedding"],
            "metadata": {
                "text": chunk["text"],  # store text in metadata for retrieval
                **chunk["metadata"],
            },
        }
        for i, chunk in enumerate(chunks_with_embeddings)
    ]

    # Upsert in batches of 100
    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i : i + 100])

def retrieve_pinecone(query: str, top_k: int = 5, filter: dict = None) -> list[dict]:
    query_embedding = embed_texts([query])[0]

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter,  # e.g., {"source": "api-docs"}
    )

    return [
        {
            "text": match["metadata"]["text"],
            "metadata": match["metadata"],
            "score": match["score"],
        }
        for match in results["matches"]
    ]
```

---

## Step 4: Hybrid Search

Pure semantic search misses exact keyword matches. Hybrid search combines dense (semantic) and sparse (BM25) retrieval:

```python
from rank_bm25 import BM25Okapi

class HybridRetriever:
    def __init__(self, chunks: list[dict]):
        self.chunks = chunks
        # Build BM25 index over tokenized chunks
        tokenized = [c["text"].lower().split() for c in chunks]
        self.bm25 = BM25Okapi(tokenized)

    def retrieve(self, query: str, top_k: int = 10, alpha: float = 0.5) -> list[dict]:
        """
        alpha: weight for semantic search (1-alpha for BM25)
        alpha=1.0: pure semantic; alpha=0.0: pure BM25
        """
        # Semantic scores
        query_embedding = embed_texts([query])[0]
        semantic_scores = self._cosine_scores(query_embedding)

        # BM25 scores
        bm25_scores = self.bm25.get_scores(query.lower().split())

        # Normalize and combine
        semantic_norm = self._normalize(semantic_scores)
        bm25_norm = self._normalize(bm25_scores)

        combined = alpha * semantic_norm + (1 - alpha) * bm25_norm

        # Return top-k by combined score
        top_indices = combined.argsort()[::-1][:top_k]
        return [
            {**self.chunks[i], "score": float(combined[i])}
            for i in top_indices
        ]

    def _normalize(self, scores):
        import numpy as np
        min_s, max_s = scores.min(), scores.max()
        if max_s == min_s:
            return scores
        return (scores - min_s) / (max_s - min_s)
```

Use `alpha=0.7` as a starting point — more weight on semantic similarity for most document corpora.

---

## Step 5: Reranking

Retrieve more candidates than needed, then rerank with a cross-encoder for better precision:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, candidates: list[dict], top_k: int = 3) -> list[dict]:
    """Rerank retrieved candidates using a cross-encoder."""
    pairs = [(query, c["text"]) for c in candidates]
    scores = reranker.predict(pairs)

    ranked = sorted(
        zip(candidates, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    return [
        {**doc, "rerank_score": float(score)}
        for doc, score in ranked[:top_k]
    ]
```

This two-stage approach (retrieve 20, rerank to 3) significantly improves answer quality without the latency cost of reranking thousands of documents.

---

## Step 6: The Complete RAG Pipeline

```python
from openai import OpenAI

openai_client = OpenAI()

def answer_question(query: str, retriever: HybridRetriever) -> dict:
    # Retrieve candidates
    candidates = retriever.retrieve(query, top_k=20)

    # Rerank to top 3
    top_chunks = rerank(query, candidates, top_k=3)

    # Build context
    context = "\n\n---\n\n".join([
        f"[Source: {c['metadata'].get('source', 'unknown')}]\n{c['text']}"
        for c in top_chunks
    ])

    # Generate answer
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant. Answer the user's question based on "
                    "the provided context. If the context doesn't contain the answer, "
                    "say so clearly. Do not make up information."
                )
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}"
            }
        ],
        temperature=0,
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [c["metadata"].get("source") for c in top_chunks],
        "retrieved_chunks": top_chunks,
    }
```

---

## Evaluation with RAGAS

Never ship a RAG pipeline without evaluation:

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

# Build eval dataset from production queries or golden test set
eval_samples = [
    {
        "question": "What is the maximum request size for the API?",
        "answer": result["answer"],
        "contexts": [c["text"] for c in result["retrieved_chunks"]],
        "ground_truth": "The maximum request size is 10MB.",
    }
    for result in run_pipeline_on_test_set()
]

from datasets import Dataset
dataset = Dataset.from_list(eval_samples)

scores = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)
print(scores)
# faithfulness: 0.94, answer_relevancy: 0.87, context_precision: 0.82, context_recall: 0.79
```

A faithfulness score below 0.8 means your LLM is hallucinating outside the retrieved context — review your prompt or retrieval quality. Context recall below 0.7 means you're not retrieving the right chunks — review chunking and embedding strategy.

---

## Key Takeaways

- Chunking strategy matters more than most engineers expect — start with semantic chunking at 800-1000 chars
- Hybrid search (semantic + BM25) outperforms pure semantic for most document corpora
- Two-stage retrieval (retrieve 20, rerank to 3) significantly improves precision
- Evaluate continuously with RAGAS — don't ship without a baseline
- For production: Pinecone or Qdrant; for development: Chroma
- The prompt matters: instruct the LLM to cite sources and admit when it doesn't know
