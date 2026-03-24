---
title: "How to Use Claude API for Automated Code Review"
description: "Build an automated code review pipeline using the Claude API. Covers security analysis, style enforcement, bug detection, and PR integration with GitHub Actions — with complete working code examples."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["claude-api", "code-review", "automation", "github-actions", "anthropic", "devops", "2025"]
readingTime: "13 min read"
---

Automated code review is one of the highest-leverage applications of AI in a development workflow. Instead of waiting for a human reviewer to check every PR, you get instant feedback on security vulnerabilities, logic errors, style issues, and edge cases — before anyone else looks at the code.

This guide builds a real automated code review system using the Claude API, from a simple script to a full GitHub Actions pipeline.

---

## Why Claude for Code Review?

Claude has a few properties that make it particularly suited to automated code review:

1. **200K token context window** — You can submit large diffs, multiple files, and surrounding context in a single request
2. **Instruction following** — Claude reliably follows structured review formats, which is critical for parsing results programmatically
3. **Reasoning transparency** — Claude explains *why* something is an issue, not just flags it
4. **Low false-positive rate** — Claude's code review tends to be more accurate than rule-based linters for semantic issues

---

## Prerequisites

```bash
pip install anthropic PyGithub python-dotenv
```

Set your API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Step 1: Basic Code Review Function

Start with a simple function that sends code to Claude and gets a structured review back:

```python
import anthropic
import json

client = anthropic.Anthropic()

REVIEW_PROMPT = """You are a senior software engineer conducting a code review.

Analyze the following code and return a JSON response with this exact structure:
{
  "summary": "One-sentence overall assessment",
  "severity": "critical|high|medium|low|pass",
  "issues": [
    {
      "line": <line_number_or_null>,
      "severity": "critical|high|medium|low",
      "category": "security|bug|performance|style|maintainability",
      "description": "Clear description of the issue",
      "suggestion": "Specific fix recommendation"
    }
  ],
  "strengths": ["List of things done well"],
  "overall_recommendation": "approve|request_changes|comment"
}

Code to review:
```{language}
{code}
```

Return only valid JSON, no markdown code blocks."""


def review_code(code: str, language: str = "python", context: str = "") -> dict:
    """
    Submit code to Claude for review and return structured results.

    Args:
        code: The code to review
        language: Programming language (for syntax highlighting context)
        context: Optional context about what the code does

    Returns:
        Parsed JSON review results
    """
    prompt = REVIEW_PROMPT.format(language=language, code=code)
    if context:
        prompt = f"Context: {context}\n\n{prompt}"

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = message.content[0].text
    return json.loads(response_text)
```

Test it:

```python
sample_code = """
import sqlite3

def get_user(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchone()
"""

result = review_code(sample_code, language="python", context="User authentication module")
print(json.dumps(result, indent=2))
```

Expected output (Claude will correctly flag the SQL injection):

```json
{
  "summary": "Critical SQL injection vulnerability makes this code dangerous for production use.",
  "severity": "critical",
  "issues": [
    {
      "line": 6,
      "severity": "critical",
      "category": "security",
      "description": "SQL injection vulnerability: user-supplied input is directly interpolated into the query string. An attacker can manipulate the query to access unauthorized data or damage the database.",
      "suggestion": "Use parameterized queries: cursor.execute('SELECT * FROM users WHERE username = ?', (username,))"
    },
    {
      "line": 4,
      "severity": "medium",
      "category": "maintainability",
      "description": "Database connection is never closed, causing connection leaks under load.",
      "suggestion": "Use a context manager: with sqlite3.connect('users.db') as conn:"
    }
  ],
  "strengths": [],
  "overall_recommendation": "request_changes"
}
```

---

## Step 2: Review a Git Diff

For PR review, you want to analyze the diff rather than the full files:

```python
import subprocess
from pathlib import Path

def get_diff(base_branch: str = "main") -> str:
    """Get the git diff against a base branch."""
    result = subprocess.run(
        ["git", "diff", base_branch, "--unified=5"],
        capture_output=True,
        text=True
    )
    return result.stdout


def review_diff(diff: str, pr_description: str = "") -> dict:
    """Review a git diff for issues."""

    prompt = f"""You are a senior engineer reviewing a pull request diff.

PR Description: {pr_description or "Not provided"}

Analyze this diff and return structured JSON feedback:
{{
  "summary": "Brief assessment of the change",
  "severity": "critical|high|medium|low|pass",
  "issues": [
    {{
      "file": "filename",
      "line": <line_number_or_null>,
      "severity": "critical|high|medium|low",
      "category": "security|bug|performance|style|maintainability",
      "description": "Issue description",
      "suggestion": "Fix recommendation"
    }}
  ],
  "overall_recommendation": "approve|request_changes|comment"
}}

Diff:
{diff}

Return only valid JSON."""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(message.content[0].text)
```

---

## Step 3: GitHub Actions Integration

Set up automatic review on every PR with GitHub Actions:

```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install anthropic PyGithub

      - name: Run AI Code Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.number }}
          REPO: ${{ github.repository }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: python .github/scripts/ai_review.py
```

The review script:

```python
# .github/scripts/ai_review.py
import os
import json
import subprocess
import anthropic
from github import Github

def main():
    # Setup
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    gh = Github(os.environ["GITHUB_TOKEN"])
    repo = gh.get_repo(os.environ["REPO"])
    pr = repo.get_pull(int(os.environ["PR_NUMBER"]))

    # Get diff
    base_sha = os.environ["BASE_SHA"]
    head_sha = os.environ["HEAD_SHA"]
    result = subprocess.run(
        ["git", "diff", f"{base_sha}...{head_sha}", "--unified=5"],
        capture_output=True, text=True
    )
    diff = result.stdout

    if not diff.strip():
        print("No diff to review")
        return

    # Truncate if too large (keep within token limits)
    max_diff_chars = 80000
    if len(diff) > max_diff_chars:
        diff = diff[:max_diff_chars] + "\n\n[Diff truncated - showing first 80K characters]"

    # Call Claude
    prompt = f"""Review this pull request diff as a senior engineer.

PR Title: {pr.title}
PR Description: {pr.body or "None provided"}

Return JSON with this structure:
{{
  "summary": "1-2 sentence assessment",
  "severity": "critical|high|medium|low|pass",
  "issues": [{{"file": "...", "line": null, "severity": "...", "category": "...", "description": "...", "suggestion": "..."}}],
  "overall_recommendation": "approve|request_changes|comment"
}}

Diff:
{diff}

JSON only:"""

    message = client.messages.create(
        model="claude-sonnet-4-6",  # Use Sonnet for cost efficiency on CI
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    review = json.loads(message.content[0].text)

    # Format comment
    severity_emoji = {
        "critical": "🚨", "high": "⚠️", "medium": "💡", "low": "ℹ️", "pass": "✅"
    }

    emoji = severity_emoji.get(review["severity"], "🔍")
    comment_lines = [
        f"## {emoji} AI Code Review",
        f"",
        f"**Summary**: {review['summary']}",
        f"",
    ]

    if review.get("issues"):
        comment_lines.append("### Issues Found\n")
        for issue in review["issues"]:
            sev_emoji = severity_emoji.get(issue["severity"], "•")
            file_ref = f"`{issue['file']}`" if issue.get("file") else ""
            line_ref = f" line {issue['line']}" if issue.get("line") else ""
            comment_lines.append(f"**{sev_emoji} {issue['severity'].upper()}** — {file_ref}{line_ref}")
            comment_lines.append(f"> {issue['description']}")
            if issue.get("suggestion"):
                comment_lines.append(f"> 💡 **Fix**: {issue['suggestion']}")
            comment_lines.append("")

    rec = review.get("overall_recommendation", "comment")
    rec_display = {"approve": "✅ Approve", "request_changes": "❌ Request Changes", "comment": "💬 Comment"}
    comment_lines.append(f"**Recommendation**: {rec_display.get(rec, rec)}")
    comment_lines.append("")
    comment_lines.append("*Generated by Claude AI — review suggestions manually before acting*")

    pr.create_issue_comment("\n".join(comment_lines))

    # Fail CI on critical issues
    if review["severity"] == "critical":
        print("Critical issues found — failing CI")
        exit(1)

if __name__ == "__main__":
    main()
```

---

## Step 4: Specialized Review Types

Beyond general review, you can add specialized checks:

```python
def security_review(code: str, language: str) -> dict:
    """Focused security-only review."""
    prompt = f"""You are a security engineer. Review this {language} code ONLY for security vulnerabilities.

Check for:
- Injection vulnerabilities (SQL, command, LDAP, XPath)
- Authentication/authorization flaws
- Sensitive data exposure
- Insecure cryptography
- Security misconfigurations
- Known vulnerable patterns

Return JSON:
{{
  "has_vulnerabilities": true/false,
  "vulnerabilities": [{{"type": "...", "severity": "critical|high|medium", "line": null, "description": "...", "cve_reference": "optional"}}],
  "recommendation": "safe_to_merge|needs_security_review|block"
}}

Code:
{code}"""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)


def performance_review(code: str, language: str) -> dict:
    """Focused performance review."""
    prompt = f"""Review this {language} code for performance issues only.

Focus on: N+1 queries, inefficient algorithms, unnecessary iterations, memory leaks, blocking I/O.

Return JSON:
{{
  "issues": [{{"description": "...", "impact": "high|medium|low", "suggestion": "..."}}],
  "overall": "no_issues|minor_issues|significant_issues"
}}

Code:
{code}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)
```

---

## Cost Management

Running Claude Opus on every commit gets expensive. A practical cost-control strategy:

```python
def choose_model_for_review(diff_size: int, is_security_sensitive: bool) -> str:
    """Choose the right model based on review requirements."""
    if is_security_sensitive or diff_size > 5000:
        return "claude-opus-4-6"  # Best quality for important reviews
    elif diff_size > 1000:
        return "claude-sonnet-4-6"  # Good balance
    else:
        return "claude-haiku-4-5-20251001"  # Fast and cheap for small changes
```

Approximate costs per review (2025 pricing):
- Claude Haiku: ~$0.001-0.005 per review
- Claude Sonnet: ~$0.01-0.05 per review
- Claude Opus: ~$0.05-0.30 per review

For a team pushing 50 PRs/month, routing most to Sonnet and flagged files to Opus costs roughly $5-20/month.

---

## Production Considerations

A few things to handle before going to production:

1. **Retry logic**: Claude API calls can occasionally fail. Add exponential backoff.
2. **Response validation**: Claude might occasionally return malformed JSON. Wrap in try/except and fall back to a comment with the raw response.
3. **Rate limiting**: Large teams pushing simultaneously may hit API rate limits. Implement a queue.
4. **Secret scanning**: Add a pre-pass to remove secrets from the diff before sending to Claude.

---

## Tools for the Code You're Reviewing

When your automated review flags issues, these DevPlaybook tools help investigate:

- [JWT Decoder](https://devplaybook.cc/tools/jwt-decoder) — inspect auth tokens from security reviews
- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — validate API response structures
- [Regex Tester](https://devplaybook.cc/tools/regex-tester) — test validation patterns flagged in review
- [Base64 Tool](https://devplaybook.cc/tools/base64) — decode encoded strings in security reviews

All run in the browser, zero setup.
