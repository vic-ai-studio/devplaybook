---
title: "AI Agent Memory Architecture: Episodic, Semantic & Procedural Patterns"
description: "Deep dive into AI agent memory architecture patterns. Learn how to implement episodic, semantic, and procedural memory using vector stores, LangMem, MemGPT, and production design patterns."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["ai-agents", "memory", "vector-database", "rag", "langchain", "architecture"]
readingTime: "13 min read"
---

# AI Agent Memory Architecture: Episodic, Semantic & Procedural Patterns

The difference between a stateless LLM call and a genuinely useful AI agent comes down to one word: **memory**. Without memory, every conversation starts from zero. With memory, an agent can learn your preferences, remember what it tried last week, and build on past experiences the same way a skilled human assistant does.

But "memory" isn't a single concept. Human cognition distinguishes between remembering *what happened* (episodic), knowing *general facts* (semantic), and knowing *how to do things* (procedural). AI agents need all three — and they need to know when to use each type. This guide is a deep dive into the architecture patterns, implementation strategies, and production trade-offs for each memory type in 2026.

---

## The Four Types of Agent Memory

Before implementation, it helps to be clear on the taxonomy. Most frameworks recognize four memory types:

### 1. Working Memory (In-Context)

Working memory is the agent's current context window — everything the model "sees" right now. It's fast (zero retrieval latency), accurate (no semantic drift), and ephemeral (gone when the conversation ends).

**Capacity**: Typically 8K-200K tokens depending on the model
**Persistence**: Session only
**Best for**: Current task state, recent conversation turns, intermediate reasoning steps

### 2. Episodic Memory (What Happened)

Episodic memory stores records of specific past experiences: conversations, task outcomes, errors encountered, decisions made. It's indexed by time and context, not just content.

**Capacity**: Unlimited (stored externally)
**Persistence**: Long-term
**Best for**: "What did I do last time this happened?", personalization, debugging

### 3. Semantic Memory (What Is Known)

Semantic memory holds general knowledge, facts, and concepts — decoupled from specific experiences. This is typically where RAG (retrieval-augmented generation) lives: product documentation, policy docs, domain knowledge bases.

**Capacity**: Unlimited (vector store)
**Persistence**: Long-term, updated deliberately
**Best for**: Factual Q&A, domain expertise, background knowledge

### 4. Procedural Memory (How to Do Things)

Procedural memory encodes *skills* and *workflows* — how to use a tool, which sequence of steps achieves a goal, what patterns tend to succeed or fail. In agents, this often manifests as learned tool-use patterns, planning heuristics, or fine-tuned model weights.

**Capacity**: Varies by implementation
**Persistence**: Long-term, learned/updated over time
**Best for**: Tool use optimization, task planning, skill transfer

---

## Why Memory Architecture Matters

Without proper memory architecture, agents suffer from predictable failure modes:

**The Goldfish Problem**: Every session restarts cold. The agent asks the same clarifying questions, makes the same errors, re-reads the same documentation. Users get frustrated; agents look dumb.

**The Hallucination Trap**: Without grounded semantic memory, agents fill knowledge gaps with confident-sounding fabrications. A retrieval-augmented agent with fresh, accurate embeddings is far more reliable than a model relying on training-time knowledge.

**The Skill Regression Problem**: An agent that learned via feedback last month has no way to apply that learning next month without procedural memory. Every interaction starts from the same baseline capabilities.

**Context Overflow**: Naive approaches just dump everything into the context window. This works until the conversation grows beyond the context limit, at which point older information gets truncated — often the most important historical context.

Designing memory intentionally solves all of these.

---

## Implementing Episodic Memory

### Basic Structure

Episodic memories are event records with timestamps, metadata, and a description of what occurred. The minimal schema:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class EpisodicMemory:
    memory_id: str
    timestamp: datetime
    session_id: str
    event_type: str          # "task_completed", "error", "user_feedback", etc.
    content: str             # Natural language description of what happened
    embedding: list[float]   # Vector embedding for semantic retrieval
    metadata: dict           # Arbitrary structured data (tool used, user_id, outcome, etc.)
    importance_score: float  # 0.0 to 1.0, affects retrieval priority
```

### Storing Episodic Memories

```python
import chromadb
from openai import OpenAI
from datetime import datetime
import uuid

client = OpenAI()
chroma = chromadb.PersistentClient(path="./agent_memory")
episodes = chroma.get_or_create_collection("episodic_memory")

def embed(text: str) -> list[float]:
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def store_episode(
    content: str,
    event_type: str,
    session_id: str,
    metadata: dict = None,
    importance: float = 0.5
):
    memory_id = str(uuid.uuid4())
    episodes.add(
        ids=[memory_id],
        embeddings=[embed(content)],
        documents=[content],
        metadatas=[{
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": session_id,
            "event_type": event_type,
            "importance": importance,
            **(metadata or {})
        }]
    )
    return memory_id

# Example: store a task completion event
store_episode(
    content="Successfully debugged a React hydration error caused by mismatched server/client rendering of Date objects. Fixed by wrapping date formatting in useEffect.",
    event_type="task_completed",
    session_id="session_abc123",
    metadata={"tool_used": "code_editor", "duration_minutes": 23, "user_id": "user_42"},
    importance=0.8
)
```

### Retrieving Episodic Memories

```python
def recall_episodes(
    query: str,
    n_results: int = 5,
    recency_weight: float = 0.3,
    importance_weight: float = 0.2
) -> list[dict]:
    """
    Retrieve relevant episodes with recency and importance weighting.
    """
    query_embedding = embed(query)

    results = episodes.query(
        query_embeddings=[query_embedding],
        n_results=n_results * 3,  # Fetch more, then re-rank
        include=["documents", "metadatas", "distances"]
    )

    scored = []
    now = datetime.utcnow()

    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        semantic_score = 1.0 - distance  # Convert distance to similarity

        # Recency score: exponential decay, half-life ~7 days
        memory_age_days = (now - datetime.fromisoformat(meta["timestamp"])).days
        recency_score = 2 ** (-memory_age_days / 7)

        importance_score = meta.get("importance", 0.5)

        final_score = (
            (1 - recency_weight - importance_weight) * semantic_score +
            recency_weight * recency_score +
            importance_weight * importance_score
        )

        scored.append({"content": doc, "metadata": meta, "score": final_score})

    return sorted(scored, key=lambda x: x["score"], reverse=True)[:n_results]
```

---

## Implementing Semantic Memory

Semantic memory is where most RAG implementations live. The architecture involves chunking source documents, embedding them, storing in a vector database, and retrieving by semantic similarity at query time.

### Vector Store Options in 2026

| Store | Best For | Hosting | Scale |
|-------|---------|---------|-------|
| **Pinecone** | Production SaaS | Managed cloud | Billions of vectors |
| **Weaviate** | Hybrid search + GraphQL | Self-hosted or cloud | Hundreds of millions |
| **Chroma** | Local dev and prototypes | Embedded or server | Millions |
| **pgvector** | Existing Postgres stacks | Self-hosted | Tens of millions |
| **Qdrant** | High-performance on-prem | Self-hosted | Billions |
| **Milvus** | Enterprise scale | Self-hosted or cloud | Billions |

### Semantic Memory with pgvector

For teams already running Postgres, pgvector is the most pragmatic choice — no new infrastructure, ACID guarantees, and SQL-native querying.

```python
import psycopg2
from pgvector.psycopg2 import register_vector
import numpy as np

conn = psycopg2.connect("postgresql://user:pass@localhost/agentdb")
register_vector(conn)

# Schema setup
with conn.cursor() as cur:
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS semantic_memory (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            embedding vector(1536),  -- text-embedding-3-small dimensions
            source TEXT,
            category TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_accessed TIMESTAMPTZ,
            access_count INT DEFAULT 0
        )
    """)
    cur.execute("CREATE INDEX ON semantic_memory USING ivfflat (embedding vector_cosine_ops)")
    conn.commit()

def store_knowledge(content: str, source: str, category: str):
    embedding = embed(content)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO semantic_memory (content, embedding, source, category)
            VALUES (%s, %s, %s, %s)
            """,
            (content, embedding, source, category)
        )
        conn.commit()

def retrieve_knowledge(query: str, top_k: int = 5, category: str = None) -> list[dict]:
    query_embedding = embed(query)
    with conn.cursor() as cur:
        if category:
            cur.execute(
                """
                SELECT content, source, 1 - (embedding <=> %s::vector) AS similarity
                FROM semantic_memory
                WHERE category = %s
                ORDER BY similarity DESC
                LIMIT %s
                """,
                (query_embedding, category, top_k)
            )
        else:
            cur.execute(
                """
                SELECT content, source, 1 - (embedding <=> %s::vector) AS similarity
                FROM semantic_memory
                ORDER BY similarity DESC
                LIMIT %s
                """,
                (query_embedding, top_k)
            )

        rows = cur.fetchall()
        # Update access tracking
        return [{"content": r[0], "source": r[1], "similarity": r[2]} for r in rows]
```

---

## Implementing Procedural Memory

Procedural memory is the most complex to implement correctly. There are three main approaches:

### Approach 1: Explicit Skill Libraries

Store reusable procedures as structured objects that the agent can retrieve and execute:

```python
from pydantic import BaseModel

class Skill(BaseModel):
    skill_id: str
    name: str
    description: str
    trigger_conditions: list[str]  # When to use this skill
    steps: list[str]               # Step-by-step procedure
    success_count: int = 0
    failure_count: int = 0
    average_completion_time: float = 0.0

class SkillLibrary:
    def __init__(self, vector_store):
        self.store = vector_store
        self.skills: dict[str, Skill] = {}

    def register_skill(self, skill: Skill):
        self.skills[skill.skill_id] = skill
        # Embed the description + trigger conditions for retrieval
        embedding_text = f"{skill.name}: {skill.description}. Use when: {', '.join(skill.trigger_conditions)}"
        self.store.add(skill.skill_id, embed(embedding_text), skill.dict())

    def retrieve_skill(self, situation: str, top_k: int = 3) -> list[Skill]:
        results = self.store.query(embed(situation), top_k)
        return [Skill(**r["metadata"]) for r in results]

    def record_outcome(self, skill_id: str, success: bool, duration_seconds: float):
        skill = self.skills[skill_id]
        if success:
            skill.success_count += 1
        else:
            skill.failure_count += 1
        # Running average
        total = skill.success_count + skill.failure_count
        skill.average_completion_time = (
            (skill.average_completion_time * (total - 1) + duration_seconds) / total
        )
        self.store.update(skill_id, skill.dict())
```

### Approach 2: Reflexion-style Learning

The Reflexion pattern has agents generate verbal self-feedback after each task, then store that feedback as procedural knowledge for future attempts:

```python
import dspy

class ReflexionAgent(dspy.Module):
    def __init__(self):
        super().__init__()
        self.execute = dspy.ChainOfThought("task, context, past_reflections -> action, reasoning")
        self.reflect = dspy.ChainOfThought("task, action_taken, outcome -> reflection, lesson_learned")
        self.memory = []  # Stores past reflections

    def attempt_task(self, task: str, context: str, max_attempts: int = 3):
        past_reflections = "\n".join(self.memory[-5:])  # Last 5 lessons

        for attempt in range(max_attempts):
            result = self.execute(
                task=task,
                context=context,
                past_reflections=past_reflections
            )

            # Execute action and get outcome
            outcome = self._execute_action(result.action)

            if outcome.success:
                return outcome

            # Reflect on failure
            reflection = self.reflect(
                task=task,
                action_taken=result.action,
                outcome=str(outcome)
            )

            # Store lesson for future attempts
            self.memory.append(reflection.lesson_learned)
            past_reflections = "\n".join(self.memory[-5:])

        return None  # All attempts failed
```

---

## LangMem Architecture

LangMem (from LangChain) provides a high-level memory management system designed specifically for production agent deployments. Its core abstraction is the **memory store** — a unified interface over multiple storage backends.

```python
from langmem import MemoryManager, InMemoryStore, SemanticStore
from langchain_openai import OpenAIEmbeddings

# Initialize stores
semantic_store = SemanticStore(
    embeddings=OpenAIEmbeddings(model="text-embedding-3-small"),
    collection_name="agent_knowledge"
)

manager = MemoryManager(
    stores={
        "episodic": InMemoryStore(),        # Fast, session-scoped
        "semantic": semantic_store,          # Persistent, vector-backed
        "procedural": semantic_store,        # Same store, different namespace
    },
    extraction_model="gpt-4o-mini"          # Model used to extract memories from conversations
)

# After each conversation turn, extract and store memories
async def process_turn(conversation_history: list[dict]):
    memories = await manager.extract_memories(
        messages=conversation_history,
        memory_types=["episodic", "semantic"]
    )
    await manager.store_memories(memories)
    return memories

# Retrieve relevant memories before generating a response
async def get_context(query: str) -> str:
    results = await manager.search(
        query=query,
        memory_types=["episodic", "semantic"],
        top_k=10
    )
    return manager.format_as_context(results)
```

---

## MemGPT Design Pattern

MemGPT (now Letta) pioneered the idea of treating the LLM's context window as a paging system — like OS virtual memory. The key insight: since context is finite, the agent needs to explicitly manage what stays in the "fast" in-context window and what gets offloaded to "disk" (external storage).

```
┌─────────────────────────────────────────────┐
│              MAIN CONTEXT                    │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   System    │  │  Conversation Buffer  │  │
│  │  Prompt +   │  │  (recent turns)       │  │
│  │  Persona    │  │                       │  │
│  └─────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────┐ │
│  │  Working Context (pinned memories)       │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────┘
                       │ page in / page out
┌──────────────────────▼──────────────────────┐
│           EXTERNAL STORAGE                   │
│  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Episodic   │  │   Semantic Store     │   │
│  │  Archive    │  │   (knowledge base)   │   │
│  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────┘
```

Implementing this pattern requires giving the agent tools to explicitly manage its own memory:

```python
class MemGPTAgent:
    def __init__(self, lm, vector_store, max_context_memories: int = 10):
        self.lm = lm
        self.store = vector_store
        self.working_context: list[dict] = []  # Pinned in-context memories
        self.max_pinned = max_context_memories

    def get_tools(self):
        """Memory management tools exposed to the agent."""
        return [
            self.recall_memory,
            self.store_memory,
            self.pin_memory,
            self.unpin_memory
        ]

    def recall_memory(self, query: str, n: int = 5) -> list[dict]:
        """Search external memory store and return relevant memories."""
        return self.store.search(query, top_k=n)

    def store_memory(self, content: str, memory_type: str = "episodic") -> str:
        """Persist a new memory to external storage."""
        memory_id = self.store.add(content, metadata={"type": memory_type})
        return f"Stored memory {memory_id}"

    def pin_memory(self, memory_id: str) -> str:
        """Bring a memory from external storage into working context."""
        memory = self.store.get(memory_id)
        if len(self.working_context) >= self.max_pinned:
            # Evict least recently used
            self.working_context.pop(0)
        self.working_context.append(memory)
        return f"Pinned memory {memory_id} to working context"

    def unpin_memory(self, memory_id: str) -> str:
        """Remove a memory from working context (does not delete from storage)."""
        self.working_context = [m for m in self.working_context if m["id"] != memory_id]
        return f"Unpinned memory {memory_id}"
```

---

## Production Design Patterns

### Memory Compression

Raw conversation logs grow fast. A production system needs automatic compression:

```python
def compress_memory_batch(memories: list[str], llm) -> str:
    """
    Compress a batch of memories into a dense summary,
    preserving key facts and discarding redundant detail.
    """
    combined = "\n---\n".join(memories)
    prompt = f"""You are a memory compression system.
    Compress the following memories into a concise summary that preserves:
    - Key facts and decisions
    - Important outcomes (successes and failures)
    - User preferences discovered

    Discard:
    - Repetitive information
    - Low-importance conversational filler
    - Outdated information superseded by newer entries

    MEMORIES TO COMPRESS:
    {combined}

    COMPRESSED SUMMARY:"""

    return llm.complete(prompt)

# Run compression when memory count exceeds threshold
async def maybe_compress(memory_manager, threshold: int = 100):
    count = await memory_manager.count("episodic")
    if count > threshold:
        oldest = await memory_manager.get_oldest("episodic", n=50)
        compressed = compress_memory_batch([m["content"] for m in oldest], llm)
        await memory_manager.delete_batch([m["id"] for m in oldest])
        await memory_manager.store(compressed, memory_type="episodic", importance=0.9)
```

### Memory Forgetting (Importance Decay)

Not all memories should live forever. Implement decay to prevent the store from filling with stale, low-value memories:

```python
import math
from datetime import datetime, timedelta

def importance_score(
    base_importance: float,
    age_days: float,
    access_count: int,
    half_life_days: float = 30
) -> float:
    """
    Calculate current importance using an exponential decay model
    that resets partially on access (like the Ebbinghaus forgetting curve).
    """
    # Decay component
    decay = math.exp(-0.693 * age_days / half_life_days)

    # Access bonus: each access extends memory lifetime
    access_bonus = min(0.3, access_count * 0.05)

    return base_importance * decay + access_bonus

def prune_low_importance_memories(store, threshold: float = 0.1):
    """Delete memories whose importance has decayed below threshold."""
    all_memories = store.get_all(include_metadata=True)
    now = datetime.utcnow()

    to_delete = []
    for memory in all_memories:
        age_days = (now - datetime.fromisoformat(memory["created_at"])).days
        score = importance_score(
            base_importance=memory["importance"],
            age_days=age_days,
            access_count=memory["access_count"]
        )
        if score < threshold:
            to_delete.append(memory["id"])

    store.delete_batch(to_delete)
    return len(to_delete)
```

### Memory Consolidation

Periodically merge related memories into higher-level abstractions — similar to how sleep consolidates short-term memories into long-term knowledge:

```python
async def consolidate_memories(store, llm, cluster_threshold: float = 0.85):
    """
    Find clusters of similar memories and consolidate them into generalizations.
    """
    all_memories = await store.get_all(memory_type="episodic", limit=500)
    embeddings = [m["embedding"] for m in all_memories]

    # Find similar memory pairs
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    similarity_matrix = cosine_similarity(embeddings)

    clusters = []
    visited = set()

    for i in range(len(all_memories)):
        if i in visited:
            continue
        cluster = [i]
        for j in range(i + 1, len(all_memories)):
            if similarity_matrix[i][j] > cluster_threshold:
                cluster.append(j)
                visited.add(j)
        if len(cluster) > 2:
            clusters.append(cluster)
        visited.add(i)

    # Consolidate each cluster
    for cluster_indices in clusters:
        cluster_memories = [all_memories[i]["content"] for i in cluster_indices]
        generalization = await llm.agenerate(
            f"Synthesize these related memories into one general insight:\n" +
            "\n".join(cluster_memories)
        )

        # Store generalization as semantic memory
        await store.add(
            content=generalization,
            memory_type="semantic",
            importance=0.8,
            metadata={"source": "consolidation", "source_count": len(cluster_indices)}
        )

        # Archive originals
        await store.delete_batch([all_memories[i]["id"] for i in cluster_indices])
```

---

## Choosing the Right Pattern: Decision Framework

| Scenario | Recommended Pattern |
|---------|-------------------|
| Chatbot that remembers user preferences | Episodic + Semantic with LangMem |
| Documentation Q&A assistant | Semantic only (RAG) |
| Long-running coding agent (hours-days) | MemGPT-style context paging |
| Agent that learns from feedback | Reflexion + Procedural skill library |
| Multi-agent system with shared knowledge | Shared semantic store + private episodic |
| Customer support agent | All four types: working + episodic (past tickets) + semantic (policy docs) + procedural (resolution patterns) |

### Cost vs Capability Trade-offs

```
High Cost / High Capability
        │
        ▼
MemGPT Full Paging (all memory types, explicit management)
        │
LangMem + Consolidation (managed, production-grade)
        │
Basic RAG + Episodic store (most practical starting point)
        │
Sliding window (simple, lossy, free)
        │
        ▼
Low Cost / Low Capability
```

---

## Getting Started: Minimal Viable Memory System

If you're starting fresh, here's the minimal architecture that covers 80% of use cases:

```python
import chromadb
from openai import OpenAI
from datetime import datetime
import uuid

class AgentMemory:
    def __init__(self, persist_path: str = "./memory"):
        self.client = OpenAI()
        self.chroma = chromadb.PersistentClient(path=persist_path)
        self.episodic = self.chroma.get_or_create_collection("episodic")
        self.semantic = self.chroma.get_or_create_collection("semantic")

    def _embed(self, text: str) -> list[float]:
        return self.client.embeddings.create(
            input=text, model="text-embedding-3-small"
        ).data[0].embedding

    def remember_episode(self, content: str, importance: float = 0.5):
        self.episodic.add(
            ids=[str(uuid.uuid4())],
            embeddings=[self._embed(content)],
            documents=[content],
            metadatas=[{"ts": datetime.utcnow().isoformat(), "importance": importance}]
        )

    def learn(self, content: str, source: str = "agent"):
        self.semantic.add(
            ids=[str(uuid.uuid4())],
            embeddings=[self._embed(content)],
            documents=[content],
            metadatas=[{"source": source}]
        )

    def recall(self, query: str, n: int = 5) -> dict:
        episodes = self.episodic.query(
            query_embeddings=[self._embed(query)],
            n_results=min(n, self.episodic.count() or 1)
        )
        knowledge = self.semantic.query(
            query_embeddings=[self._embed(query)],
            n_results=min(n, self.semantic.count() or 1)
        )
        return {
            "past_experiences": episodes["documents"][0] if episodes["documents"] else [],
            "knowledge": knowledge["documents"][0] if knowledge["documents"] else []
        }

    def as_context_string(self, query: str) -> str:
        memories = self.recall(query)
        parts = []
        if memories["past_experiences"]:
            parts.append("RELEVANT PAST EXPERIENCES:\n" + "\n".join(f"- {e}" for e in memories["past_experiences"]))
        if memories["knowledge"]:
            parts.append("RELEVANT KNOWLEDGE:\n" + "\n".join(f"- {k}" for k in memories["knowledge"]))
        return "\n\n".join(parts)

# Usage
memory = AgentMemory()
memory.learn("Our API rate limit is 100 requests per minute per user", source="policy_doc")
memory.remember_episode("User asked about rate limits, explained the 100 req/min policy", importance=0.6)

context = memory.as_context_string("What are the API limits?")
print(context)
```

---

## Conclusion

Memory architecture is the key differentiator between toy AI assistants and agents that are genuinely useful over time. The patterns covered here — episodic storage with recency weighting, semantic retrieval with vector stores, procedural skill libraries, MemGPT-style context paging, and production patterns like compression and consolidation — form a complete toolkit for building agents with human-like memory capabilities.

Start simple: add a basic episodic store and a RAG knowledge base. Measure whether it improves your agent's performance on your specific tasks. Then layer in more sophisticated patterns (compression, forgetting, consolidation) as your scale and requirements grow.

The goal is not perfect memory — it's *useful* memory. An agent that forgets the right things and remembers the right things is more valuable than one that tries to remember everything.

In 2026, the tools for building sophisticated agent memory systems are mature, affordable, and well-documented. The competitive advantage goes to teams that design their memory architecture intentionally, rather than bolting it on as an afterthought.
