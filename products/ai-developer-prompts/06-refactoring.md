# Refactoring Prompts (Bonus)

5 bonus prompts for targeted refactoring tasks.

---

## RF-01 — Extract and Simplify

```
Refactor this {{LANGUAGE}} code. It works, but it's too complex.

```{{LANGUAGE}}
{{CODE}}
```

Goals:
- Reduce cognitive complexity (aim for functions under 20 lines)
- Extract repeated logic into named helpers
- Replace magic numbers/strings with named constants
- Improve naming without changing behavior

Constraints:
- Do NOT change behavior
- Do NOT add features
- Do NOT change the public API

Show the refactored code and a brief explanation of each change.
```

---

## RF-02 — Convert to Modern Syntax

```
Modernize this {{LANGUAGE}} code to use current language features.

```{{LANGUAGE}}
{{CODE}}
```

Target version: {{LANGUAGE_VERSION}}
Current version: {{CURRENT_VERSION}}

Replace outdated patterns with modern equivalents:
{{EXAMPLES_LIKE_VAR_TO_CONST_OR_CALLBACKS_TO_ASYNC_AWAIT}}

Requirements:
- Maintain identical behavior
- Don't add functionality
- Keep compatibility with {{MINIMUM_SUPPORTED_ENV}}

Show before/after for each modernization and explain the improvement.
```

---

## RF-03 — Design Pattern Application

```
Apply an appropriate design pattern to improve this code.

```{{LANGUAGE}}
{{CODE}}
```

**Current problem:**
{{PROBLEM_DESCRIPTION}}

Recommend a design pattern that addresses this problem. For your recommended pattern:
1. Name the pattern and explain why it fits this problem
2. Show the refactored code applying the pattern
3. Explain the trade-offs (what gets better, what gets more complex)
4. Identify if there's a simpler solution that doesn't need a formal pattern

Don't apply patterns for their own sake. Only recommend one if it genuinely improves the code.
```

---

## RF-04 — Remove Dead Code

```
Identify and remove dead code from this {{LANGUAGE}} codebase.

**Files:**
```{{LANGUAGE}}
{{CODE}}
```

Find:
1. Unreachable code (after return, in impossible branches)
2. Unused variables, parameters, and imports
3. Commented-out code blocks
4. Functions/classes that are defined but never called
5. Feature flags that are always on/off

For each item:
- Quote the dead code
- Confirm it's actually dead (not just hard to find usages of)
- Show the file with dead code removed

Be conservative — if there's any doubt about whether something is used (e.g., dynamic imports, reflection), keep it and flag it with a comment instead of deleting.
```

---

## RF-05 — Dependency Injection Refactor

```
Refactor this code to use dependency injection.

```{{LANGUAGE}}
{{CODE}}
```

**Problem:** Hard dependencies on {{DEPENDENCIES}} make this code untestable and tightly coupled.

Refactor to:
1. Accept dependencies through constructor/function parameters instead of creating them internally
2. Define interfaces for dependencies (if typed language)
3. Keep the same public API

Show:
- The refactored code
- An example of how to wire it together in production
- An example of how to test it with mocks

Keep the refactor minimal — only change what's needed for injectable dependencies, nothing else.
```
