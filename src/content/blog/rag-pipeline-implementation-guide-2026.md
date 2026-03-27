---
title: "Building a Production RAG Pipeline: Complete Implementation Guide 2026"
description: "A comprehensive guide to building production-ready RAG pipelines in 2026. Covers chunking strategies, embedding models, vector store selection, retrieval techniques, reranking, evaluation with RAGAS/TruLens, and LangChain vs LlamaIndex vs custom implementations."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["rag", "retrieval-augmented-generation", "llm", "langchain", "llamaindex", "vector-database", "ai", "python"]
readingTime: "18 min read"
---

Most RAG tutorials show you how to index 10 PDFs and query them with a chatbot. Production RAG is a different animal entirely. You're dealing with millions of documents, inconsistent quality data, latency budgets under 500ms, and answer quality requirements that "it usually works" doesn't satisfy. This guide covers the full engineering discipline of production RAG in 2026 — from chunking strategies to evaluation frameworks.

---

## What Is a RAG Pipeline?

Retrieval-Augmented Generation (RAG) enhances LLM responses by retrieving relevant documents from an external knowledge base before generating an answer. The basic flow:

```
User Query
    ↓
Query Embedding
    ↓
Vector Store Search → Retrieved Chunks (top-k)
    ↓
Context Assembly
    ↓
LLM + Context → Answer
```

RAG solves two fundamental LLM limitations:
1. **Knowledge cutoff** — LLMs don't know about events after training
2. **Hallucination** — LLMs invent facts; RAG grounds responses in real documents

But naive RAG has well-documented failure modes: retrieving irrelevant chunks, truncating context, missing multi-document reasoning, and providing no way to know when it doesn't know. Production RAG requires engineering every stage.

---

## Stage 1: Document Ingestion and Preprocessing

Before you write a single embedding call, you need clean, structured documents. Garbage in, garbage out applies doubly in RAG — bad source documents produce confidently wrong answers.

### Document Loading

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredHTMLLoader,
    JSONLoader,
    DirectoryLoader
)

# PDF with page metadata
loader = PyPDFLoader("docs/technical-manual.pdf")
pages = loader.load()  # Each page is a Document with metadata

# HTML with structure preservation
loader = UnstructuredHTMLLoader("docs/api-reference.html",
    mode="elements",  # Preserves headers, tables, lists
    strategy="hi_res"  # Better accuracy, slower
)

# JSON with jq path extraction
loader = JSONLoader(
    file_path="data/products.json",
    jq_schema=".products[].description",
    text_content=True
)
```

### Document Cleaning

Never skip this step. Real-world documents contain boilerplate, encoding errors, and structural noise:

```python
import re
from langchain_core.documents import Document

def clean_document(doc: Document) -> Document:
    text = doc.page_content

    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)

    # Remove page headers/footers (common in PDFs)
    text = re.sub(r'Page \d+ of \d+', '', text)
    text = re.sub(r'CONFIDENTIAL|DRAFT|INTERNAL USE ONLY', '', text, flags=re.I)

    # Fix common PDF extraction artifacts
    text = text.replace('\x00', '')  # Null bytes
    text = re.sub(r'([a-z])-\n([a-z])', r'\1\2', text)  # Hyphenated line breaks

    # Skip near-empty documents
    if len(text.strip()) < 100:
        return None

    return Document(page_content=text.strip(), metadata=doc.metadata)

cleaned_docs = [d for d in (clean_document(doc) for doc in raw_docs) if d]
```

### Metadata Enrichment

Metadata is as important as content. It powers filtering, attribution, and freshness controls:

```python
from datetime import datetime
import hashlib

def enrich_metadata(doc: Document, source_type: str) -> Document:
    content_hash = hashlib.md5(doc.page_content.encode()).hexdigest()[:8]

    doc.metadata.update({
        "source_type": source_type,          # "pdf", "web", "db"
        "ingested_at": datetime.utcnow().isoformat(),
        "content_hash": content_hash,        # For deduplication
        "word_count": len(doc.page_content.split()),
        "char_count": len(doc.page_content),
    })
    return doc
```

---

## Stage 2: Chunking Strategies

Chunking is where most RAG pipelines go wrong. The chunk size you choose is a trade-off between:
- **Too small**: insufficient context, answers miss the big picture
- **Too large**: irrelevant context dilutes signal, exceeds context windows

### Fixed-Size Chunking (Baseline)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # Characters per chunk
    chunk_overlap=200,      # Overlap between consecutive chunks
    separators=["\n\n", "\n", ". ", " ", ""],  # Priority split order
    length_function=len,
)

chunks = splitter.split_documents(docs)
```

The 1000-char / 200-overlap default works for general prose. For code or structured data, use larger chunks with lower overlap.

### Semantic Chunking (Better for Mixed Content)

Semantic chunking splits at topic boundaries rather than character counts:

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

semantic_splitter = SemanticChunker(
    embeddings,
    breakpoint_threshold_type="percentile",  # or "standard_deviation", "gradient"
    breakpoint_threshold_amount=95,           # Split at 95th percentile similarity drops
)

semantic_chunks = semantic_splitter.split_documents(docs)
```

Semantic chunking produces more coherent chunks but is 10–50x slower and costs embedding API calls during preprocessing. Use it for high-value documents where chunk quality matters most.

### Document-Specific Strategies

Different document types need different approaches:

```python
# Markdown: split at headers to preserve section context
from langchain_text_splitters import MarkdownHeaderTextSplitter

md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
    ],
    strip_headers=False,  # Keep headers in chunks for context
)

# Code: split at function/class boundaries, not mid-logic
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

code_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=2000,   # Code needs larger chunks for context
    chunk_overlap=400,
)

# Tables: keep entire table in one chunk
def split_preserving_tables(text: str) -> list[str]:
    """Split text but never break markdown tables."""
    table_pattern = re.compile(r'\|.+\|[\s\S]*?\n\n', re.MULTILINE)
    tables = {m.start(): m.group() for m in table_pattern.finditer(text)}
    # ... implementation that keeps table boundaries intact
```

### The Parent-Child Chunking Pattern

One of the most effective RAG patterns for 2026: index small chunks for retrieval precision, but return larger parent chunks for generation context:

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore
from langchain_community.vectorstores import Chroma

# Small chunks for precise retrieval
child_splitter = RecursiveCharacterTextSplitter(chunk_size=400)
# Large chunks for generation context
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)

vectorstore = Chroma(embedding_function=embeddings)
store = InMemoryStore()  # Or RedisStore for production

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

retriever.add_documents(docs)

# Retrieval: finds small chunks, returns full parent context
results = retriever.get_relevant_documents("What is the refund policy?")
```

---

## Stage 3: Embedding Models

Your embedding model determines retrieval quality more than any other single factor. In 2026, the landscape:

| Model | Dimensions | Context | Throughput | Cost | Best For |
|-------|-----------|---------|-----------|------|----------|
| `text-embedding-3-small` | 1536 | 8191 tokens | High | $0.02/1M | General purpose, cost-sensitive |
| `text-embedding-3-large` | 3072 | 8191 tokens | Medium | $0.13/1M | High accuracy requirements |
| `voyage-3` | 1024 | 32K tokens | High | $0.06/1M | Long documents, code |
| `Cohere embed-v3` | 1024 | 512 tokens | High | $0.10/1M | Multilingual |
| `nomic-embed-text` | 768 | 8192 tokens | Very high | Free (self-hosted) | On-premise, privacy |

### Embedding with Batching (Production Pattern)

Never embed one document at a time:

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def embed_batch(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """Embed a batch of texts with automatic retry."""
    response = await client.embeddings.create(
        input=texts,
        model=model,
    )
    return [item.embedding for item in response.data]

async def embed_documents_parallel(
    texts: list[str],
    batch_size: int = 100,
    max_concurrent: int = 10,
) -> list[list[float]]:
    """Embed all documents with batching and concurrency control."""
    semaphore = asyncio.Semaphore(max_concurrent)
    batches = [texts[i:i+batch_size] for i in range(0, len(texts), batch_size)]

    async def embed_with_semaphore(batch):
        async with semaphore:
            return await embed_batch(batch)

    results = await asyncio.gather(*[embed_with_semaphore(b) for b in batches])
    return [embedding for batch_result in results for embedding in batch_result]
```

---

## Stage 4: Vector Store Selection

| Store | Hosting | Scale | Query Latency | Metadata Filtering | Best For |
|-------|---------|-------|---------------|-------------------|----------|
| **Pinecone** | Managed | 1B+ vectors | <100ms | Yes | Enterprise, managed ops |
| **Weaviate** | Self/Cloud | 100M+ | <50ms | Yes (GraphQL) | Hybrid search, open source |
| **Qdrant** | Self/Cloud | 100M+ | <10ms | Yes | High performance, open source |
| **pgvector** | Self | 10M | <200ms | SQL | Existing Postgres stack |
| **Chroma** | Self | 1M | <50ms | Yes | Development, small production |
| **Milvus** | Self/Cloud | 1B+ | <50ms | Yes | Very large scale |

### pgvector for Existing Postgres Stacks

If you already run Postgres, pgvector is often the right answer — no new infrastructure:

```sql
-- Enable extension
CREATE EXTENSION vector;

-- Documents table with embedding
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),     -- Dimension matches your model
    source VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Similarity search with metadata filter
SELECT content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE source = 'product-manual'          -- Metadata filter
  AND created_at > NOW() - INTERVAL '30 days'  -- Freshness filter
ORDER BY embedding <=> $1::vector        -- Cosine distance sort
LIMIT 5;
```

### Qdrant for High-Performance Production

```python
from qdrant_client import QdrantClient
from qdrant_client.http import models

client = QdrantClient(url="http://localhost:6333")

# Create collection with HNSW parameters
client.create_collection(
    collection_name="docs",
    vectors_config=models.VectorParams(
        size=1536,
        distance=models.Distance.COSINE,
    ),
    hnsw_config=models.HnswConfigDiff(
        m=16,                    # Higher = better recall, more memory
        ef_construct=100,        # Higher = better recall, slower indexing
        full_scan_threshold=10000,  # Below this, do brute-force
    ),
    optimizers_config=models.OptimizersConfigDiff(
        indexing_threshold=20000,   # Build index after 20k vectors
    ),
)

# Upsert with payload (metadata)
client.upsert(
    collection_name="docs",
    points=[
        models.PointStruct(
            id=str(doc_id),
            vector=embedding,
            payload={
                "content": chunk_text,
                "source": "user-guide",
                "page": 42,
                "section": "installation",
            }
        )
        for doc_id, embedding, chunk_text in zip(ids, embeddings, texts)
    ]
)

# Search with filters
results = client.search(
    collection_name="docs",
    query_vector=query_embedding,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="source",
                match=models.MatchValue(value="user-guide")
            )
        ]
    ),
    limit=5,
    with_payload=True,
)
```

---

## Stage 5: Retrieval Techniques

### Hybrid Search (Dense + Sparse)

Pure vector search misses exact keyword matches. Hybrid search combines:
- **Dense retrieval**: semantic similarity via embeddings
- **Sparse retrieval**: BM25/TF-IDF for exact term matching

```python
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# Dense retriever (vector similarity)
dense_retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 10}
)

# Sparse retriever (keyword match)
bm25_retriever = BM25Retriever.from_documents(docs, k=10)

# Combine with Reciprocal Rank Fusion
ensemble_retriever = EnsembleRetriever(
    retrievers=[dense_retriever, bm25_retriever],
    weights=[0.6, 0.4]  # Tune based on your domain
)

results = ensemble_retriever.get_relevant_documents(query)
```

Hybrid search consistently outperforms pure vector search on technical content with specific terminology (model names, version numbers, error codes).

### Multi-Query Retrieval

Single queries fail when users phrase questions differently than documents are written. Generate multiple query variants:

```python
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    llm=llm,
)

# For "How do I cancel a subscription?", generates:
# - "subscription cancellation process"
# - "how to stop a recurring payment"
# - "unsubscribe account steps"
# Retrieves for all, deduplicates
unique_docs = retriever.get_relevant_documents("How do I cancel a subscription?")
```

### Contextual Compression

Retrieved chunks often contain more text than needed. Contextual compression extracts only the relevant portion:

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=ensemble_retriever
)

# Returns only the sentences relevant to the query, not the full chunk
compressed_docs = compression_retriever.get_relevant_documents(query)
```

---

## Stage 6: Reranking

Initial retrieval with top-k=20 gives you recall. Reranking gives you precision. A cross-encoder reranker scores query-document pairs jointly (much more accurate than bi-encoder similarity):

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, docs: list, top_n: int = 5) -> list:
    pairs = [(query, doc.page_content) for doc in docs]
    scores = reranker.predict(pairs)

    ranked = sorted(zip(scores, docs), key=lambda x: x[0], reverse=True)
    return [doc for _, doc in ranked[:top_n]]

# Retrieve wide, rerank narrow
initial_docs = retriever.get_relevant_documents(query)  # top-20
final_docs = rerank(query, initial_docs, top_n=5)        # rerank to top-5
```

**Cohere Rerank API** (managed option):

```python
import cohere

co = cohere.Client(api_key="YOUR_COHERE_KEY")

response = co.rerank(
    query=query,
    documents=[doc.page_content for doc in initial_docs],
    model="rerank-english-v3.0",
    top_n=5,
)

reranked_docs = [initial_docs[r.index] for r in response.results]
```

Reranking typically improves answer quality by 10–25% on complex queries. The latency cost (50–150ms) is almost always worth it.

---

## Stage 7: Generation with Context

### Prompt Engineering for RAG

```python
from langchain_core.prompts import ChatPromptTemplate

RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant. Answer the user's question based only on the provided context.

If the context doesn't contain enough information to answer confidently, say "I don't have enough information to answer that." Do not fabricate information.

Context:
{context}

Instructions:
- Be specific and cite the source when possible
- If the answer spans multiple documents, synthesize them
- If documents contradict each other, acknowledge the conflict"""),
    ("human", "{question}")
])

def format_context(docs) -> str:
    return "\n\n---\n\n".join([
        f"Source: {doc.metadata.get('source', 'Unknown')}\n{doc.page_content}"
        for doc in docs
    ])

chain = RAG_PROMPT | llm

answer = chain.invoke({
    "context": format_context(final_docs),
    "question": query
})
```

### Streaming Responses

```python
async def rag_stream(query: str):
    docs = await retriever.aget_relevant_documents(query)
    reranked = rerank(query, docs)

    async for chunk in chain.astream({
        "context": format_context(reranked),
        "question": query
    }):
        yield chunk.content
```

---

## Stage 8: Evaluation with RAGAS and TruLens

Evaluation is where most RAG projects fail to invest. Without metrics, you're flying blind.

### RAGAS: RAG-Specific Metrics

RAGAS provides four key metrics:

| Metric | Measures | Ideal |
|--------|----------|-------|
| **Faithfulness** | Is the answer grounded in retrieved context? | 1.0 |
| **Answer Relevancy** | Does the answer address the question? | 1.0 |
| **Context Precision** | Are retrieved chunks actually relevant? | 1.0 |
| **Context Recall** | Did retrieval capture all needed information? | 1.0 |

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Build evaluation dataset
eval_data = {
    "question": ["What is the refund policy?", "How do I reset my password?"],
    "answer": [generated_answers],
    "contexts": [retrieved_chunks_per_question],
    "ground_truth": ["The refund policy is...", "To reset your password..."],
}

dataset = Dataset.from_dict(eval_data)

results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(results)
# faithfulness: 0.87
# answer_relevancy: 0.91
# context_precision: 0.79
# context_recall: 0.83
```

### TruLens: Production Monitoring

RAGAS is for offline evaluation. TruLens monitors production RAG in real time:

```python
from trulens_eval import Tru, TruChain, Feedback
from trulens_eval.feedback.provider import OpenAI

tru = Tru()
provider = OpenAI()

# Define feedback functions
f_qa_relevance = Feedback(
    provider.relevance_with_cot_reasons,
    name="Answer Relevance"
).on_input_output()

f_context_relevance = Feedback(
    provider.context_relevance_with_cot_reasons,
    name="Context Relevance"
).on_input().on(TruChain.select_context()).aggregate(np.mean)

f_groundedness = Feedback(
    provider.groundedness_measure_with_cot_reasons,
    name="Groundedness"
).on(TruChain.select_context()).on_output().aggregate(np.mean)

# Wrap your RAG chain
tru_recorder = TruChain(
    rag_chain,
    app_id="production-rag-v1",
    feedbacks=[f_qa_relevance, f_context_relevance, f_groundedness],
)

with tru_recorder as recording:
    answer = rag_chain.invoke({"question": user_query})

# View dashboard
tru.run_dashboard()  # http://localhost:8501
```

---

## LangChain vs LlamaIndex vs Custom: Which to Use?

This is the most common question in 2026 and the answer depends on your complexity:

### LangChain

**Best for:** Chains with multiple steps, agents, tool use, complex prompt logic

```python
from langchain.chains import RetrievalQA

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",       # "map_reduce" or "refine" for large contexts
    retriever=retriever,
    return_source_documents=True,
)
```

LangChain's ecosystem is the broadest — 200+ integrations, extensive documentation, active community. The downside: abstraction overhead and verbose configuration.

### LlamaIndex

**Best for:** Document-heavy applications, complex indexing, knowledge graphs

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine

documents = SimpleDirectoryReader("docs/").load_data()
index = VectorStoreIndex.from_documents(documents)

retriever = VectorIndexRetriever(index=index, similarity_top_k=10)
query_engine = RetrieverQueryEngine(retriever=retriever)

response = query_engine.query("What is the pricing model?")
```

LlamaIndex is purpose-built for RAG and offers more sophisticated indexing primitives (knowledge graphs, hierarchical indexing, multi-modal). Better for pure retrieval applications.

### Custom (Recommended for Production at Scale)

When you know exactly what you need, frameworks add overhead. A custom pipeline:

```python
class ProductionRAG:
    def __init__(self, vector_store, reranker, llm):
        self.vector_store = vector_store
        self.reranker = reranker
        self.llm = llm
        self.cache = {}  # Redis in production

    async def query(self, question: str, filters: dict = None) -> dict:
        cache_key = f"{question}:{filters}"
        if cached := self.cache.get(cache_key):
            return cached

        # 1. Retrieve
        initial_docs = await self.vector_store.asimilarity_search(
            question, k=20, filter=filters
        )

        # 2. Rerank
        final_docs = self.reranker.rerank(question, initial_docs, top_n=5)

        # 3. Generate
        context = self._format_context(final_docs)
        answer = await self.llm.ainvoke(self._build_prompt(question, context))

        result = {
            "answer": answer.content,
            "sources": [d.metadata for d in final_docs],
            "retrieved_count": len(initial_docs),
        }
        self.cache[cache_key] = result
        return result
```

Custom pipelines are typically 2–5x faster and easier to debug than framework-based implementations at scale.

---

## Production Checklist

Before deploying your RAG pipeline:

- [ ] **Chunking validated**: sample 100 chunks, verify they contain coherent, complete thoughts
- [ ] **Embedding model fixed**: never change the embedding model without re-indexing all documents
- [ ] **Metadata schema documented**: source, date, type fields consistently populated
- [ ] **Retrieval baseline set**: RAGAS context precision > 0.75 on test set
- [ ] **Faithfulness monitored**: TruLens groundedness > 0.80 in production
- [ ] **Cache layer added**: semantic caching for repeated queries (GPTCache, Redis)
- [ ] **Rate limits handled**: exponential backoff on embedding API calls
- [ ] **Re-indexing pipeline**: scheduled job to update documents and handle deletions
- [ ] **No-answer handling**: explicit "I don't know" path when context is insufficient

---

## Next Steps

- Browse DevPlaybook's [AI Tools collection](/tools/ai) for vector database comparison tools and RAG calculators
- Check [LangChain vs LlamaIndex comparison](/blog/langchain-vs-llamaindex-vs-haystack-rag-comparison-2026) for a deeper framework analysis

For more developer utilities, production configs, and battle-tested templates, check out the **DevToolkit Starter Kit** — includes RAG pipeline templates, vector store setup scripts, and evaluation harnesses.

👉 [Get the DevToolkit Starter Kit on Gumroad](https://vicnail.gumroad.com/l/devtoolkit)
