---
title: "LLM Structured Output: JSON Mode, Function Calling, and Tool Use in 2026"
description: "Complete guide to LLM structured output in 2026: OpenAI JSON mode vs structured outputs, Anthropic tool use, the Instructor library, Pydantic AI, validation patterns, reliability techniques, and real-world examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["llm", "structured-output", "json-mode", "function-calling", "tool-use", "openai", "anthropic", "instructor", "pydantic", "python"]
readingTime: "14 min read"
---

Getting an LLM to return valid, structured data is one of the most important practical skills in AI engineering. The days of regex-parsing freeform LLM responses are over — in 2026, every major model provider offers structured output guarantees. But understanding the differences between JSON mode, function calling, structured outputs, and tool use — and knowing which patterns are reliable in production — separates demo-quality integrations from production-grade ones.

---

## Why Structured Output Matters

LLMs generate tokens probabilistically. Without constraints, a request for "return a JSON object" might produce:

- Valid JSON — sometimes
- JSON with a trailing comma — sometimes
- JSON wrapped in markdown code fences — often
- A preamble sentence before the JSON — frequently
- Hallucinated field names — occasionally

Structured output enforcement eliminates this variability. In production pipelines, unparseable responses cascade into downstream failures, wasted API costs, and silent data corruption.

---

## OpenAI: Three Modes of Structured Output

OpenAI offers three distinct mechanisms with different reliability guarantees.

### Mode 1: JSON Mode (Legacy, Unreliable)

JSON mode was the first attempt — it instructs the model to produce valid JSON:

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a data extractor. Return JSON only."},
        {"role": "user", "content": "Extract: John Smith, 42, engineer at Acme Corp"}
    ],
    response_format={"type": "json_object"},  # JSON mode
)

import json
data = json.loads(response.choices[0].message.content)
```

**The problem:** JSON mode only guarantees syntactically valid JSON. It does not guarantee your schema. The model might return `{"name": "John", "age": "42"}` when you wanted `age` as an integer, or include unexpected fields, or omit required ones. You still need validation.

### Mode 2: Structured Outputs (The 2026 Standard)

Structured Outputs (introduced GPT-4o, August 2024) guarantee the response matches your JSON Schema exactly:

```python
from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()

class Person(BaseModel):
    name: str
    age: int
    job_title: str
    company: str

response = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",  # Structured outputs require this model or newer
    messages=[
        {"role": "user", "content": "Extract: John Smith, 42, engineer at Acme Corp"}
    ],
    response_format=Person,  # Pydantic model as schema
)

person = response.choices[0].message.parsed
print(person.name)   # "John Smith"
print(person.age)    # 42 (int, guaranteed)
```

Structured Outputs uses **constrained decoding** — the model's sampling is constrained to only produce tokens that are valid continuations of your schema. This is a hard guarantee, not a soft instruction.

**Limitations:**
- Not all JSON Schema features are supported (no `oneOf` at root, no recursive schemas with complex nesting)
- First request with a new schema has latency overhead (schema compilation)
- Requires `gpt-4o-2024-08-06` or newer

### Mode 3: Function Calling / Tool Use

Function calling predates Structured Outputs and is still the right choice when you want the model to decide *whether* to call a function:

```python
from openai import OpenAI

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"},
                    "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["city"],
                "additionalProperties": False,
            },
        },
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    tool_choice="auto",  # "required" forces a tool call, "none" disables
)

message = response.choices[0].message

if message.tool_calls:
    tool_call = message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    # args = {"city": "Tokyo", "units": "celsius"}

    # Execute the actual function
    weather = get_weather(**args)

    # Continue conversation with function result
    followup = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": "What's the weather in Tokyo?"},
            message,  # Assistant message with tool_calls
            {"role": "tool", "content": json.dumps(weather), "tool_call_id": tool_call.id}
        ]
    )
```

**When to use function calling vs Structured Outputs:**
- **Structured Outputs**: you need a specific schema, always — data extraction, classification, form filling
- **Function calling**: the model should decide whether and which function to call — AI assistants, agents, autonomous workflows

---

## Anthropic: Tool Use

Claude uses "tool use" rather than "function calling" — same concept, different API:

```python
import anthropic

client = anthropic.Anthropic()

tools = [
    {
        "name": "extract_contact",
        "description": "Extract contact information from text",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string", "format": "email"},
                "phone": {"type": "string"},
                "company": {"type": "string"},
            },
            "required": ["name"],
        },
    }
]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "tool", "name": "extract_contact"},  # Force specific tool
    messages=[
        {"role": "user", "content": "Contact: Sarah Chen, sarah@startup.io, (415) 555-0123, CTO at BuildFast"}
    ],
)

# Find tool use block
for block in response.content:
    if block.type == "tool_use":
        contact = block.input
        print(contact["name"])   # "Sarah Chen"
        print(contact["email"])  # "sarah@startup.io"
```

**`tool_choice` options for Claude:**
- `{"type": "auto"}` — model decides whether to use a tool
- `{"type": "any"}` — must use one of the provided tools
- `{"type": "tool", "name": "extract_contact"}` — must use this specific tool

For strict structured output on Claude, always use `tool_choice: {"type": "tool", "name": "..."}` with a single tool. This is Claude's equivalent of Structured Outputs.

---

## The Instructor Library: The Production Standard

[Instructor](https://github.com/jxnl/instructor) is the de-facto library for structured LLM output in 2026. It wraps any LLM client with automatic validation, retry logic, and Pydantic integration:

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel, Field, validator
from typing import Optional

# Patch the client
client = instructor.from_openai(OpenAI())

class UserProfile(BaseModel):
    name: str
    age: int = Field(ge=0, le=150, description="Age in years")
    email: Optional[str] = Field(default=None, pattern=r'^[\w.-]+@[\w.-]+\.\w+$')
    skills: list[str] = Field(default_factory=list)
    seniority: str = Field(description="junior, mid, senior, or staff")

    @validator('seniority')
    def validate_seniority(cls, v):
        valid = {"junior", "mid", "senior", "staff"}
        if v.lower() not in valid:
            raise ValueError(f"seniority must be one of {valid}")
        return v.lower()

# Instructor handles: schema generation, retry on validation error, response parsing
profile = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Alex Turner, 28, senior developer, alex@dev.io, skills: Python, Go, Kubernetes"}
    ],
    response_model=UserProfile,
    max_retries=3,  # Auto-retry with validation error feedback
)

print(profile.name)       # "Alex Turner"
print(profile.seniority)  # "senior"
print(profile.skills)     # ["Python", "Go", "Kubernetes"]
```

### Instructor with Anthropic

```python
import instructor
import anthropic

client = instructor.from_anthropic(anthropic.Anthropic())

# Same interface, works with Claude
profile = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Extract profile: ..."}],
    response_model=UserProfile,
)
```

### Instructor's Retry Loop

When validation fails, Instructor sends the error back to the model:

```
Attempt 1: LLM returns {"seniority": "Senior Developer"}
Pydantic validation: ValueError: seniority must be one of {'junior', 'mid', 'senior', 'staff'}
Attempt 2: LLM receives error, returns {"seniority": "senior"}
Pydantic validation: OK ✓
```

This dramatically reduces failure rates — most validation errors are recoverable with one retry.

---

## Pydantic AI: Agents with Type Safety

Pydantic AI (from the Pydantic team, 2024) takes structured output further — it builds type-safe AI agents where inputs, outputs, and tool parameters are all Pydantic models:

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic import BaseModel

class ResearchResult(BaseModel):
    topic: str
    summary: str
    key_facts: list[str]
    confidence: float
    sources: list[str]

model = OpenAIModel("gpt-4o")

agent = Agent(
    model,
    result_type=ResearchResult,
    system_prompt="You are a research assistant. Be precise and cite sources.",
)

result = agent.run_sync("Summarize the current state of quantum computing")

# Fully typed result
print(result.data.summary)     # str
print(result.data.key_facts)   # list[str]
print(result.data.confidence)  # float
```

### Pydantic AI Tools

```python
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.anthropic import AnthropicModel
import httpx

model = AnthropicModel("claude-sonnet-4-6")

agent = Agent(
    model,
    result_type=ResearchResult,
    system_prompt="Research assistant with web access.",
)

@agent.tool
async def search_web(ctx: RunContext, query: str) -> str:
    """Search the web for current information."""
    async with httpx.AsyncClient() as http:
        response = await http.get(
            "https://api.search.example.com/search",
            params={"q": query},
            headers={"Authorization": f"Bearer {ctx.deps.api_key}"}
        )
        return response.text

# Agent decides when to call tools, always returns typed ResearchResult
result = await agent.run("What are the latest breakthroughs in fusion energy?")
```

---

## Validation Patterns for Production

### Pattern 1: Schema-First Design

Design your Pydantic schema before writing prompts. The schema is your contract:

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"

class ContentAnalysis(BaseModel):
    sentiment: Sentiment
    confidence_score: float = Field(ge=0.0, le=1.0)
    topics: list[str] = Field(min_items=1, max_items=10)
    language: str = Field(pattern=r'^[a-z]{2}$', description="ISO 639-1 code")
    requires_human_review: bool
    summary: str = Field(min_length=10, max_length=500)
    flags: list[Literal["spam", "hate_speech", "misinformation", "explicit"]] = Field(
        default_factory=list
    )
```

Tight schemas catch model drift early. When a field suddenly fails validation in production, it's often a signal the model changed behavior.

### Pattern 2: Nested Models for Complex Data

```python
class Address(BaseModel):
    street: str
    city: str
    country: str = Field(pattern=r'^[A-Z]{2}$')  # ISO country code
    postal_code: str

class OrderExtraction(BaseModel):
    order_id: str
    customer_name: str
    items: list[dict]
    shipping_address: Address        # Nested model — validated recursively
    total_amount: float = Field(gt=0)
    currency: str = Field(default="USD", pattern=r'^[A-Z]{3}$')
```

### Pattern 3: Streaming Structured Output

For long-running extractions, stream partial objects:

```python
import instructor
from openai import OpenAI

client = instructor.from_openai(OpenAI(), mode=instructor.Mode.JSON)

class Report(BaseModel):
    title: str
    executive_summary: str
    sections: list[str]
    recommendations: list[str]
    risk_level: Literal["low", "medium", "high"]

# Stream partial objects as they complete
for partial_report in client.chat.completions.create_partial(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Generate a security audit report for..."}],
    response_model=Report,
):
    if partial_report.title:
        print(f"Title: {partial_report.title}")
    if partial_report.executive_summary:
        print(f"Summary: {partial_report.executive_summary}")
```

### Pattern 4: Handling Optional Extractions

When some fields may not be present in the source text:

```python
from pydantic import BaseModel
from typing import Optional

class DocumentExtraction(BaseModel):
    invoice_number: Optional[str] = None
    vendor_name: str                          # Always present
    date: Optional[str] = None
    line_items: list[dict] = Field(default_factory=list)
    total: Optional[float] = None
    tax: Optional[float] = None
    extraction_confidence: float = Field(ge=0, le=1)
    extraction_notes: Optional[str] = None   # Model notes missing data here
```

Instruct the model to set `extraction_confidence` low and add `extraction_notes` when data is ambiguous. This gives you a programmatic way to route low-confidence extractions to human review.

---

## Reliability: What Actually Goes Wrong

### Problem 1: Context Length vs Schema Complexity

Large schemas with many nested models consume prompt tokens for schema injection. For GPT-4o with a complex schema and long input document, you may hit context limits.

**Fix:** Use smaller schemas or split into sequential extraction passes:

```python
# Pass 1: Extract basic info
basic = client.chat.completions.create(
    model="gpt-4o-mini",  # Cheaper for simple extraction
    messages=[{"role": "user", "content": f"Extract name, date, ID from: {doc}"}],
    response_model=BasicInfo,
)

# Pass 2: Extract details using basic info as context
details = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": f"Given {basic}, extract detailed financials from: {doc}"}],
    response_model=FinancialDetails,
)
```

### Problem 2: Model Refusal Filling Required Fields

When a model refuses to answer (safety filter, uncertainty), it may fill required fields with placeholder values like `"N/A"` or `"Unknown"` rather than raising an error.

**Fix:** Add explicit validation:

```python
from pydantic import validator

class SafeExtraction(BaseModel):
    category: str

    @validator('category')
    def not_placeholder(cls, v):
        placeholders = {"n/a", "unknown", "not available", "none", ""}
        if v.lower() in placeholders:
            raise ValueError("Model returned placeholder value — extraction failed")
        return v
```

### Problem 3: Inconsistent Date/Number Formats

LLMs format dates and numbers inconsistently (`"March 15, 2026"` vs `"2026-03-15"` vs `"15/03/26"`).

**Fix:** Use `datetime` types and provide format instructions:

```python
from datetime import date
from pydantic import BaseModel

class Event(BaseModel):
    event_date: date  # Pydantic auto-parses many date formats
    duration_minutes: int  # Not float — forces rounding
```

---

## Choosing the Right Approach in 2026

| Scenario | Recommended Approach |
|----------|---------------------|
| Simple data extraction, OpenAI | Structured Outputs + Pydantic |
| Agentic workflows, tool selection | Function calling (OpenAI) or tool use (Claude) |
| Multi-provider production apps | Instructor library |
| Type-safe agent development | Pydantic AI |
| Self-hosted/open models | Instructor + Ollama/vLLM |
| Streaming long documents | Instructor streaming mode |

---

## Quick Reference: Provider Comparison

| Feature | OpenAI | Anthropic Claude |
|---------|--------|-----------------|
| Schema-enforced output | Structured Outputs | Tool use (force tool) |
| Best library | Instructor | Instructor |
| JSON mode (soft) | ✓ | ✗ (use tool use) |
| Streaming structured | ✓ (Instructor) | ✓ (Instructor) |
| Parallel tool calls | ✓ | ✓ |

---

## Next Steps

- Explore DevPlaybook's [JSON Formatter](/tools/json-formatter) for validating LLM output schemas during development
- Check the [API Testing Tools](/tools/api-testing) collection for testing structured output endpoints

For more developer utilities, LLM integration templates, and production-ready AI patterns, check out the **DevToolkit Starter Kit** — includes Instructor setup templates, Pydantic AI starter projects, and structured output examples.

👉 [Get the DevToolkit Starter Kit on Gumroad](https://vicnail.gumroad.com/l/devtoolkit)
