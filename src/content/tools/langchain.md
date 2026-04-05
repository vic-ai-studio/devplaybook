---
title: "LangChain"
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
