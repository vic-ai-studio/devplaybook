---
title: "LangChain — Framework for Building LLM-Powered Applications"
description: "Build LLM apps with chains, agents, and memory in Python/JS — LangChain's ecosystem spans 100+ LLM providers, vector stores, and LangGraph for stateful multi-agent workflows."
category: "AI/ML Dev Tools"
pricing: "Free"
pricingDetail: "Open source; LangSmith (observability platform) has paid tiers"
website: "https://langchain.com"
github: "https://github.com/langchain-ai/langchain"
tags: [llm, ai, agents, rag, python, javascript, langchain]
pros:
  - "Massive ecosystem — integrations with 100+ LLM providers, vector stores, and tools"
  - "LCEL (LangChain Expression Language) enables composable, streaming pipelines"
  - "LangGraph extension for stateful multi-agent workflows"
  - "LangSmith for tracing, evaluation, and debugging LLM apps"
cons:
  - "Abstraction can obscure what's actually happening in prompts"
  - "Fast-moving API — frequent breaking changes between versions"
  - "Can be overkill for simple LLM calls; adds unnecessary complexity"
  - "Documentation quality is inconsistent across components"
date: "2026-04-02"
---

## Overview

LangChain is the most widely adopted framework for building LLM-powered applications. It provides abstractions for chaining LLM calls, managing conversation memory, integrating retrieval augmented generation (RAG), and building agents that use tools.

## Key Concepts

**Chains**: Sequences of components (prompts, models, parsers) composed via LCEL:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_template("Explain {topic} in one sentence.")
model = ChatOpenAI(model="gpt-4o")
chain = prompt | model | StrOutputParser()

result = chain.invoke({"topic": "retrieval augmented generation"})
```

**RAG Pipeline**:

```python
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

vectorstore = FAISS.from_documents(docs, OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o"),
    retriever=retriever
)
```

**Agents with Tools** (via LangGraph):

```python
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def search_web(query: str) -> str:
    """Search the web for current information."""
    # implementation

agent = create_react_agent(model, [search_web])
result = agent.invoke({"messages": [("user", "What's the latest on AI?")]})
```

## When to Use

LangChain is best for: RAG applications, multi-step LLM pipelines, agent systems with tool use, and projects that need to swap LLM providers without rewriting application code. For simple single-prompt applications, calling the LLM SDK directly is simpler.

## Quick Start

```bash
pip install langchain langchain-openai langchain-community faiss-cpu
export OPENAI_API_KEY=sk-...
```

The fastest way to get a working LLM chain running:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that answers concisely."),
    ("user", "{question}")
])

chain = prompt | llm
response = chain.invoke({"question": "What is LCEL in LangChain?"})
print(response.content)
```

For a minimal RAG pipeline that reads local text files:

```python
from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

loader = DirectoryLoader("./docs", glob="**/*.txt")
docs = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)
vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings())
# Now use vectorstore.as_retriever() in a RetrievalQA chain
```

## LangSmith: Observability for LLM Apps

LangSmith is LangChain's tracing and evaluation platform. Set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` in your environment, and every chain invocation is automatically logged with inputs, outputs, token counts, and latency. This is invaluable for debugging prompt quality issues or unexpected agent behavior in production.

## Concrete Use Case: Building an Internal Documentation Q&A Bot for a 200-Person Engineering Team

A platform team at a mid-size fintech company maintains over 800 pages of internal engineering documentation: ADRs (Architecture Decision Records), runbooks, API reference, and incident post-mortems spread across Confluence and a GitHub Pages static site. Engineers waste significant time searching for answers buried in documents — the average response time in the `#ask-platform` Slack channel is 45 minutes because someone has to dig through Confluence. The team decides to build an internal Q&A bot using LangChain that answers questions grounded in actual documentation with source citations.

The pipeline is built in Python using LangChain's document loading and RAG primitives. Confluence pages are exported weekly via the Confluence API and loaded using `ConfluenceLoader`. GitHub Pages content is pulled via `DirectoryLoader`. Both corpora are chunked with `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)` to preserve section context. Embeddings are computed using `OpenAIEmbeddings` and stored in a Pinecone vector store with metadata tags for document type (`runbook`, `adr`, `api-ref`), team ownership, and last-modified date. The retrieval chain uses a `MultiQueryRetriever` — it rewrites the user's question into three alternative phrasings before querying the vector store, dramatically improving recall for questions phrased differently than documentation titles. Responses are generated with `gpt-4o` via LCEL: the chain retrieves six chunks, formats them with source URLs, and instructs the model to cite every claim with the source document name.

The bot is deployed as a Slack app. Engineers ask questions by mentioning `@platform-bot` and receive an answer with two to three source links within four seconds. LangSmith traces every chain invocation with the full prompt, retrieved chunks, token counts, and latency — giving the platform team visibility into which questions are answered poorly and which documents are missing from the corpus. After two months, the team curates 40 frequently-missed question/answer pairs as LangSmith evaluation datasets and uses them to catch retrieval regressions when updating the chunking strategy or embedding model. Average response latency in the Slack channel drops from 45 minutes to under one minute for documentation-answerable questions.

## When to Use LangChain

**Use LangChain when:**
- You are building a RAG application that needs document loading, chunking, embedding, vector retrieval, and LLM response generation as a composable pipeline — LangChain's integrations eliminate weeks of glue code
- Your project needs to swap LLM providers (OpenAI → Anthropic → local Ollama) without rewriting application logic — LCEL's provider-agnostic abstractions make this nearly transparent
- You are building multi-agent workflows where agents use tools, hand off to other agents, or require persistent state — LangGraph provides the stateful graph execution needed for these patterns
- You want observability into LLM call chains (token usage, latency, prompt quality) via LangSmith, especially for debugging retrieval quality in production

**When NOT to use LangChain:**
- You are making a single LLM API call — calling the Anthropic or OpenAI SDK directly is simpler and adds no unnecessary abstraction overhead
- Your team is building in a language LangChain doesn't support well (Go, Java, Rust) — use native SDKs or lighter-weight alternatives designed for those ecosystems
- You need very fine-grained control over how every prompt is constructed and sent — LangChain's abstractions can make it harder to inspect and tune the exact prompt format
