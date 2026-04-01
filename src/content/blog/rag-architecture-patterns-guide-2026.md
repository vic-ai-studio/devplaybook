---
title: "Building RAG Systems: Architecture Patterns & Pitfalls 2026"
description: "RAG system architecture guide 2026: naive RAG vs advanced RAG, chunking strategies, embedding models, vector databases, reranking, HyDE, parent document retrieval, and evaluation with RAGAS."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["RAG", "retrieval augmented generation", "vector database", "LLM", "embeddings", "LlamaIndex", "LangChain"]
readingTime: "11 min read"
category: "ai"
---

Retrieval-Augmented Generation (RAG) remains the most practical architecture for grounding LLMs in specific knowledge—whether that's a company knowledge base, product documentation, or a personal research corpus. But the gap between a proof-of-concept RAG and one that reliably answers questions in production is enormous.

This guide covers the architectural decisions, pitfalls, and advanced techniques that separate production-grade RAG from the weekend demo.

---

## Why Naive RAG Falls Short

The simplest RAG pipeline looks like this:

1. Split document into fixed-size chunks (e.g., 512 tokens)
2. Embed each chunk with an embedding model
3. Store in a vector database
4. At query time: embed the query, find top-k similar chunks, stuff into LLM prompt

This works for demos. It fails in production for predictable reasons:

| Problem | Symptom | Root Cause |
|---|---|---|
| Lost context | Answer misses crucial details | Chunk boundary cuts mid-paragraph |
| Semantic mismatch | Wrong chunks retrieved | Query phrasing differs from document phrasing |
| Too much noise | Hallucinated answers | Irrelevant chunks dilute the relevant ones |
| Inconsistent answers | Same question, different answers | Non-deterministic retrieval |
| Missing relationships | Fails on multi-hop questions | Chunks retrieved independently |

Each of these has a well-understood fix. Let's go through them.

---

## Chunking Strategies

Chunking is the single highest-leverage decision in RAG system design. Most teams underinvest here.

### Fixed-size chunking (naive)

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", " ", ""]
)
chunks = splitter.split_text(document)
```

Simple, but ignores document structure. A paragraph about pricing might get split mid-sentence.

### Semantic chunking

Group sentences by semantic similarity rather than character count. Sentences with similar embeddings stay in the same chunk.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

chunker = SemanticChunker(
    embeddings=OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95,  # Split where similarity drops most
)
chunks = chunker.split_text(document)
```

Produces more coherent chunks at the cost of variable chunk sizes.

### Hierarchical / parent-document chunking

Store large parent chunks for context, but index small child chunks for precise retrieval. At query time, retrieve small chunks, then return their parent for context.

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore
from langchain_chroma import Chroma

# Small chunks for indexing (precise matching)
child_splitter = RecursiveCharacterTextSplitter(chunk_size=200)
# Large chunks for context (returned to LLM)
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)

vectorstore = Chroma(embedding_function=embeddings)
docstore = InMemoryStore()

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

retriever.add_documents(documents)

# Query returns parent chunks even though child chunks matched
results = retriever.invoke("What is the refund policy?")
```

This addresses the lost-context problem without sacrificing retrieval precision.

---

## Embedding Model Selection

Your embedding model determines how well semantic similarity maps to relevance. The choice matters more than most teams realize.

| Model | Dimension | Context | Strengths | Cost |
|---|---|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | 8191 tokens | Fast, cheap, good general performance | $0.02/1M tokens |
| `text-embedding-3-large` (OpenAI) | 3072 | 8191 tokens | Best OpenAI quality | $0.13/1M tokens |
| `BAAI/bge-m3` (open source) | 1024 | 8192 tokens | Multi-lingual, self-hosted | Free |
| `Cohere embed-v3` | 1024 | 512 tokens | High quality, input type optimization | $0.10/1M tokens |
| `nomic-embed-text` (open source) | 768 | 8192 tokens | Strong quality, self-hosted | Free |

Critical: **embed queries and documents with the same model**. Mixing models destroys retrieval quality.

For production: evaluate on your actual query distribution. Run a set of test queries against 100+ documents and measure recall@5 (did the right document appear in top 5?).

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("BAAI/bge-m3")

def embed_documents(texts: list[str]) -> np.ndarray:
    # BGE models benefit from instruction prefix for documents
    prefixed = [f"Represent this sentence for searching: {t}" for t in texts]
    return model.encode(prefixed, normalize_embeddings=True)

def embed_query(query: str) -> np.ndarray:
    # Queries get a different prefix
    return model.encode(
        f"Represent this question for searching: {query}",
        normalize_embeddings=True
    )
```

---

## Vector Database Options

| Database | Hosting | Strengths | Weaknesses |
|---|---|---|---|
| **pgvector** | Self-hosted / Supabase | SQL queries, ACID, existing Postgres infra | Slower at scale without tuning |
| **Qdrant** | Self-hosted / Cloud | Fast, rich filtering, payload indexing | Newer ecosystem |
| **Pinecone** | Managed only | Simple API, battle-tested | Expensive, vendor lock-in |
| **Weaviate** | Self-hosted / Cloud | Multi-modal, GraphQL, hybrid search | More complex setup |
| **Chroma** | Self-hosted | Great for development/prototyping | Not production-ready at scale |

For most teams: start with **pgvector** if you already have Postgres, or **Qdrant** for dedicated vector workloads.

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(url="http://localhost:6333")

# Create collection
client.create_collection(
    collection_name="knowledge_base",
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
)

# Upsert with metadata payload
client.upsert(
    collection_name="knowledge_base",
    points=[
        PointStruct(
            id=doc_id,
            vector=embedding.tolist(),
            payload={
                "text": chunk_text,
                "source": document_url,
                "section": section_title,
                "created_at": timestamp,
            }
        )
        for doc_id, embedding, chunk_text in zip(ids, embeddings, chunks)
    ]
)

# Query with metadata filter
results = client.search(
    collection_name="knowledge_base",
    query_vector=query_embedding.tolist(),
    query_filter={"must": [{"key": "section", "match": {"value": "pricing"}}]},
    limit=5,
)
```

---

## Advanced Retrieval: HyDE and Multi-Query

### HyDE (Hypothetical Document Embeddings)

Queries are often short and phrased differently from how documents are written. HyDE bridges this gap by generating a hypothetical answer to the query, then embedding that answer to find real documents.

```python
async def hyde_retrieval(query: str, vectorstore, llm) -> list[str]:
    # Generate a hypothetical answer
    hyde_prompt = f"""Write a brief passage that would answer the following question.
    Do not use any external knowledge — write what a relevant document might say.

    Question: {query}
    Passage:"""

    hypothetical_doc = await llm.ainvoke(hyde_prompt)

    # Embed the hypothetical document, not the query
    hyde_embedding = embed_query(hypothetical_doc)

    # Search with the hypothetical document embedding
    results = vectorstore.similarity_search_by_vector(hyde_embedding, k=5)
    return [doc.page_content for doc in results]
```

HyDE works especially well for technical documentation where queries are casual ("how do I reset my password?") but documents are formal ("Password Reset Procedure: Navigate to...").

### Multi-Query Retrieval

Generate multiple phrasings of the same query, retrieve for each, then deduplicate.

```python
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    llm=llm,
)

# Generates 3 query variants internally, retrieves for each, deduplicates
unique_docs = retriever.invoke("What's the cancellation policy for annual plans?")
```

---

## Reranking: The Quality Multiplier

Vector similarity is approximate. After retrieving the top 20 candidates, use a cross-encoder reranker to precisely score each candidate against the query and return the true top 5.

Cross-encoders read the query and document together (not independently), yielding much higher precision.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, candidate_docs: list[str], top_k: int = 5) -> list[str]:
    pairs = [[query, doc] for doc in candidate_docs]
    scores = reranker.predict(pairs)

    # Sort by score, return top_k
    ranked = sorted(zip(scores, candidate_docs), key=lambda x: x[0], reverse=True)
    return [doc for _, doc in ranked[:top_k]]

# Full pipeline: retrieve broadly, rerank precisely
candidates = vectorstore.similarity_search(query, k=20)
candidate_texts = [doc.page_content for doc in candidates]
top_docs = rerank(query, candidate_texts, top_k=5)
```

Cohere's hosted reranker is an excellent API alternative:

```python
import cohere

co = cohere.Client(api_key)

results = co.rerank(
    query=query,
    documents=candidate_texts,
    top_n=5,
    model="rerank-english-v3.0",
)

top_docs = [result.document["text"] for result in results.results]
```

Reranking typically improves answer quality by 15–30% with minimal added latency (50–200ms).

---

## Hybrid Search: Dense + Sparse

Pure vector (dense) search misses exact keyword matches. Combine with BM25 (sparse) search using Reciprocal Rank Fusion (RRF):

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

# Dense retriever
dense_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Sparse retriever (BM25)
bm25_retriever = BM25Retriever.from_documents(documents)
bm25_retriever.k = 10

# Ensemble with equal weights
ensemble = EnsembleRetriever(
    retrievers=[bm25_retriever, dense_retriever],
    weights=[0.5, 0.5]
)

docs = ensemble.invoke(query)
```

Hybrid search excels for queries mixing concepts with proper nouns or product names.

---

## RAG Evaluation with RAGAS

Never trust your RAG system without measuring it. RAGAS provides reference-free evaluation metrics:

| Metric | Measures | Target |
|---|---|---|
| **Faithfulness** | Does the answer stay within the retrieved context? | > 0.85 |
| **Answer Relevancy** | Is the answer relevant to the question? | > 0.80 |
| **Context Precision** | Are retrieved chunks actually useful? | > 0.75 |
| **Context Recall** | Were all relevant chunks retrieved? | > 0.70 |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

# Build evaluation dataset
eval_data = {
    "question": ["What is the return window?", "How do I cancel my subscription?"],
    "answer": [generated_answers],      # Your RAG pipeline outputs
    "contexts": [retrieved_contexts],   # Chunks passed to LLM
    "ground_truth": [correct_answers],  # Optional: known good answers
}

dataset = Dataset.from_dict(eval_data)

result = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(result.to_pandas())
```

Run RAGAS evaluation on a test set of 50–200 questions before and after any pipeline change. Treat it like a test suite — a regression in faithfulness below 0.80 should block deployment.

---

## Production RAG Architecture

A production-ready RAG system layers all the above:

```
Query
  ↓
[Input Guard] — detect harmful/irrelevant queries
  ↓
[Multi-Query Expansion] — generate 3 query variants
  ↓
[Hybrid Retrieval] — dense + BM25, top-20 candidates
  ↓
[Reranker] — cross-encoder, return top-5
  ↓
[Parent Document Lookup] — expand to full parent chunks
  ↓
[LLM Generation] — grounded answer with citations
  ↓
[Output Guard] — faithfulness check, hallucination detection
```

The decisions most teams get wrong:

1. **Using fixed-size chunks only** — add semantic or hierarchical chunking
2. **Skipping reranking** — it's the easiest quality win
3. **Never measuring with RAGAS** — you're flying blind
4. **Using the same model for queries and long documents** — use instruction prefixes or asymmetric models
5. **Retrieving too few candidates** — retrieve 20, rerank to 5, not retrieve 5 directly

Build the simple version first, measure it with RAGAS, then add each optimization only where the metrics show need. Most production teams find that chunking strategy + reranking together explain 80% of quality variance.
