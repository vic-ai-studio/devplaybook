---
title: "Building Production RAG Systems with LlamaIndex and Vector Databases 2026"
description: "Complete guide to building production-ready RAG systems with LlamaIndex v0.10+. Covers chunking strategies, embedding models, Chroma, Pinecone, Weaviate integration, and advanced retrieval patterns."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["llamaindex", "rag", "vector-database", "python", "llm", "embeddings", "pinecone", "chroma"]
readingTime: "14 min read"
---

Retrieval-Augmented Generation (RAG) has moved from experimental prototype to production backbone. In 2026, teams building LLM-powered products rely on RAG to ground responses in real data, cut hallucination rates, and stay cost-efficient without fine-tuning. LlamaIndex v0.10+ — now shipped as the modular `llama-index-core` package — is the most battle-tested framework for building these pipelines in Python.

This guide walks through every layer of a production RAG system: document ingestion, chunking, embeddings, vector database integration (Chroma, Pinecone, Weaviate), advanced retrieval patterns, evaluation, and the operational concerns that determine whether your system survives real traffic.

---

## Why RAG? Why LlamaIndex in 2026?

Large context windows (128k–1M tokens) made some developers question whether RAG was still necessary. The answer is yes, for several reasons:

- **Cost**: Stuffing 500 documents into every prompt is expensive. RAG retrieves only the 3–10 most relevant chunks.
- **Latency**: Shorter prompts mean faster time-to-first-token.
- **Freshness**: Vector stores update incrementally. You can't retrain a model on today's news.
- **Attribution**: RAG returns source nodes, enabling citations and audit trails.

LlamaIndex v0.10+ restructured the entire codebase into composable pip packages (`llama-index-core`, `llama-index-llms-openai`, `llama-index-vector-stores-chroma`, etc.), making it easier to swap components without pulling in unnecessary dependencies.

```bash
pip install llama-index-core llama-index-llms-openai llama-index-embeddings-openai
pip install llama-index-vector-stores-chroma llama-index-vector-stores-pinecone
pip install llama-index-vector-stores-weaviate llama-index-retrievers-bm25
pip install llama-index-postprocessor-cohere-rerank ragas
```

---

## LlamaIndex v0.10+ Architecture

Before writing code, understand the four core abstractions:

| Abstraction | Role |
|---|---|
| `Document` | Raw input — text, PDF, HTML, JSON |
| `Node` (TextNode) | Chunked unit of text with metadata and embedding |
| `Index` | Data structure mapping queries to nodes (VectorStoreIndex, KeywordTableIndex, etc.) |
| `QueryEngine` | Orchestrates retrieval + response synthesis |

The data flow is:

```
Documents → NodeParser → Nodes → Embeddings → VectorStore
                                                    ↓
Query → Embedding → Similarity Search → Retrieved Nodes → LLM → Response
```

LlamaIndex's `ServiceContext` was replaced in v0.10+ by `Settings` — a global config object that sets your LLM, embedding model, and chunk parameters once.

```python
from llama_index.core import Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(model="gpt-4o", temperature=0.1)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")
Settings.chunk_size = 512
Settings.chunk_overlap = 64
```

---

## Document Loading and Parsing

### SimpleDirectoryReader

The fastest way to ingest a folder of mixed-format files:

```python
from llama_index.core import SimpleDirectoryReader

documents = SimpleDirectoryReader(
    input_dir="./docs",
    recursive=True,
    required_exts=[".pdf", ".md", ".txt", ".html"],
    filename_as_id=True,  # use filename as doc ID for deduplication
).load_data()

print(f"Loaded {len(documents)} documents")
```

`SimpleDirectoryReader` auto-detects format and uses the appropriate parser. For PDFs it falls back to `pypdf`; install `pymupdf` for better table and layout extraction.

### Custom Loaders

For databases, APIs, or proprietary formats, implement `BaseReader`:

```python
from llama_index.core.readers.base import BaseReader
from llama_index.core import Document
from typing import List
import httpx

class ConfluenceSpaceReader(BaseReader):
    def __init__(self, base_url: str, token: str, space_key: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}
        self.space_key = space_key

    def load_data(self) -> List[Document]:
        docs = []
        url = f"{self.base_url}/rest/api/content"
        params = {"spaceKey": self.space_key, "type": "page", "limit": 100}

        while url:
            resp = httpx.get(url, headers=self.headers, params=params)
            data = resp.json()
            for page in data["results"]:
                content = page["body"]["storage"]["value"]
                docs.append(Document(
                    text=content,
                    metadata={
                        "title": page["title"],
                        "url": f"{self.base_url}/wiki{page['_links']['webui']}",
                        "last_modified": page["version"]["when"],
                    },
                    doc_id=page["id"],
                ))
            url = data.get("_links", {}).get("next")

        return docs
```

### Metadata Enrichment

Always attach metadata before indexing. It enables filtered retrieval later:

```python
from llama_index.core import Document
from datetime import datetime

for doc in documents:
    doc.metadata.update({
        "ingested_at": datetime.utcnow().isoformat(),
        "source": "internal-wiki",
        "language": "en",
    })
    # Exclude heavy metadata from embedding to save tokens
    doc.excluded_embed_metadata_keys = ["ingested_at"]
    doc.excluded_llm_metadata_keys = ["ingested_at", "language"]
```

---

## Chunking Strategies

Chunking is the single biggest lever on RAG quality. The default `SentenceSplitter` works for demos; production systems need more care.

### 1. Sentence Splitter (Baseline)

```python
from llama_index.core.node_parser import SentenceSplitter

parser = SentenceSplitter(
    chunk_size=512,
    chunk_overlap=64,
    paragraph_separator="\n\n",
)
nodes = parser.get_nodes_from_documents(documents)
```

Good for: general text, blog posts, documentation.

### 2. Semantic Chunking

Groups sentences by embedding similarity rather than fixed token counts. Avoids splitting mid-idea.

```python
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.openai import OpenAIEmbedding

semantic_parser = SemanticSplitterNodeParser(
    buffer_size=1,          # sentences to consider on each side
    breakpoint_percentile_threshold=95,  # higher = fewer, larger chunks
    embed_model=OpenAIEmbedding(),
)
nodes = semantic_parser.get_nodes_from_documents(documents)
```

Good for: long-form documents where topic boundaries matter (research papers, legal docs).

### 3. Sentence Window Node Parser

Stores each sentence as a node but embeds a surrounding window. At retrieval time, the full window is returned to the LLM — giving local context without enlarging the embedding.

```python
from llama_index.core.node_parser import SentenceWindowNodeParser

window_parser = SentenceWindowNodeParser.from_defaults(
    window_size=3,           # 3 sentences before + after
    window_metadata_key="window",
    original_text_metadata_key="original_sentence",
)
nodes = window_parser.get_nodes_from_documents(documents)
```

Pair this with `MetadataReplacementPostProcessor` at query time to swap the sentence back to its window before passing to the LLM.

```python
from llama_index.core.postprocessor import MetadataReplacementPostProcessor

postproc = MetadataReplacementPostProcessor(target_metadata_key="window")
```

### 4. Hierarchical / Auto-Merging

Creates parent nodes (large chunks) and child nodes (small chunks). Retrieval fetches children; if enough children from one parent match, the parent chunk is returned instead. Best recall with coherent context.

```python
from llama_index.core.node_parser import HierarchicalNodeParser, get_leaf_nodes

hier_parser = HierarchicalNodeParser.from_defaults(
    chunk_sizes=[2048, 512, 128],  # parent → child → grandchild
)
all_nodes = hier_parser.get_nodes_from_documents(documents)
leaf_nodes = get_leaf_nodes(all_nodes)

# Only leaf nodes get embedded; parent nodes stored for context retrieval
```

---

## Embedding Models Comparison

| Model | Dims | Cost | Notes |
|---|---|---|---|
| `text-embedding-3-large` (OpenAI) | 3072 | ~$0.13/M tokens | Best quality, adjustable dims |
| `text-embedding-3-small` (OpenAI) | 1536 | ~$0.02/M tokens | 5x cheaper, good for high-volume |
| `BAAI/bge-large-en-v1.5` | 1024 | Free | Strong open-source option |
| `sentence-transformers/all-MiniLM-L6-v2` | 384 | Free | Fast, small, good for prototyping |
| Cohere `embed-english-v3.0` | 1024 | ~$0.10/M tokens | Excellent for reranking pipelines |

### Local Sentence Transformers

```python
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-large-en-v1.5",
    device="cuda",          # or "cpu"
    embed_batch_size=32,
    normalize=True,
)
Settings.embed_model = embed_model
```

### Cohere Embeddings

```python
from llama_index.embeddings.cohere import CohereEmbedding

embed_model = CohereEmbedding(
    api_key="your-cohere-key",
    model_name="embed-english-v3.0",
    input_type="search_document",   # use "search_query" at query time
)
```

---

## Vector Databases: Chroma, Pinecone, Weaviate

### Chroma (Local / Self-Hosted)

Best for: development, on-prem, privacy-sensitive workloads.

```python
import chromadb
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext, VectorStoreIndex

# Persistent local Chroma
chroma_client = chromadb.PersistentClient(path="./chroma_db")
chroma_collection = chroma_client.get_or_create_collection(
    name="devplaybook_docs",
    metadata={"hnsw:space": "cosine"},
)

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

index = VectorStoreIndex(
    nodes=nodes,
    storage_context=storage_context,
    show_progress=True,
)
```

To reload without re-embedding:

```python
index = VectorStoreIndex.from_vector_store(
    vector_store=vector_store,
)
```

### Pinecone (Managed Cloud)

Best for: production, horizontal scale, multi-region.

```python
from pinecone import Pinecone, ServerlessSpec
from llama_index.vector_stores.pinecone import PineconeVectorStore

pc = Pinecone(api_key="your-pinecone-key")

# Create serverless index (us-east-1 is cheapest)
if "devplaybook" not in pc.list_indexes().names():
    pc.create_index(
        name="devplaybook",
        dimension=3072,            # match your embedding model
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

pinecone_index = pc.Index("devplaybook")
vector_store = PineconeVectorStore(
    pinecone_index=pinecone_index,
    namespace="v1",                # namespace for versioning
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex(nodes=nodes, storage_context=storage_context)
```

Metadata filtering at query time:

```python
from llama_index.core.vector_stores import MetadataFilter, MetadataFilters

filters = MetadataFilters(filters=[
    MetadataFilter(key="source", value="internal-wiki"),
    MetadataFilter(key="language", value="en"),
])

retriever = index.as_retriever(similarity_top_k=8, filters=filters)
```

### Weaviate (Hybrid Search)

Best for: hybrid BM25 + vector search, GraphQL-style filtering.

```python
import weaviate
from llama_index.vector_stores.weaviate import WeaviateVectorStore

client = weaviate.connect_to_weaviate_cloud(
    cluster_url="https://your-cluster.weaviate.network",
    auth_credentials=weaviate.auth.AuthApiKey("your-weaviate-key"),
)

vector_store = WeaviateVectorStore(
    weaviate_client=client,
    index_name="DevPlaybookDocs",
    text_key="content",
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex(nodes=nodes, storage_context=storage_context)
```

Weaviate's hybrid retriever combines dense + sparse search natively:

```python
from llama_index.retrievers.weaviate import WeaviateHybridSearchRetriever

retriever = WeaviateHybridSearchRetriever(
    client=client,
    index_name="DevPlaybookDocs",
    text_key="content",
    alpha=0.5,      # 0 = pure BM25, 1 = pure vector
    similarity_top_k=10,
)
```

---

## Advanced Retrieval Patterns

### HyDE (Hypothetical Document Embeddings)

Instead of embedding the raw query, ask the LLM to generate a hypothetical answer and embed that. The hypothesis is often a better semantic match to real documents than a short query.

```python
from llama_index.core.indices.query.query_transform import HyDEQueryTransform
from llama_index.core.query_engine import TransformQueryEngine

hyde_transform = HyDEQueryTransform(include_original=True)

base_query_engine = index.as_query_engine(similarity_top_k=10)
hyde_query_engine = TransformQueryEngine(base_query_engine, hyde_transform)

response = hyde_query_engine.query("What are the best practices for database indexing?")
```

### BM25 Hybrid Retrieval

Combine keyword (BM25) and vector retrievers, then fuse results:

```python
from llama_index.retrievers.bm25 import BM25Retriever
from llama_index.core.retrievers import QueryFusionRetriever

bm25_retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=10,
)
vector_retriever = index.as_retriever(similarity_top_k=10)

fusion_retriever = QueryFusionRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    similarity_top_k=6,
    num_queries=4,              # generates query variations
    mode="reciprocal_rerank",   # RRF fusion
    use_async=True,
)
```

### Reranking with Cohere

After retrieval, rerank the top-K candidates with a cross-encoder for much better precision:

```python
from llama_index.postprocessor.cohere_rerank import CohereRerank

cohere_reranker = CohereRerank(
    api_key="your-cohere-key",
    model="rerank-english-v3.0",
    top_n=4,
)

query_engine = index.as_query_engine(
    similarity_top_k=16,        # retrieve more, rerank to fewer
    node_postprocessors=[cohere_reranker],
)
```

### BGE Reranker (Local)

For zero-cost reranking without external API calls:

```python
from llama_index.postprocessor.flag_embedding_reranker import FlagEmbeddingReranker

reranker = FlagEmbeddingReranker(
    model="BAAI/bge-reranker-large",
    top_n=4,
)

query_engine = index.as_query_engine(
    similarity_top_k=16,
    node_postprocessors=[reranker],
)
```

---

## Query Engine Setup and Response Synthesis

### Basic Query Engine

```python
query_engine = index.as_query_engine(
    similarity_top_k=6,
    response_mode="compact",    # tree_summarize | refine | compact | simple_summarize
    streaming=True,
)

streaming_response = query_engine.query("Explain vector quantization in RAG systems.")
streaming_response.print_response_stream()
```

### Custom Response Synthesizer

```python
from llama_index.core.response_synthesizers import get_response_synthesizer

synthesizer = get_response_synthesizer(
    response_mode="tree_summarize",
    use_async=True,
    streaming=False,
    verbose=True,
)

from llama_index.core.query_engine import RetrieverQueryEngine

query_engine = RetrieverQueryEngine(
    retriever=fusion_retriever,
    response_synthesizer=synthesizer,
    node_postprocessors=[cohere_reranker],
)
```

### Chat Engine with Memory

```python
from llama_index.core.memory import ChatMemoryBuffer

memory = ChatMemoryBuffer.from_defaults(token_limit=4096)

chat_engine = index.as_chat_engine(
    chat_mode="context",
    memory=memory,
    system_prompt=(
        "You are a technical assistant. Answer based on the provided context. "
        "If the context doesn't contain the answer, say so clearly."
    ),
)

response = chat_engine.chat("What is sentence window retrieval?")
print(response.response)
```

---

## Evaluating RAG Quality with Ragas

Never deploy a RAG system without baseline evaluation metrics. Ragas is the standard framework:

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
    answer_correctness,
)
from datasets import Dataset

# Build evaluation dataset
questions = [
    "What chunking strategy is best for legal documents?",
    "How does HyDE improve retrieval?",
    "What is the difference between Chroma and Pinecone?",
]

# Generate answers and collect contexts
eval_data = {"question": [], "answer": [], "contexts": [], "ground_truth": []}

for q in questions:
    result = query_engine.query(q)
    eval_data["question"].append(q)
    eval_data["answer"].append(str(result.response))
    eval_data["contexts"].append([n.text for n in result.source_nodes])
    eval_data["ground_truth"].append("...")  # your reference answers

dataset = Dataset.from_dict(eval_data)

results = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
    llm=ChatOpenAI(model="gpt-4o"),
    embeddings=OpenAIEmbeddings(),
)

print(results)
# faithfulness: 0.94 | answer_relevancy: 0.91 | context_precision: 0.88
```

**Target benchmarks for production:**
- Faithfulness ≥ 0.90 (LLM isn't hallucinating beyond retrieved context)
- Answer Relevancy ≥ 0.85 (answers the actual question)
- Context Precision ≥ 0.80 (retrieved chunks are relevant)

---

## Production Considerations

### 1. Caching with Redis

Embedding generation and LLM calls are the two cost drivers. Cache both:

```python
from llama_index.core import Settings
from llama_index.storage.kvstore.redis import RedisKVStore
from llama_index.core.storage.index_store import KeyValueIndexStore

# Embedding cache — avoids re-embedding unchanged documents
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.embeddings import resolve_embed_model
from llama_index.storage.kvstore.redis import RedisKVStore as RedisCache

redis_cache = RedisCache.from_host_and_port("localhost", 6379)

# LLM response cache (llama-index uses `llama_index.core.llms.callbacks`)
import llama_index.core
llama_index.core.global_handler = "simple"  # or arize-phoenix for full tracing
```

### 2. Async Indexing Pipeline

For ingesting large document sets, use async throughout:

```python
import asyncio
from llama_index.core import VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding

pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(chunk_size=512, chunk_overlap=64),
        OpenAIEmbedding(model="text-embedding-3-large"),
    ],
    vector_store=vector_store,
    cache=IngestionCache(),     # deduplicate re-runs
)

async def ingest_documents(docs):
    nodes = await pipeline.arun(documents=docs, num_workers=4)
    print(f"Indexed {len(nodes)} nodes")

asyncio.run(ingest_documents(documents))
```

### 3. Incremental Updates

Don't re-index everything when documents change. Use document IDs for upsert:

```python
from llama_index.core.indices.utils import get_all_nodes

# On update: delete old nodes, insert new
def update_document(index, updated_doc):
    # Remove old nodes for this document
    index.delete_ref_doc(updated_doc.doc_id, delete_from_docstore=True)
    # Re-insert updated document
    index.insert(updated_doc)
    print(f"Updated document {updated_doc.doc_id}")
```

### 4. Observability with Arize Phoenix

```python
import phoenix as px
from openinference.instrumentation.llama_index import LlamaIndexInstrumentor
from opentelemetry.sdk.trace import TracerProvider

# Launch Phoenix locally
session = px.launch_app()

# Instrument all LlamaIndex calls
tracer_provider = TracerProvider()
LlamaIndexInstrumentor().instrument(tracer_provider=tracer_provider)

# All queries now appear in Phoenix UI at http://localhost:6006
```

Phoenix captures: query, retrieved nodes with scores, LLM prompt, response, latency. Essential for debugging low-quality retrievals.

### 5. Rate Limiting and Batching

```python
from llama_index.core.embeddings import BaseEmbedding
import asyncio

# Control embedding concurrency to avoid rate limits
Settings.embed_model = OpenAIEmbedding(
    model="text-embedding-3-large",
    embed_batch_size=100,       # OpenAI allows up to 2048
    max_retries=3,
    timeout=60.0,
)

# For Pinecone upserts, batch in groups of 100
PINECONE_BATCH_SIZE = 100
```

---

## Complete End-to-End Example

Here is a minimal but complete production RAG system wiring all components together:

```python
import os
import asyncio
import chromadb
from llama_index.core import (
    Settings,
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
)
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core.postprocessor import MetadataReplacementPostProcessor
from llama_index.core.postprocessor.flag_embedding_reranker import FlagEmbeddingReranker
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.retrievers.bm25 import BM25Retriever
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.ingestion import IngestionPipeline

# ── 1. Global Settings ──────────────────────────────────────────
Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.0)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.chunk_size = 512
Settings.chunk_overlap = 64

# ── 2. Document Loading ─────────────────────────────────────────
documents = SimpleDirectoryReader(
    input_dir="./knowledge_base",
    recursive=True,
    filename_as_id=True,
).load_data()
print(f"Loaded {len(documents)} documents")

# ── 3. Sentence Window Chunking ─────────────────────────────────
node_parser = SentenceWindowNodeParser.from_defaults(
    window_size=3,
    window_metadata_key="window",
    original_text_metadata_key="original_sentence",
)

# ── 4. Ingestion Pipeline ───────────────────────────────────────
chroma_client = chromadb.PersistentClient(path="./prod_chroma_db")
collection = chroma_client.get_or_create_collection(
    name="knowledge_base",
    metadata={"hnsw:space": "cosine"},
)
vector_store = ChromaVectorStore(chroma_collection=collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

pipeline = IngestionPipeline(
    transformations=[node_parser, Settings.embed_model],
    vector_store=vector_store,
)
nodes = pipeline.run(documents=documents, show_progress=True)
print(f"Indexed {len(nodes)} nodes")

# ── 5. Retriever Setup ──────────────────────────────────────────
index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
vector_retriever = index.as_retriever(similarity_top_k=10)
bm25_retriever = BM25Retriever.from_defaults(nodes=nodes, similarity_top_k=10)

fusion_retriever = QueryFusionRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    similarity_top_k=8,
    num_queries=3,
    mode="reciprocal_rerank",
    use_async=True,
)

# ── 6. Post-processors ──────────────────────────────────────────
window_replacer = MetadataReplacementPostProcessor(target_metadata_key="window")
reranker = FlagEmbeddingReranker(model="BAAI/bge-reranker-base", top_n=4)

# ── 7. Query Engine ─────────────────────────────────────────────
synthesizer = get_response_synthesizer(
    response_mode="compact",
    use_async=True,
)

query_engine = RetrieverQueryEngine(
    retriever=fusion_retriever,
    response_synthesizer=synthesizer,
    node_postprocessors=[window_replacer, reranker],
)

# ── 8. Query ────────────────────────────────────────────────────
async def ask(question: str):
    response = await query_engine.aquery(question)
    print(f"\nQ: {question}")
    print(f"A: {response.response}")
    print(f"\nSources ({len(response.source_nodes)}):")
    for node in response.source_nodes:
        print(f"  [{node.score:.3f}] {node.metadata.get('file_name', 'unknown')}")

if __name__ == "__main__":
    asyncio.run(ask("What are the trade-offs between Chroma and Pinecone for production RAG?"))
```

---

## Choosing the Right Stack

| Scenario | Recommended Stack |
|---|---|
| Local dev / prototyping | Chroma + SentenceSplitter + OpenAI embeddings |
| Production, high scale | Pinecone Serverless + SemanticChunker + text-embedding-3-large + Cohere rerank |
| Privacy / on-prem | Weaviate self-hosted + BGE embeddings + BGE reranker |
| Mixed keyword + semantic | Weaviate hybrid or BM25 + vector fusion retriever |
| Long docs (legal, research) | HierarchicalNodeParser + AutoMergeRetriever |

## Conclusion

Production RAG in 2026 is not just "embed everything and call it done." The quality gap between a naive pipeline and a well-tuned one is measured in percentage points of faithfulness and user satisfaction. The levers are clear:

1. **Chunking strategy** — sentence window or hierarchical for most use cases
2. **Embedding model** — `text-embedding-3-large` or `bge-large` are the defaults
3. **Hybrid retrieval** — BM25 + vector fusion consistently outperforms either alone
4. **Reranking** — Cohere or BGE reranker adds 5–15% precision on top of retrieval
5. **Evaluation** — Ragas metrics before and after every change

LlamaIndex v0.10+'s modular architecture means you can swap any component without rewriting the rest of the pipeline. Start simple, measure with Ragas, and layer in complexity only where the metrics justify it.
