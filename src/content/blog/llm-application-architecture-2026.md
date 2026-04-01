---
title: "LLM Application Architecture Patterns 2026: RAG, Agents, Tool-Calling & Memory"
description: "Design production LLM applications with proven architectural patterns: RAG pipelines, agent loops, tool-calling, memory systems, and evaluation frameworks."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["llm", "ai architecture", "rag", "agents", "tool-calling", "vector database", "langchain"]
readingTime: "10 min read"
---

Building an LLM demo takes an afternoon. Building a production LLM application that is reliable, cost-efficient, and maintainable takes deliberate architectural thinking. In 2026, the patterns have stabilized enough to write down. This guide covers the four foundational patterns — RAG, agent loops, tool-calling, and memory — and the infrastructure decisions that tie them together.

## The Core Problem: LLMs Are Stateless Functions

A language model is, at its core, a function: text in, text out. It has no memory between calls, no access to your database, no ability to take actions. Every useful LLM application is fundamentally infrastructure built to work around these limitations.

The four patterns address four different limitations:

| Limitation | Pattern | Solution |
|---|---|---|
| No access to your data | RAG | Retrieve relevant context at query time |
| Can't take actions | Tool-calling | Give the model function definitions it can invoke |
| Single-step reasoning limit | Agent loop | Let the model plan and execute iteratively |
| No memory between sessions | Memory system | Store and retrieve conversation history |

## RAG Architecture

Retrieval-Augmented Generation is the most widely deployed pattern. Rather than fine-tuning a model on your data (expensive, slow to update), you retrieve relevant documents at query time and inject them into the prompt.

**Architecture diagram (text):**

```
User query
    ↓
[Embedding model] → query vector
    ↓
[Vector database] → top-k similar documents
    ↓
[Context assembly] → prompt = system + retrieved docs + user query
    ↓
[LLM] → grounded response
```

**Implementation with LangChain:**

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.llms import ChatOpenAI

# Build the index (run once, persist to disk/cloud)
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(
    documents=docs,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# Query time
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o"),
    retriever=retriever,
    return_source_documents=True
)

result = chain.invoke({"query": "What is our refund policy?"})
```

**RAG production considerations:**
- **Chunk size matters.** 512-1024 tokens per chunk is a starting point; tune based on your content type
- **Hybrid search.** Combine dense (vector) and sparse (BM25) retrieval for better recall on keyword-heavy queries
- **Reranking.** Use a cross-encoder reranker (Cohere Rerank, BGE Reranker) as a second pass to improve precision
- **Metadata filtering.** Store document metadata and filter at retrieval time to scope results (by tenant, date, category)

## Agent Loop Pattern

An agent loop gives the model the ability to reason, plan, and execute multiple steps to complete a goal. The model decides what to do next at each iteration rather than producing a single response.

```
User goal
    ↓
[LLM] → think: what do I need to do?
    ↓
[LLM] → act: call tool or produce output
    ↓
[Tool execution] → result
    ↓
[LLM] → observe: did that work? what next?
    ↓
repeat until goal reached or max_steps
```

**ReAct-style implementation:**

```python
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import Tool

tools = [
    Tool(
        name="search_database",
        description="Search the product database. Input: search query string.",
        func=search_db
    ),
    Tool(
        name="send_email",
        description="Send an email. Input: JSON with 'to', 'subject', 'body' keys.",
        func=send_email
    )
]

agent = create_react_agent(llm=ChatOpenAI(model="gpt-4o"), tools=tools, prompt=prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=10, verbose=True)

result = executor.invoke({"input": "Find the top 3 customers by revenue this quarter and send them a thank-you email"})
```

**Agent loop failure modes:**
- **Infinite loops:** Always set `max_iterations`
- **Tool misuse:** Write precise tool descriptions; the model uses them to decide when to call a tool
- **Hallucinated tool calls:** Validate tool inputs before execution
- **Cost explosion:** Log token usage per iteration; set budget limits

## Tool-Calling (Function Calling)

Modern LLMs support structured tool-calling — the model outputs a JSON function call rather than free text, and your application executes it. This is more reliable than parsing the model's prose for instructions.

```python
import openai

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City and country, e.g. 'Tokyo, Japan'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"]
                    }
                },
                "required": ["location"]
            }
        }
    }
]

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    tool_choice="auto"
)

# Check if the model wants to call a tool
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    result = get_weather(**args)
    # Feed result back to the model for final response
```

**Tool design principles:**
- One tool, one responsibility — avoid multi-purpose tools
- Descriptions are prompts — write them clearly and specifically
- Return structured data (JSON) not prose from tools
- Validate inputs and return informative errors when tools fail

## Memory Systems

LLMs have no memory between API calls. For conversational applications, you need to manage what context to include.

**Memory types:**

| Type | Storage | Use case |
|---|---|---|
| In-context (buffer) | Conversation history in prompt | Short conversations, high relevance |
| Summarization | Compressed summary of past turns | Long conversations, cost-sensitive |
| Entity memory | Structured store of entities mentioned | Personal assistants, CRMs |
| Vector memory | Embedded past conversations | Semantic search over history |
| External memory | Database/key-value store | Persistent user preferences, facts |

**Buffer memory (simplest):**

```python
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import ConversationChain

memory = ConversationBufferWindowMemory(k=10)  # keep last 10 turns

chain = ConversationChain(
    llm=ChatOpenAI(model="gpt-4o-mini"),
    memory=memory
)

chain.invoke({"input": "My name is Alex and I prefer dark mode"})
chain.invoke({"input": "What's my name?"})  # Model knows: Alex
```

**For production at scale:** store conversation history in Redis or Postgres, retrieve the relevant window per request. This separates storage from the LLM call.

## Evaluation Frameworks

The biggest unsolved challenge in LLM applications is measuring quality. Two tools have emerged as the standard:

**LangSmith** — tracing and evaluation for LangChain applications:
```python
from langsmith import Client

client = Client()
dataset = client.create_dataset("qa-eval-set")
client.create_examples(inputs=[...], outputs=[...], dataset_id=dataset.id)

# Run evaluation
results = client.run_on_dataset(
    dataset_name="qa-eval-set",
    llm_or_chain_factory=chain_factory,
    evaluation=["qa"]
)
```

**Ragas** — RAG-specific metrics (faithfulness, answer relevancy, context precision):
```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision

results = evaluate(
    dataset=eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision]
)
print(results.to_pandas())
```

## Production Architecture Checklist

Before launching an LLM application, verify:

- [ ] **Prompt versioning** — store prompts in version control, not hardcoded strings
- [ ] **Tracing** — every LLM call logged with inputs, outputs, latency, cost
- [ ] **Caching** — cache identical requests (semantic or exact-match)
- [ ] **Fallbacks** — handle model API downtime gracefully
- [ ] **Rate limiting** — protect against runaway agent loops and abusive users
- [ ] **PII filtering** — scan inputs before sending to external LLM APIs
- [ ] **Evaluation dataset** — 50+ representative queries with expected outputs
- [ ] **Cost monitoring** — alert on token spend per user, per day

## Choosing Your Stack

| Use case | Recommended stack |
|---|---|
| Simple RAG chatbot | LangChain + Chroma/Pinecone + OpenAI |
| Production RAG at scale | LlamaIndex + Weaviate + Cohere Rerank |
| Autonomous agent | LangGraph + tool-calling + LangSmith |
| Multi-agent workflow | CrewAI or AutoGen + structured outputs |
| Lightweight, no framework | Direct API calls + custom retrieval logic |

The pattern you choose should match the complexity you need. Most applications start with RAG and add agent capabilities only when retrieval alone isn't enough. Agents introduce latency, cost, and failure modes that simple RAG pipelines avoid entirely.

Build the simplest thing that solves the problem. Add orchestration when you hit the limits of that simpler approach.
