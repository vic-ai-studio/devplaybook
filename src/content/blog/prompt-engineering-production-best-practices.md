---
title: "Prompt Engineering for Production: Beyond Basic Prompts 2026"
description: "Production prompt engineering 2026: system prompt design, few-shot examples, chain-of-thought, structured output with Pydantic, prompt versioning, testing prompts with evals, and cost optimization."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["prompt engineering", "LLM", "chain-of-thought", "structured output", "evals", "production AI"]
readingTime: "10 min read"
category: "ai"
---

Most "prompt engineering" tutorials show you how to get a better answer in a playground. Production prompt engineering is a different discipline: you're writing prompts that run millions of times, must produce consistent structured output, need to be testable and versionable, and have to degrade gracefully when the LLM doesn't cooperate.

This guide covers what actually matters when prompts are code.

---

## System Prompt Anatomy

A production system prompt has distinct sections, each serving a specific purpose:

```
[Role Definition]
[Context and Domain Constraints]
[Behavioral Rules]
[Output Format Specification]
[Edge Case Handling]
[Examples] (optional — for few-shot)
```

Here's a concrete example for a customer support classifier:

```
You are a customer support ticket classifier for Acme Software, a B2B SaaS company.

Your domain: Acme's products are project management tools (Pro, Enterprise, API).
You have no knowledge of other companies' products.

Rules:
- Classify every ticket into exactly one primary category
- Assign an urgency level (low/medium/high/critical)
- If a ticket is about billing, always flag for human review
- If the ticket language is unclear, classify as "needs_clarification"
- Never suggest competitors' products
- Never make promises about timelines or refunds

Output format: You must respond with valid JSON matching this schema exactly:
{
  "category": "<bug_report|feature_request|billing|account_access|general_inquiry|needs_clarification>",
  "urgency": "<low|medium|high|critical>",
  "requires_human_review": <true|false>,
  "summary": "<one sentence, max 100 chars>",
  "suggested_team": "<engineering|billing|support|sales>"
}

If you cannot classify the ticket confidently, use category "needs_clarification" rather than guessing.
```

Key principles:
- **Role before rules**: Establish identity before constraints
- **Explicit output format**: Define schema, not just "respond in JSON"
- **Enumerate all valid values**: Don't let the model invent new categories
- **Graceful fallback**: Define what to do when uncertain

---

## Few-Shot Examples: Quality Over Quantity

Few-shot examples teach the model what you want through demonstration. Three well-chosen examples outperform ten mediocre ones.

**Bad few-shot** (generic, doesn't cover edge cases):
```
Input: "My app crashed"
Output: {"category": "bug_report", "urgency": "high"}

Input: "How do I add a team member?"
Output: {"category": "general_inquiry", "urgency": "low"}
```

**Good few-shot** (covers edge cases, shows reasoning in output):
```python
FEW_SHOT_EXAMPLES = """
--- Example 1: Critical bug with customer impact ---
Ticket: "Our entire team is locked out of the system since the 2am maintenance window. We have a board presentation in 2 hours and cannot access any data. This is completely unacceptable."
Output: {"category": "account_access", "urgency": "critical", "requires_human_review": true, "summary": "Full team locked out post-maintenance, time-sensitive board meeting", "suggested_team": "engineering"}

--- Example 2: Billing edge case requiring human review ---
Ticket: "I was charged twice for my November invoice but my account shows only one payment. Invoice #INV-2026-11-4892."
Output: {"category": "billing", "urgency": "high", "requires_human_review": true, "summary": "Duplicate charge on Nov invoice, specific invoice number provided", "suggested_team": "billing"}

--- Example 3: Ambiguous ticket → needs clarification ---
Ticket: "It doesn't work anymore since yesterday's update."
Output: {"category": "needs_clarification", "urgency": "medium", "requires_human_review": false, "summary": "Vague issue report lacking product and behavior details", "suggested_team": "support"}
"""
```

Selection criteria for examples:
1. Include at least one edge case that the model would likely handle wrong
2. Include the most common case
3. Include the hardest ambiguous case
4. Keep examples consistent in format — inconsistent examples confuse more than help

---

## Chain-of-Thought for Complex Reasoning

For tasks requiring multi-step reasoning, CoT dramatically improves accuracy. Two variants:

### Zero-Shot CoT

Add "Think step by step" or a structured reasoning instruction:

```python
ANALYSIS_PROMPT = """Analyze whether this code change introduces a security vulnerability.

Think through this step by step:
1. Identify what the code does
2. Identify any user-controlled inputs
3. Check if inputs reach sensitive operations (DB, filesystem, network, eval)
4. Assess if existing sanitization is sufficient
5. Render a final verdict

Code:
{code_diff}

Analysis:"""
```

### Scratchpad Pattern for Structured Tasks

Have the model reason in a scratchpad before producing final output. This prevents premature commitment:

```python
CLASSIFICATION_PROMPT = """Classify this support ticket.

<scratchpad>
First, identify the key issue the customer is experiencing.
Then consider: is this a bug, feature request, billing issue, or access problem?
Consider urgency: is there a hard deadline, revenue impact, or total blocker?
Does this mention money, invoices, or payment? If so, flag for human review.
</scratchpad>

After your analysis, output JSON matching this exact schema:
{"category": "...", "urgency": "...", "requires_human_review": ..., "summary": "...", "suggested_team": "..."}

Ticket: {ticket_text}"""
```

The scratchpad content is never shown to users — it just improves output quality by having the model work through the problem first.

---

## Structured Output with Pydantic and Instructor

Regex-parsing LLM JSON is fragile. Use the `instructor` library for validated structured output:

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel, Field
from enum import Enum
from typing import Literal

class TicketCategory(str, Enum):
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    BILLING = "billing"
    ACCOUNT_ACCESS = "account_access"
    GENERAL_INQUIRY = "general_inquiry"
    NEEDS_CLARIFICATION = "needs_clarification"

class TicketClassification(BaseModel):
    category: TicketCategory
    urgency: Literal["low", "medium", "high", "critical"]
    requires_human_review: bool
    summary: str = Field(max_length=100, description="One sentence summary")
    suggested_team: Literal["engineering", "billing", "support", "sales"]

    class Config:
        use_enum_values = True

# Patch OpenAI client with instructor
client = instructor.from_openai(OpenAI())

def classify_ticket(ticket_text: str) -> TicketClassification:
    return client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=TicketClassification,  # Automatic validation + retry
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": ticket_text},
        ],
        max_retries=3,  # Retry with validation error feedback if schema fails
    )

# Usage
result = classify_ticket("My app crashed when I tried to export")
print(result.category)   # TicketCategory.BUG_REPORT
print(result.urgency)    # "high"
print(result.requires_human_review)  # False
```

`instructor` automatically handles: JSON parsing errors, schema validation, and retry with error feedback when the model produces invalid output. Validation errors are fed back to the model so it corrects itself.

For Anthropic models:

```python
client = instructor.from_anthropic(anthropic.Anthropic())
```

---

## Prompt Versioning with LangSmith

Treat prompts like code: version them, review changes, track which version produced which output.

```python
from langsmith import Client

client = Client()

# Push a new prompt version
client.push_prompt(
    "support-classifier",
    object=hub.pull("support-classifier:v1.2"),
    tags=["production", "v1.2"],
)

# Pull specific version for production
prompt = client.pull_prompt("support-classifier:v1.2")

# Pull latest
prompt = client.pull_prompt("support-classifier:latest")
```

Workflow:
1. New prompt version goes to `staging` tag
2. Eval runs against `staging`
3. If eval passes threshold, promote to `production` tag
4. Deploy picks up `production` tag — no code deploy needed for prompt changes

---

## Automated Evals: LLM-as-Judge

Manual evaluation doesn't scale. Use an LLM to judge outputs, calibrated against a small human-labeled golden set.

```python
from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()

class EvalResult(BaseModel):
    score: int  # 1-5
    reasoning: str
    passed: bool

JUDGE_PROMPT = """You are evaluating the quality of a customer support ticket classification.

Original ticket: {ticket}
Classification: {classification}

Evaluate on these criteria (score 1-5 each, overall 1-5):
- Correct category (is the category accurate for this ticket?)
- Correct urgency (is the urgency level appropriate?)
- Useful summary (is the summary concise and informative?)

Score 5: Perfect classification, exactly right
Score 4: Mostly correct, minor issues
Score 3: Partially correct, one wrong field
Score 2: Mostly wrong but shows some understanding
Score 1: Completely wrong

Respond with JSON: {"score": <1-5>, "reasoning": "<brief explanation>", "passed": <score >= 4>}"""

def eval_classification(ticket: str, classification: dict) -> EvalResult:
    result = client.beta.chat.completions.parse(
        model="gpt-4o",  # Use stronger model as judge
        response_format=EvalResult,
        messages=[{
            "role": "user",
            "content": JUDGE_PROMPT.format(
                ticket=ticket,
                classification=classification
            )
        }]
    )
    return result.choices[0].message.parsed

# Run eval suite
def run_eval_suite(prompt_version: str, test_cases: list[dict]) -> dict:
    results = []
    for case in test_cases:
        classification = classify_ticket_with_version(case["ticket"], prompt_version)
        eval_result = eval_classification(case["ticket"], classification.dict())
        results.append({
            "passed": eval_result.passed,
            "score": eval_result.score,
        })

    pass_rate = sum(r["passed"] for r in results) / len(results)
    avg_score = sum(r["score"] for r in results) / len(results)

    return {"pass_rate": pass_rate, "avg_score": avg_score, "n": len(results)}
```

Set a gate: prompt changes only reach production if `pass_rate >= 0.90` and `avg_score >= 4.0`.

---

## Cost Optimization

**Semantic caching**: Cache responses for similar prompts. Saves 20–40% on repeated workflows.

**Compress system prompts**: Long system prompts run on every request. Audit and trim them.

```python
# Before: 800 token system prompt
VERBOSE_PROMPT = """
You are a helpful assistant that classifies customer support tickets for Acme Software.
Acme Software is a company that makes project management tools. Their products include
the Pro plan, the Enterprise plan, and the API product. You should classify tickets
into the following categories: bug reports, feature requests, billing issues,
account access problems, or general inquiries...
[continues for 600 more tokens]
"""

# After: 180 token system prompt with same behavior
COMPRESSED_PROMPT = """Classify Acme Software (PM tools: Pro/Enterprise/API) support tickets.
Categories: bug_report|feature_request|billing|account_access|general_inquiry|needs_clarification
Urgency: low|medium|high|critical
Billing tickets: always require_human_review=true
Output: valid JSON only, schema: {category, urgency, requires_human_review, summary(≤100ch), suggested_team}"""
```

**Prompt injection defense**: Wrap user input in XML delimiters to prevent injection:

```python
def safe_wrap_user_input(user_text: str) -> str:
    # Normalize potentially dangerous text
    cleaned = user_text.replace("<", "&lt;").replace(">", "&gt;")
    return f"<user_ticket>\n{cleaned}\n</user_ticket>"

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": safe_wrap_user_input(ticket_text)},
]
```

---

## Production Prompt Checklist

Before shipping a new prompt:

- [ ] System prompt has explicit output format with all valid values enumerated
- [ ] 3+ few-shot examples covering edge cases
- [ ] Structured output enforced via `instructor` or `response_format`
- [ ] Prompt version committed and tagged in LangSmith / Git
- [ ] Eval suite run: pass rate ≥ 90% on golden test set
- [ ] User input wrapped in delimiters (injection defense)
- [ ] System prompt token count audited (< 500 tokens target)
- [ ] Semantic cache configured for high-volume endpoints
- [ ] Trace logging enabled (prompt version logged with every inference)

Prompts that are written once and never measured will quietly degrade as models update, requirements shift, and edge cases accumulate. The teams winning with LLMs in 2026 treat prompts with the same rigor as unit tests and deployment configs.
