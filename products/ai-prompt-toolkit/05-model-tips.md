# Model-Specific Tips

> 10 tips for getting the best results from Claude, ChatGPT, and Gemini.

---

## TIP-1: Claude — Use XML Tags for Complex Prompts

Claude responds significantly better when you use XML-style tags to structure your input.

**Instead of:**
```
Here's my code and the bug: [code] [error]
```

**Do this:**
```
<code>
{{YOUR_CODE}}
</code>

<error>
{{ERROR_MESSAGE}}
</error>

<task>
Find the root cause of this error and suggest a fix.
</task>
```

Why it works: Claude's training emphasized structured XML input. It reduces ambiguity about what's code vs. instructions.

---

## TIP-2: Claude — "Think step by step" Before Complex Reasoning

For architecture decisions, debugging, or any multi-step reasoning:

```
Think step by step before answering.

{{YOUR_QUESTION_OR_PROBLEM}}
```

Or more explicitly:

```
Before giving your answer, reason through this carefully:
1. What are the key factors here?
2. What are the trade-offs?
3. What's the most likely correct answer?

Then give your final recommendation.
```

---

## TIP-3: ChatGPT — Use System Roles for Consistency

When using the API or a custom GPT, set a system role to maintain consistent persona and output format:

```
System: You are a senior backend engineer specializing in Node.js and PostgreSQL.
You give direct, opinionated advice. When reviewing code, always structure your
response as: [Critical Issues] → [Improvements] → [Minor Suggestions].
Never hedge — give a clear recommendation.
```

---

## TIP-4: ChatGPT — Temperature 0 for Factual/Code Tasks

For code generation, debugging, and factual questions: use `temperature: 0` (via API) for deterministic, focused responses. Reserve higher temperatures for creative tasks like naming, copywriting, or brainstorming.

Equivalent prompt instruction when you can't set temperature:
```
Be precise and consistent. Avoid speculation. If you're uncertain, say so rather
than guessing. Prioritize correctness over creativity.
```

---

## TIP-5: Gemini — Best for Large Context Analysis

Gemini 1.5 Pro has a 1M token context window — use it for tasks that require analyzing entire codebases.

Effective pattern:
```
I'm providing the full source code of {{MODULE_OR_REPO}}.

After reading it completely, answer:
1. {{QUESTION_1}}
2. {{QUESTION_2}}
3. {{QUESTION_3}}

Take your time to read all files before responding.

[PASTE ENTIRE CODEBASE / MULTIPLE FILES]
```

---

## TIP-6: All Models — Few-Shot Examples for Consistent Format

When you need output in a specific format, show an example:

```
Format your response exactly like this example:

---
**Issue:** [Short title]
**Severity:** Critical / High / Medium / Low
**Location:** [File:Line]
**Problem:** [One sentence]
**Fix:** [Specific change]
---

Now review this code:
{{YOUR_CODE}}
```

---

## TIP-7: Claude — Extended Thinking for Hard Problems

For difficult problems (algorithm design, debugging production issues, architecture decisions), explicitly request deep reasoning:

```
This is a difficult problem. I want you to think deeply before answering.

Consider multiple approaches, think about edge cases and failure modes,
and explain your reasoning as you go.

Problem: {{YOUR_HARD_PROBLEM}}
```

---

## TIP-8: All Models — Constrain the Output Length

Models tend to pad responses. Constrain when you need efficiency:

```
Answer in under 150 words. Be direct and specific.
```

Or for code:
```
Only output the corrected function. No explanation needed.
```

Or for options:
```
Give exactly 3 options. No more. Bullet points only.
```

---

## TIP-9: ChatGPT — Use Code Interpreter for Data Analysis

When analyzing CSV files, logs, or structured data, upload the file and use this prompt pattern:

```
Analyze this {{CSV / LOG FILE}}.

Answer:
1. {{SPECIFIC_QUESTION_1}}
2. {{SPECIFIC_QUESTION_2}}

Show your analysis steps. Then give a one-paragraph summary of key findings.
```

ChatGPT's Code Interpreter will execute real Python to analyze the data, not just describe it.

---

## TIP-10: All Models — Iterative Refinement Pattern

Don't try to get the perfect output in one shot. Use this loop:

**Step 1 — First draft:**
```
{{YOUR_INITIAL_PROMPT}}
```

**Step 2 — Targeted refinement:**
```
Good start. Now:
- Make {{SECTION}} more specific
- Remove {{PART_YOU_DON'T_NEED}}
- Add an example for {{CONCEPT}}
```

**Step 3 — Format cleanup:**
```
Reformat the previous response as:
- {{DESIRED_FORMAT}}
Keep all the content, just restructure it.
```

This 3-step pattern consistently produces better output than one complex prompt.

---

*AI Prompt Engineering Toolkit v1.0 — DevPlaybook*
