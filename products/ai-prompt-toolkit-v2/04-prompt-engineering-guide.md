# Prompt Engineering Guide — Patterns, Techniques & Quick Reference

> Master these patterns to write prompts that consistently get better results.

---

## The 5 Components of a Good Prompt

Every effective prompt contains some combination of these:

| Component | Description | Example |
|-----------|-------------|---------|
| **Role** | Who the AI should be | "You are a senior security engineer" |
| **Context** | Background information | "This is a fintech app processing payments" |
| **Task** | What you want done | "Review this code for vulnerabilities" |
| **Format** | How to structure output | "Output as a numbered list with severity levels" |
| **Constraints** | Limits or requirements | "Under 300 words. No jargon." |

---

## Pattern 1: Chain-of-Thought

Forces the model to reason step by step before answering. Use for: math, logic, complex decisions.

**Template:**
```
[Your question or task]

Think through this step by step before giving your final answer.
```

**Advanced version:**
```
[Task]

Before answering, work through:
1. What are the key constraints?
2. What approaches could solve this?
3. What are the trade-offs of each?
4. Which approach is best and why?

Then provide your final recommendation.
```

---

## Pattern 2: Few-Shot Examples

Show the model what good output looks like. Use for: consistent formatting, tone matching, classification.

**Template:**
```
I want you to [TASK].

Here are examples of what I'm looking for:

Input: [EXAMPLE_INPUT_1]
Output: [EXAMPLE_OUTPUT_1]

Input: [EXAMPLE_INPUT_2]
Output: [EXAMPLE_OUTPUT_2]

Now do this for:
Input: [YOUR_ACTUAL_INPUT]
Output:
```

---

## Pattern 3: Role Assignment

Give the model a specific persona for domain expertise. Use for: technical reviews, writing in a specific voice.

**Template:**
```
You are [ROLE] with [X] years of experience in [DOMAIN].
You are known for [KEY_ATTRIBUTE].

[Task]
```

**Examples:**
- "You are a staff engineer at a FAANG company who cares deeply about code maintainability."
- "You are a direct, no-BS startup CTO who has seen hundreds of codebases."
- "You are a copywriter who specializes in SaaS product landing pages."

---

## Pattern 4: Constraints and Anti-patterns

Tell the model what NOT to do. Use for: avoiding common AI tendencies like padding, hedging, or being vague.

**Common constraints:**
```
- Do not use phrases like "Certainly!", "Of course!", "Absolutely!"
- Do not start with a summary of what I asked
- Do not hedge with "it depends" — give me a recommendation
- Under 200 words
- No bullet points, use prose
- No code examples, just explanation
```

---

## Pattern 5: Output Format Control

Specify exactly what structure you want. Use for: consistent, parseable output.

**JSON output:**
```
[Task]

Respond ONLY with valid JSON in this exact format:
{
  "field1": "string",
  "field2": ["array", "of", "strings"],
  "field3": number
}
Do not include any text before or after the JSON.
```

**Table output:**
```
[Task]

Format your response as a markdown table with columns: [COL1] | [COL2] | [COL3]
Include a summary paragraph after the table.
```

---

## Pattern 6: Iterative Refinement

Use multiple prompts to refine output. Don't try to do everything in one shot.

**Sequence:**
```
Prompt 1: "Generate [THING]. Prioritize completeness over polish."

Prompt 2: "Review the [THING] above and identify the 3 weakest parts."

Prompt 3: "Rewrite those 3 sections to be stronger. Keep everything else the same."

Prompt 4: "Final pass: check for consistency, clarity, and any missing pieces."
```

---

## Pattern 7: Persona Comparison

Get multiple perspectives by asking different "experts" to weigh in.

**Template:**
```
[Describe your situation or decision]

I want 3 perspectives on this:

1. A skeptic who will challenge my assumptions and find flaws
2. An optimist who will identify opportunities and upsides
3. A pragmatist who will focus on implementation and trade-offs

For each perspective, give 3-4 specific points. Label each clearly.
```

---

## Pattern 8: Working Backward

Start from the desired outcome and reason backward. Great for planning.

**Template:**
```
My goal is: {{END_GOAL}}

Today's situation: {{CURRENT_STATE}}

Work backward to create a step-by-step plan. Start from the goal and identify what must be true immediately before the goal is achieved, then what must be true before that, etc.

Present as a reverse timeline, then convert to a forward-facing action plan.
```

---

## Pattern 9: Structured Critique

Get specific, useful feedback instead of general praise or criticism.

**Template:**
```
[Paste your work here]

Critique this using the following framework:

1. **What works well** (be specific, 2-3 points)
2. **Critical issues** that must be fixed before this is ready
3. **Nice-to-have improvements** that would make this significantly better
4. **What would make this excellent** (what's the gap between good and great here?)

Do not give vague feedback. Every point should reference something specific.
```

---

## Pattern 10: Constraint Exploration

Discover what constraints are actually limiting you. Great for problem-solving.

**Template:**
```
I'm trying to [GOAL] but I'm stuck because [OBSTACLE].

Before suggesting solutions:
1. Question whether my stated goal is actually what I need
2. Question whether [OBSTACLE] is a real constraint or an assumption
3. Identify any constraints I haven't mentioned that might be relevant

Then suggest 3 approaches — at least one that works within my constraints, and one that challenges them.
```

---

## Quick Reference: Prompt Anti-patterns to Avoid

| Anti-pattern | Problem | Fix |
|---|---|---|
| "Write me a good X" | Too vague | Specify audience, length, tone, format |
| "Make this better" | No direction | Say what "better" means for your goal |
| Everything in one prompt | Overloaded output | Break into sequential prompts |
| No context | Generic output | Add who, what, why, and constraints |
| "Tell me about X" | Essay mode | Ask for specific deliverable or format |
| Accepting first output | Missed potential | Iterate with specific feedback |

---

## Temperature Guide (Claude / ChatGPT)

| Task | Temperature | Setting |
|------|-------------|---------|
| Code generation, factual tasks | Low | 0.1 – 0.3 |
| Analysis, structured writing | Medium-low | 0.3 – 0.5 |
| Creative writing, brainstorming | Medium-high | 0.7 – 1.0 |
| Poetry, highly creative tasks | High | 1.0 – 1.2 |

---

## Model Selection Quick Guide

| Task | Best Model | Why |
|------|-----------|-----|
| Large codebase analysis | Claude Opus / Gemini 1.5 Pro | Large context window |
| Quick code help | Claude Sonnet / GPT-4o | Speed + quality balance |
| Documentation, writing | Claude Sonnet | Strong prose quality |
| Math + reasoning | o1 / Claude Opus | Deep reasoning |
| Cheap bulk tasks | Claude Haiku / GPT-4o-mini | Cost-efficient |

---

*DevPlaybook — Tools for Developers Who Ship*
*devplaybook.cc*
