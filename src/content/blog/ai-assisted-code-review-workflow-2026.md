---
title: "AI-Assisted Code Review Workflow: A Complete Guide for 2026"
description: "Learn how to build a production-ready AI-assisted code review workflow using Claude, GitHub Actions, and modern dev tools. Covers setup, prompts, integration patterns, and real-world best practices."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["code-review", "ai", "github-actions", "claude", "automation", "devops", "productivity", "ci-cd"]
readingTime: "16 min read"
---

Code review is one of the highest-leverage activities in software development — it catches bugs, spreads knowledge, and enforces standards. But manual reviews are slow, inconsistent, and expensive. In 2026, the best engineering teams augment human reviewers with AI, dramatically improving both speed and coverage.

This guide shows you how to build a complete AI-assisted code review workflow from scratch: automated checks in CI, AI-generated summaries, smart comment routing, and LLM-powered diff analysis. No vague theory — just working patterns you can ship today.

Need to test your API integrations as you build? Try our [API Request Builder](/tools/api-request-builder) to fire HTTP calls directly from the browser.

---

## Why AI Code Review Works in 2026

Three things changed to make AI code review genuinely useful rather than a toy:

1. **Long context windows.** Models like Claude can now read an entire pull request — thousands of lines of diff — in a single prompt. No chunking hacks required.
2. **Instruction following.** Modern LLMs reliably apply specific rules (e.g., "flag SQL queries without parameterization") instead of hallucinating issues.
3. **Low cost per review.** Inference costs have fallen to fractions of a cent per review, making it feasible to run AI checks on every pull request.

The right mental model: **AI is a first-pass reviewer, not a gatekeeper.** It catches obvious issues, formats consistent feedback, and frees human reviewers to focus on architecture and product logic.

---

## Architecture Overview

A complete AI-assisted code review system has four layers:

```
PR Opened / Updated
       │
       ▼
┌─────────────────────┐
│  CI Trigger Layer   │  (GitHub Actions / GitLab CI / Bitbucket Pipelines)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Diff Extraction    │  (git diff, PR API, context assembly)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  AI Review Engine   │  (Claude / GPT-4o / Gemini with structured prompts)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Comment Posting    │  (GitHub PR comments, inline annotations, Slack alerts)
└─────────────────────┘
```

Each layer is independently replaceable. You can swap GitHub Actions for GitLab CI, or switch AI providers without rewriting the diff extraction or comment logic.

---

## Setting Up the GitHub Actions Trigger

Create `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  # Optional: also run on draft PRs
  # pull_request:
  #   types: [opened, synchronize, converted_to_draft, ready_for_review]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    # Skip drafts unless explicitly marked ready
    if: github.event.pull_request.draft == false

    permissions:
      pull-requests: write
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for accurate diffs

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install anthropic PyGithub

      - name: Run AI Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_FULL_NAME: ${{ github.repository }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: python scripts/ai_review.py
```

Keep the workflow file minimal. All the logic lives in `scripts/ai_review.py` where it's testable locally.

---

## Building the Diff Extraction Layer

The quality of the AI review depends entirely on what context you feed it. A raw `git diff` is a start, but you can do better.

```python
# scripts/ai_review.py
import os
import subprocess
from github import Github
import anthropic

def get_pr_diff(base_sha: str, head_sha: str) -> str:
    """Get the PR diff, excluding binary files and lockfiles."""
    result = subprocess.run(
        [
            "git", "diff",
            f"{base_sha}...{head_sha}",
            "--",
            # Exclude common noise files
            ":(exclude)*.lock",
            ":(exclude)package-lock.json",
            ":(exclude)yarn.lock",
            ":(exclude)pnpm-lock.yaml",
            ":(exclude)*.min.js",
            ":(exclude)*.min.css",
            ":(exclude)dist/**",
            ":(exclude).next/**",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout

def truncate_diff(diff: str, max_chars: int = 80_000) -> str:
    """Truncate diff to fit within context window with a clear marker."""
    if len(diff) <= max_chars:
        return diff
    truncated = diff[:max_chars]
    # Find last complete hunk boundary
    last_hunk = truncated.rfind("\n@@")
    if last_hunk > max_chars * 0.8:
        truncated = truncated[:last_hunk]
    return truncated + "\n\n[... diff truncated for length ...]"

def get_pr_metadata(repo_name: str, pr_number: int) -> dict:
    """Fetch PR title, description, and changed files list."""
    g = Github(os.environ["GITHUB_TOKEN"])
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    files = [f.filename for f in pr.get_files()]

    return {
        "title": pr.title,
        "body": pr.body or "(no description provided)",
        "files_changed": files,
        "pr": pr,
    }
```

The key insight: **exclude lockfiles and minified assets**. These add thousands of lines to the diff but provide zero value for a code review. Filtering them improves both token efficiency and review quality.

---

## Designing the Review Prompt

The prompt is the heart of your system. A weak prompt produces generic, unhelpful feedback. A strong prompt produces specific, actionable comments.

```python
REVIEW_SYSTEM_PROMPT = """You are a senior software engineer performing a pull request review.
Your goal is to find real issues — not nitpick style or praise correct code.

Focus on:
1. **Bugs** — logic errors, off-by-one mistakes, null pointer risks, race conditions
2. **Security** — SQL injection, XSS, SSRF, hardcoded secrets, insecure deserialization
3. **Performance** — N+1 queries, unnecessary re-renders, missing indexes, unbounded loops
4. **Breaking changes** — API contract violations, removed exports, schema migrations without backwards compat

Do NOT comment on:
- Code style or formatting (that's the linter's job)
- Variable naming unless genuinely confusing
- Missing comments on self-explanatory code
- Existing code that wasn't changed in this PR

Output format: Valid JSON array. Each item has:
- "severity": "critical" | "major" | "minor"
- "file": the filename
- "line": approximate line number (integer)
- "issue": one-sentence description of the problem
- "suggestion": one-sentence fix recommendation

If the PR looks clean, return an empty array [].
"""

def build_review_prompt(metadata: dict, diff: str) -> str:
    files_list = "\n".join(f"  - {f}" for f in metadata["files_changed"][:50])

    return f"""PR Title: {metadata['title']}

PR Description:
{metadata['body'][:2000]}

Files Changed:
{files_list}

Diff:
```diff
{diff}
```

Review this PR and return a JSON array of issues found."""
```

Two critical design choices here:

1. **Explicit exclusions.** Telling the model what NOT to comment on is as important as what to focus on. Without this, you get style complaints that frustrate developers.
2. **Structured output.** Asking for JSON instead of prose makes it trivial to post inline comments, filter by severity, and integrate with dashboards.

---

## Running the AI Review

```python
def run_ai_review(metadata: dict, diff: str) -> list[dict]:
    """Send the diff to Claude and parse the structured response."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = build_review_prompt(metadata, diff)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=REVIEW_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    response_text = message.content[0].text.strip()

    # Handle markdown code blocks if model wraps response
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1])

    try:
        issues = json.loads(response_text)
        # Validate structure
        assert isinstance(issues, list)
        return issues
    except (json.JSONDecodeError, AssertionError):
        print(f"Warning: Could not parse AI response as JSON:\n{response_text}")
        return []
```

Use `claude-opus-4-6` for production reviews — it catches more subtle issues. Use `claude-haiku-4-5-20251001` for draft PRs or cost-sensitive environments.

---

## Posting Comments to GitHub

```python
def post_review_comments(pr, issues: list[dict]) -> None:
    """Post AI review issues as GitHub PR comments."""
    if not issues:
        pr.create_issue_comment(
            "## AI Review\n\n✅ No issues detected. Code looks clean!"
        )
        return

    # Group by severity
    critical = [i for i in issues if i["severity"] == "critical"]
    major = [i for i in issues if i["severity"] == "major"]
    minor = [i for i in issues if i["severity"] == "minor"]

    # Build summary comment
    summary_lines = ["## AI Code Review\n"]

    if critical:
        summary_lines.append(f"🚨 **{len(critical)} critical issue(s)** require attention before merge.\n")
    if major:
        summary_lines.append(f"⚠️ **{len(major)} major issue(s)** should be addressed.\n")
    if minor:
        summary_lines.append(f"ℹ️ **{len(minor)} minor issue(s)** (optional to fix).\n")

    summary_lines.append("\n### Issues Found\n")

    severity_icons = {"critical": "🚨", "major": "⚠️", "minor": "ℹ️"}

    for issue in sorted(issues, key=lambda x: ["critical", "major", "minor"].index(x["severity"])):
        icon = severity_icons.get(issue["severity"], "•")
        summary_lines.append(
            f"{icon} **{issue['severity'].upper()}** — `{issue['file']}` (line ~{issue['line']})\n"
            f"   **Issue:** {issue['issue']}\n"
            f"   **Fix:** {issue['suggestion']}\n"
        )

    summary_lines.append(
        "\n---\n*This review was generated by AI. Always verify with human judgment.*"
    )

    pr.create_issue_comment("\n".join(summary_lines))

    # Optionally block merge on critical issues
    if critical:
        # You can also use the Checks API to fail the status check
        print(f"::error::AI review found {len(critical)} critical issue(s)")
        exit(1)  # Fail the CI job to block merge


def main():
    import json

    pr_number = int(os.environ["PR_NUMBER"])
    repo_name = os.environ["REPO_FULL_NAME"]
    base_sha = os.environ["BASE_SHA"]
    head_sha = os.environ["HEAD_SHA"]

    print(f"Running AI review for PR #{pr_number}...")

    metadata = get_pr_metadata(repo_name, pr_number)
    diff = get_pr_diff(base_sha, head_sha)
    diff = truncate_diff(diff)

    print(f"Diff size: {len(diff)} chars")

    issues = run_ai_review(metadata, diff)

    print(f"Found {len(issues)} issue(s)")

    post_review_comments(metadata["pr"], issues)

    print("Review complete.")


if __name__ == "__main__":
    main()
```

---

## Advanced Pattern: Per-File Specialized Reviews

A single monolithic review prompt works well for most PRs. But for critical code paths, you want specialized reviewers:

```python
SPECIALIZED_REVIEWERS = {
    "sql": {
        "patterns": [r"\.sql$", r"migration", r"db\.execute", r"raw_query"],
        "system": "You are a database security expert. Focus exclusively on SQL injection, missing parameterization, and unsafe schema migrations.",
    },
    "auth": {
        "patterns": [r"auth", r"login", r"session", r"jwt", r"password", r"token"],
        "system": "You are an application security engineer. Focus on authentication flaws, session fixation, insecure token storage, and IDOR vulnerabilities.",
    },
    "react": {
        "patterns": [r"\.tsx?$", r"component", r"use[A-Z]"],
        "system": "You are a React performance expert. Focus on unnecessary re-renders, missing keys, stale closures in hooks, and memory leaks.",
    },
}

import re

def select_reviewers(files_changed: list[str], diff: str) -> list[str]:
    """Return list of specialized reviewer keys that apply to this PR."""
    content = " ".join(files_changed) + diff
    active = []
    for key, config in SPECIALIZED_REVIEWERS.items():
        if any(re.search(p, content, re.IGNORECASE) for p in config["patterns"]):
            active.append(key)
    return active
```

Run specialized reviewers in parallel using `asyncio` and the Anthropic async client to keep total latency low even when multiple reviewers apply.

---

## Integrating with PR Status Checks

Use the GitHub Checks API to surface review results directly in the PR merge box:

```python
from github import GithubIntegration

def create_check_run(repo, head_sha: str, issues: list[dict]) -> None:
    """Post a named check run with review results."""
    critical_count = sum(1 for i in issues if i["severity"] == "critical")

    conclusion = "failure" if critical_count > 0 else "success"
    title = (
        f"AI Review: {critical_count} critical issue(s)"
        if critical_count
        else "AI Review: No critical issues"
    )

    repo.create_check_run(
        name="ai-code-review",
        head_sha=head_sha,
        status="completed",
        conclusion=conclusion,
        output={
            "title": title,
            "summary": f"Found {len(issues)} total issue(s): "
                       f"{sum(1 for i in issues if i['severity'] == 'critical')} critical, "
                       f"{sum(1 for i in issues if i['severity'] == 'major')} major, "
                       f"{sum(1 for i in issues if i['severity'] == 'minor')} minor.",
        },
    )
```

With a check run in place, you can enforce "AI Review must pass" as a required status check in your branch protection rules.

---

## Handling False Positives

Every AI reviewer produces false positives. The solution is a structured suppression mechanism:

```python
# .ai-review-ignore (in repo root)
# Format: file_pattern:issue_type:reason
#
# migrations/*.py:sql_injection:Raw SQL is intentional in migration files
# tests/**:security:Test files intentionally use simplified patterns
# scripts/seed_data.py:hardcoded_secret:These are test credentials, not real secrets
```

In your review script, before posting comments:

```python
def load_ignore_rules(repo_root: str = ".") -> list[dict]:
    ignore_file = os.path.join(repo_root, ".ai-review-ignore")
    rules = []
    if not os.path.exists(ignore_file):
        return rules

    with open(ignore_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(":", 2)
            if len(parts) == 3:
                rules.append({
                    "file_pattern": parts[0],
                    "issue_type": parts[1],
                    "reason": parts[2],
                })
    return rules

def filter_issues(issues: list[dict], rules: list[dict]) -> list[dict]:
    """Remove issues that match suppression rules."""
    filtered = []
    for issue in issues:
        suppressed = False
        for rule in rules:
            if fnmatch.fnmatch(issue["file"], rule["file_pattern"]):
                suppressed = True
                break
        if not suppressed:
            filtered.append(issue)
    return filtered
```

Give developers a way to suppress false positives without disabling the whole system. Track suppression rates — high rates in a specific category signal a prompt that needs tuning.

---

## Measuring Review Quality

Run these metrics monthly to iterate on your system:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Issues caught that would have passed human review | > 5% | Manual audit of 50 closed PRs |
| False positive rate | < 20% | Developer feedback on AI comments |
| Review latency | < 3 minutes | GitHub Actions timing |
| Developer satisfaction (NPS) | > 40 | Monthly survey |
| Cost per review | < $0.10 | Anthropic usage dashboard |

The most important metric is **developer satisfaction**. If engineers start ignoring or dismissing AI comments, the system has failed regardless of what the numbers say.

---

## Common Mistakes to Avoid

**1. Reviewing too much at once.** Large PRs (500+ lines changed) produce lower-quality reviews because the model loses context. Encourage smaller PRs and flag large ones with a warning comment.

**2. Blocking on minor issues.** Only fail the CI check for `critical` severity. Blocking merges on nitpicks destroys trust in the system.

**3. No prompt versioning.** Treat your review prompts like code. Version them, test them on historical PRs, and do A/B tests when updating.

**4. Ignoring edge cases in structured output.** Models occasionally return malformed JSON, especially for complex diffs. Always wrap JSON parsing in a try/except and degrade gracefully.

**5. Running on every commit.** Trigger reviews only on `ready_for_review` events or when the PR is marked non-draft. Avoid spamming developers with partial reviews.

---

## Full Stack: Adding Slack Notifications

For critical issues, notify the PR author directly instead of just leaving a comment:

```python
import requests

def notify_slack(webhook_url: str, pr_url: str, issues: list[dict]) -> None:
    critical = [i for i in issues if i["severity"] == "critical"]
    if not critical:
        return

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"🚨 *AI Review found {len(critical)} critical issue(s)* in <{pr_url}|this PR>",
            },
        }
    ]

    for issue in critical[:3]:  # Cap at 3 to avoid noise
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"• `{issue['file']}` — {issue['issue']}\n  _Fix: {issue['suggestion']}_",
            },
        })

    requests.post(webhook_url, json={"blocks": blocks}, timeout=10)
```

---

## Putting It All Together

Here is the complete execution flow:

1. Developer opens or updates a PR
2. GitHub Actions triggers `ai-review.yml`
3. Diff is extracted and lockfiles/binaries are excluded
4. Relevant specialized reviewers are selected based on file patterns
5. Claude analyzes the diff and returns structured JSON
6. Issues are filtered against `.ai-review-ignore`
7. Summary comment is posted to the PR
8. Critical issues fail the CI check and notify Slack
9. Developer fixes issues (or suppresses false positives with justification)
10. Re-push triggers a new review run

The system takes 60–90 seconds end-to-end and costs under $0.05 per PR for typical diffs. For a team doing 50 PRs a week, that's under $130/year in AI costs.

Ready to extend this further? Combine it with our [Git Commit Message Generator](/tools/git-commit-generator) to auto-document the "what" alongside your automated "is it safe" checks.

---

## Summary

AI-assisted code review is not a replacement for human judgment — it's a multiplier. A well-configured system catches entire classes of bugs before they reach human review, lets engineers focus on architecture and product logic, and enforces standards consistently across the entire codebase.

The workflow in this guide gives you:
- **GitHub Actions integration** that triggers on every PR
- **Context-aware diff extraction** that filters noise
- **Structured prompts** for consistent, actionable output
- **Specialized reviewers** for high-risk code paths
- **Suppression mechanisms** to manage false positives
- **Metrics** to continuously improve over time

Start with the basic workflow, measure your false positive rate for two weeks, then layer in specializations where you see the most value. The ROI compounds quickly.
