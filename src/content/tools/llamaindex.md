---
title: "LlamaIndex"
description: "Data framework for LLM applications — specialized in connecting LLMs to private data sources via indexing, querying, and retrieval pipelines."
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
