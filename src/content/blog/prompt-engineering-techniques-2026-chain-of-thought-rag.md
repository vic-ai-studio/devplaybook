---
title: "Prompt Engineering Techniques 2026: Chain-of-Thought, RAG, and Advanced Patterns"
description: "Advanced prompt engineering guide for 2026: Chain-of-Thought, Tree-of-Thought, RAG integration, few-shot learning, prompt chaining, and evaluation techniques."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["prompt-engineering", "llm", "ai", "chain-of-thought", "rag", "few-shot", "gpt", "claude"]
readingTime: "13 min read"
---

Prompting has evolved from a curiosity into a core engineering discipline. In 2024, knowing how to write a clear instruction to a language model was a competitive edge. In 2026, advanced prompting is a required skill for anyone building reliable AI-powered systems. Models have become more capable, but the difference between a mediocre and an excellent prompt still determines whether a product works or frustrates users.

This guide covers the full spectrum: from foundational zero-shot and few-shot patterns through Chain-of-Thought and Tree-of-Thought reasoning, to RAG integration, prompt chaining, and evaluation. Each technique includes a concrete code example. At the end, you will find a decision guide for choosing the right technique for each use case.

## The Evolution of Prompting

Understanding where we are requires knowing where we came from:

- **2020–2022:** Zero-shot prompting. Give the model a task description and hope for the best.
- **2022–2023:** Few-shot learning. Provide examples of desired input-output pairs. Quality improved dramatically.
- **2023:** Chain-of-Thought (CoT). Add "Let's think step by step." Reasoning quality doubled on complex tasks.
- **2024:** Tree-of-Thought, self-consistency, and RAG integration became standard production patterns.
- **2025–2026:** Prompt chaining, agentic orchestration, and systematic evaluation pipelines are now the baseline for serious AI applications.

Each layer builds on the previous. A production prompt in 2026 rarely uses just one technique — it typically combines several.

## Zero-Shot Prompting

Zero-shot is the baseline: no examples, just a clear task description. With modern frontier models, zero-shot works surprisingly well for well-defined tasks.

```python
import anthropic

client = anthropic.Anthropic()

def classify_sentiment(text: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=10,
        messages=[{
            "role": "user",
            "content": f"Classify the sentiment of this text as POSITIVE, NEGATIVE, or NEUTRAL. Respond with only the label.\n\nText: {text}"
        }]
    )
    return response.content[0].text.strip()
```

Zero-shot works when the task is unambiguous and well-represented in the model's training data. It breaks down when the task requires nuanced judgment, domain-specific knowledge, or a specific output format not self-evident from the instruction.

## Few-Shot Learning

Few-shot prompting provides examples of the desired input-output behavior. The model uses these examples as implicit instructions about format, style, and judgment.

```python
def extract_entities_few_shot(text: str) -> str:
    examples = [
        {
            "input": "Apple announced the iPhone 17 in San Francisco yesterday.",
            "output": '{"companies": ["Apple"], "products": ["iPhone 17"], "locations": ["San Francisco"]}'
        },
        {
            "input": "Elon Musk visited Tesla's Berlin Gigafactory last Tuesday.",
            "output": '{"people": ["Elon Musk"], "companies": ["Tesla"], "locations": ["Berlin Gigafactory"]}'
        },
    ]

    example_text = "\n\n".join([
        f"Input: {e['input']}\nOutput: {e['output']}"
        for e in examples
    ])

    prompt = f"""Extract named entities from text. Return JSON with keys for each entity type found.

{example_text}

Input: {text}
Output:"""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()
```

### Few-Shot Best Practices

- Use 3–8 examples. More is not always better — examples consume context tokens.
- Examples should cover edge cases, not just the easy cases.
- Maintain consistent formatting across examples.
- When possible, use examples from your actual production distribution.

## Chain-of-Thought (CoT) Prompting

Chain-of-Thought prompting was the most significant prompting discovery of the 2020s. By asking the model to explain its reasoning before giving a final answer, accuracy on complex reasoning tasks improved dramatically. The canonical trigger: "Let's think step by step."

```python
def solve_math_problem(problem: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Solve this math problem. Show your work step by step, then provide the final answer.

Problem: {problem}

Let's think step by step:"""
        }]
    )

    full_response = response.content[0].text

    # Parse reasoning from final answer
    lines = full_response.strip().split("\n")
    final_answer = next(
        (line for line in reversed(lines) if line.strip()),
        lines[-1]
    )

    return {
        "reasoning": full_response,
        "answer": final_answer,
    }
```

### Zero-Shot CoT vs. Few-Shot CoT

Zero-shot CoT ("Let's think step by step") is simpler and works well for general reasoning. Few-shot CoT provides example reasoning chains, which is more effective for domain-specific problems where the reasoning structure is not obvious:

```python
FEW_SHOT_COT_EXAMPLES = """
Q: A store has 50 apples. They sell 30% on Monday and 20% of the remaining on Tuesday. How many are left?
A: Let me work through this step by step.
Starting apples: 50
Monday: 30% of 50 = 15 sold. Remaining: 50 - 15 = 35
Tuesday: 20% of 35 = 7 sold. Remaining: 35 - 7 = 28
Answer: 28 apples remain.

Q: {question}
A: Let me work through this step by step.
"""
```

## Tree-of-Thought (ToT) — Multi-Path Reasoning

Tree-of-Thought extends CoT by exploring multiple reasoning paths simultaneously and selecting the best one. It is significantly more expensive (requires multiple LLM calls) but dramatically improves performance on problems that benefit from exploring alternatives.

```python
def tree_of_thought_solve(problem: str, num_paths: int = 3) -> str:
    # Step 1: Generate multiple initial approaches
    paths_prompt = f"""Problem: {problem}

Generate {num_paths} different approaches to solve this problem.
Format each approach as a numbered list.
Be concise — just the approach, not the full solution."""

    paths_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": paths_prompt}]
    )
    approaches = paths_response.content[0].text

    # Step 2: Evaluate each approach
    eval_prompt = f"""Problem: {problem}

Proposed approaches:
{approaches}

For each approach, rate its feasibility (1-10) and identify its main risk.
Then select the best approach and solve it step by step."""

    final_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        messages=[{"role": "user", "content": eval_prompt}]
    )
    return final_response.content[0].text
```

ToT is most valuable for open-ended problems, creative tasks, and situations where the best solution is not obvious. For straightforward reasoning tasks, standard CoT is more cost-effective.

## Self-Consistency — Majority Vote

Self-consistency samples multiple independent reasoning chains and takes the majority answer. It trades cost for reliability — a single chain might reason poorly, but the consensus of 5–10 independent chains is more robust.

```python
import re
from collections import Counter

def self_consistent_answer(question: str, num_samples: int = 5) -> str:
    answers = []

    for _ in range(num_samples):
        response = client.messages.create(
            model="claude-haiku-4-5",  # Use a faster model for sampling
            max_tokens=500,
            temperature=0.8,  # Higher temperature for diverse reasoning paths
            messages=[{
                "role": "user",
                "content": f"{question}\n\nLet's think step by step, then give the final answer on a line starting with 'Answer:'"
            }]
        )
        text = response.content[0].text
        # Extract the final answer
        match = re.search(r"Answer:\s*(.+)", text, re.IGNORECASE)
        if match:
            answers.append(match.group(1).strip().lower())

    # Return majority vote
    if not answers:
        return "No consistent answer found"

    return Counter(answers).most_common(1)[0][0]
```

Self-consistency is particularly effective for factual questions where the model might make different errors on different attempts, but the correct answer consistently wins the majority vote.

## RAG Integration Patterns

Retrieval-Augmented Generation (RAG) combines LLM reasoning with external knowledge retrieval. In 2026, basic RAG is commodity — the differentiation comes from advanced patterns that improve retrieval quality.

### Query Rewriting

The user's original query is often a poor retrieval query. Rewriting it before retrieval dramatically improves recall:

```python
def rewrite_query_for_retrieval(user_query: str) -> list[str]:
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"""Generate 3 different search queries that would retrieve relevant documents for answering this question.
Focus on different aspects and keywords.

Original question: {user_query}

Return only the 3 queries, one per line, no numbering or labels."""
        }]
    )
    queries = response.content[0].text.strip().split("\n")
    return [q.strip() for q in queries if q.strip()]
```

### HyDE (Hypothetical Document Embeddings)

Instead of embedding the query directly, generate a hypothetical answer and embed that. The hypothesis is semantically closer to the target documents than the question:

```python
def hyde_retrieve(query: str, retriever) -> list:
    # Generate a hypothetical answer
    hypothesis_response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Write a short, factual paragraph that would answer this question: {query}"
        }]
    )
    hypothetical_answer = hypothesis_response.content[0].text

    # Use the hypothesis for retrieval instead of the original query
    retrieved_docs = retriever.retrieve(hypothetical_answer)
    return retrieved_docs
```

### Re-Ranking

Retrieve more documents than you need, then use a cross-encoder or LLM to re-rank and select only the most relevant:

```python
def rerank_documents(query: str, documents: list[str], top_k: int = 3) -> list[str]:
    docs_formatted = "\n\n".join([f"[{i+1}] {doc}" for i, doc in enumerate(documents)])

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Query: {query}

Documents:
{docs_formatted}

Return the numbers of the {top_k} most relevant documents for answering the query, in order from most to least relevant.
Format: comma-separated numbers only, e.g.: 3,1,5"""
        }]
    )

    try:
        indices = [int(x.strip()) - 1 for x in response.content[0].text.split(",")]
        return [documents[i] for i in indices[:top_k] if 0 <= i < len(documents)]
    except (ValueError, IndexError):
        return documents[:top_k]
```

## Prompt Chaining and Orchestration

Complex tasks benefit from decomposition into a chain of simpler prompts, where each step's output becomes the next step's input:

```python
def research_and_write(topic: str) -> dict:
    # Step 1: Generate an outline
    outline_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": f"Create a detailed outline for a blog post about: {topic}"}]
    )
    outline = outline_response.content[0].text

    # Step 2: Identify questions the outline should answer
    questions_response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Based on this outline, list 5 key questions a reader would want answered:\n\n{outline}"
        }]
    )
    questions = questions_response.content[0].text

    # Step 3: Write the full article using outline and questions as constraints
    article_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Write a comprehensive blog post following this outline and ensuring all questions are answered.

Outline:
{outline}

Questions to address:
{questions}

Write the full article now:"""
        }]
    )

    return {
        "outline": outline,
        "key_questions": questions,
        "article": article_response.content[0].text,
    }
```

Chaining works because it breaks the task into steps where each step can be optimized, debugged, and evaluated independently.

## Constitutional AI and System Prompt Design

The system prompt is the highest-leverage control surface in prompt engineering. A well-designed system prompt establishes the model's persona, constraints, and behavioral guidelines:

```python
SYSTEM_PROMPT = """You are a technical documentation assistant for a Python library.

## Your Role
Help developers understand and use the library effectively.

## Guidelines
- Always provide working code examples when explaining concepts
- If you are unsure about something, say so explicitly rather than guessing
- Keep explanations concise but complete — assume a senior engineer audience
- When answering questions about behavior, cite the relevant function or class name

## Constraints
- Do not invent API methods that do not exist in the library
- Do not suggest external libraries unless the user asks for alternatives
- If a question is out of scope, say so and redirect to the appropriate resource

## Output Format
- Use code blocks for all code examples
- Use bullet points for lists of options or steps
- Keep answers under 300 words unless a longer explanation is clearly needed
"""
```

Constitutional AI principles — building in self-correction through explicit constraints and guidelines — are most effective when the constraints are specific and verifiable, not vague appeals to quality.

## Prompt Evaluation Techniques

Building prompts without evaluation is guesswork. Production prompt engineering requires systematic measurement.

### BLEU and BERTScore for Text Quality

```python
from bert_score import score as bert_score
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

def evaluate_generation(reference: str, hypothesis: str) -> dict:
    # BLEU score (n-gram overlap, good for translation-like tasks)
    reference_tokens = reference.split()
    hypothesis_tokens = hypothesis.split()
    smoothing = SmoothingFunction().method1
    bleu = sentence_bleu([reference_tokens], hypothesis_tokens, smoothing_function=smoothing)

    # BERTScore (semantic similarity, better for paraphrase/summarization)
    P, R, F1 = bert_score([hypothesis], [reference], lang="en")

    return {
        "bleu": round(bleu, 4),
        "bert_f1": round(F1.item(), 4),
    }
```

### LLM-as-Judge

For tasks where ground truth is hard to define, LLM-as-judge provides scalable evaluation:

```python
def llm_judge_response(question: str, answer: str, rubric: str) -> dict:
    judge_prompt = f"""Evaluate this answer according to the rubric below.

Question: {question}

Answer to evaluate:
{answer}

Rubric:
{rubric}

Respond with:
SCORE: [1-10]
REASONING: [2-3 sentences explaining the score]
ISSUES: [bullet list of specific problems, or "None" if none]"""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=400,
        messages=[{"role": "user", "content": judge_prompt}]
    )

    text = response.content[0].text
    score_match = re.search(r"SCORE:\s*(\d+)", text)
    score = int(score_match.group(1)) if score_match else None

    return {"score": score, "evaluation": text}
```

LLM-as-judge scales to arbitrary quality dimensions and correlates well with human judgment on most tasks. Be aware of the judge model's own biases — it tends to prefer longer, more confident answers even when shorter, hedged answers are more accurate.

## Decision Guide: Which Technique for Which Use Case

| Task Type | Recommended Technique | Why |
|-----------|----------------------|-----|
| Simple classification/extraction | Zero-shot or few-shot | Low complexity; few-shot adds robustness |
| Math and logic problems | Few-shot CoT | Explicit reasoning chain required |
| Open-ended reasoning | Tree-of-Thought | Multiple approaches worth exploring |
| Critical factual questions | Self-consistency | Reduces variance on high-stakes queries |
| Domain-specific knowledge | RAG + query rewriting | Model lacks the specific knowledge |
| Complex multi-step tasks | Prompt chaining | Each step is independently verifiable |
| Consistent output format | Few-shot + system prompt | Examples + constraints together |
| Adversarial inputs | Constitutional AI + system prompt | Explicit behavioral constraints |

## Conclusion

Prompt engineering in 2026 is a layered discipline. Start with the clearest possible instruction (zero-shot), add examples to establish format and judgment (few-shot), use Chain-of-Thought for reasoning-heavy tasks, and adopt RAG when the model needs external knowledge. Apply self-consistency for high-stakes answers where reliability matters more than cost. Use prompt chaining to decompose complex workflows into manageable, testable steps.

The single most impactful practice is **evaluation**. Teams that treat prompts as code — versioned, tested, and measured against a benchmark dataset — consistently outperform those who iterate by feel. Invest in a prompt evaluation pipeline early, and every subsequent improvement becomes measurable.
