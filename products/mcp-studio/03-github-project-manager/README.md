# 03 — GitHub Project Manager MCP Server

Manage GitHub repositories, issues, and pull requests directly from Claude.

## Prerequisites

- `pip install httpx` (for API calls)
- Set `GITHUB_TOKEN` environment variable with a GitHub personal access token

## Tools

| Tool | Description |
|------|-------------|
| `list_repo_issues` | List and filter issues by state, labels, sort order |
| `create_issue` | Create new issues with labels and assignees |
| `update_issue` | Update title, body, state, labels, assignees |
| `list_pull_requests` | List PRs by state with diff stats |
| `get_repo_stats` | Stars, forks, languages, top contributors |
| `search_issues` | Search issues across repos with GitHub query syntax |

## Example Prompts

- "List all open bugs in my-org/my-repo"
- "Create an issue titled 'Fix login timeout' with label 'bug' and assign to john"
- "Close issue #42 in owner/repo"
- "Show me the stats for facebook/react"
- "Search for issues about memory leak in my repositories"

## Setup

```bash
pip install mcp pydantic httpx
export GITHUB_TOKEN="ghp_your_token_here"
python server.py
```
