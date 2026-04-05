---
title: "LlamaIndex"
description: "LlamaIndex is the RAG specialist — connects LLMs to private data via 100+ connectors, composable query pipelines, and production-grade chunking and reranking."
category: "AI/ML Dev Tools"
pricing: "Free"
pricingDetail: "Open source; LlamaCloud (managed indexing) has paid tiers"
website: "https://llamaindex.ai"
github: "https://github.com/run-llama/llama_index"
tags: [llm, rag, indexing, ai, python, javascript, data]
pros:
  - "Best-in-class RAG primitives — chunking strategies, rerankers, query engines"
  - "100+ data connectors (PDFs, databases, APIs, web pages)"
  - "Composable query pipelines with fine-grained control"
  - "LlamaCloud for production-grade managed indexing"
cons:
  - "Steeper learning curve than LangChain for simple use cases"
  - "JavaScript support lags behind the Python version"
  - "Terminology (nodes, indices, engines) requires upfront learning"
  - "LlamaCloud pricing can be significant for large document sets"
date: "2026-04-02"
---

## Overview

LlamaIndex focuses on the data layer of LLM applications. Where LangChain is a general-purpose orchestration framework, LlamaIndex excels at the specific problem of ingesting, indexing, and querying large document collections. It's the go-to choice for knowledge-base applications, document Q&A systems, and enterprise RAG pipelines.

## Core Concepts

**Document Loading and Indexing**:

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

# Configure globally
Settings.llm = OpenAI(model="gpt-4o")

# Load documents
documents = SimpleDirectoryReader("./data").load_data()

# Build index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What are the main themes in these documents?")
```

**Advanced Chunking**:

```python
from llama_index.core.node_parser import SentenceWindowNodeParser, HierarchicalNodeParser

# Sentence window: embeds small chunks, retrieves surrounding context
parser = SentenceWindowNodeParser.from_defaults(window_size=3)

# Hierarchical: retrieves at different granularities
parser = HierarchicalNodeParser.from_defaults(chunk_sizes=[2048, 512, 128])
```

**Query Pipeline with Reranking**:

```python
from llama_index.core.query_pipeline import QueryPipeline
from llama_index.postprocessor.cohere_rerank import CohereRerank

reranker = CohereRerank(top_n=3)
query_engine = index.as_query_engine(
    node_postprocessors=[reranker],
    similarity_top_k=10,  # Retrieve 10, rerank to top 3
)
```

## When to Use

LlamaIndex is the better choice over LangChain when your primary challenge is document ingestion and retrieval quality. Its chunking strategies, rerankers, and query engines give you more control over RAG pipeline performance. LangChain is better when you need general agent orchestration beyond document Q&A.

## Quick Start

```bash
pip install llama-index llama-index-llms-openai llama-index-embeddings-openai
export OPENAI_API_KEY=sk-...
```

The simplest working RAG setup takes under 10 lines:

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

# Load all files from a directory (PDF, TXT, DOCX, etc.)
documents = SimpleDirectoryReader("./data").load_data()

# Build an in-memory vector index
index = VectorStoreIndex.from_documents(documents)

# Query it in natural language
engine = index.as_query_engine()
response = engine.query("Summarize the key points about deployment.")
print(response)
```

To persist the index to disk so you don't rebuild on every run:

```python
from llama_index.core import StorageContext, load_index_from_storage

# Save
index.storage_context.persist(persist_dir="./index_store")

# Load later
storage_context = StorageContext.from_defaults(persist_dir="./index_store")
index = load_index_from_storage(storage_context)
```

## Improving Retrieval Quality

The default chunking and retrieval settings work for simple cases, but real production RAG needs tuning. Start by experimenting with `chunk_size` (try 256–1024) and `similarity_top_k` (how many chunks to retrieve). Then add a reranker — Cohere Rerank or a local cross-encoder — to re-score the retrieved chunks before passing them to the LLM. This single step often improves answer quality significantly without changing the embedding model.
