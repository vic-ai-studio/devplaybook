"""
MCP Server: GitHub Project Manager
Manage GitHub repositories, issues, pull requests, and project boards.
Uses the GitHub REST API with a personal access token.
"""

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]

server = FastMCP("github-project-manager")

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"


def _headers() -> dict[str, str]:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


async def _request(method: str, path: str, body: dict | None = None) -> dict[str, Any]:
    """Make an authenticated request to the GitHub API."""
    if httpx is None:
        return {"error": "httpx is not installed. Run: pip install httpx"}
    if not GITHUB_TOKEN:
        return {"error": "GITHUB_TOKEN environment variable is not set."}

    url = f"{GITHUB_API}{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            if method == "GET":
                resp = await client.get(url, headers=_headers())
            elif method == "POST":
                resp = await client.post(url, headers=_headers(), json=body or {})
            elif method == "PATCH":
                resp = await client.patch(url, headers=_headers(), json=body or {})
            elif method == "DELETE":
                resp = await client.delete(url, headers=_headers())
            else:
                return {"error": f"Unsupported method: {method}"}

            if resp.status_code == 204:
                return {"success": True}
            if resp.status_code >= 400:
                return {"error": f"GitHub API error {resp.status_code}", "detail": resp.text}
            return resp.json()
        except httpx.RequestError as e:
            return {"error": f"Request failed: {str(e)}"}


def _fmt_issue(issue: dict) -> dict:
    return {
        "number": issue.get("number"),
        "title": issue.get("title"),
        "state": issue.get("state"),
        "author": issue.get("user", {}).get("login", ""),
        "labels": [l["name"] for l in issue.get("labels", [])],
        "assignees": [a["login"] for a in issue.get("assignees", [])],
        "comments": issue.get("comments", 0),
        "created_at": issue.get("created_at"),
        "updated_at": issue.get("updated_at"),
        "url": issue.get("html_url"),
    }


def _fmt_pr(pr: dict) -> dict:
    return {
        "number": pr.get("number"),
        "title": pr.get("title"),
        "state": pr.get("state"),
        "author": pr.get("user", {}).get("login", ""),
        "base": pr.get("base", {}).get("ref", ""),
        "head": pr.get("head", {}).get("ref", ""),
        "draft": pr.get("draft", False),
        "mergeable": pr.get("mergeable"),
        "additions": pr.get("additions", 0),
        "deletions": pr.get("deletions", 0),
        "changed_files": pr.get("changed_files", 0),
        "created_at": pr.get("created_at"),
        "url": pr.get("html_url"),
    }


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_repo_issues(
    owner: str,
    repo: str,
    state: str = "open",
    labels: str = "",
    sort: str = "updated",
    per_page: int = 20,
) -> str:
    """List issues for a GitHub repository.

    Args:
        owner: Repository owner (user or org).
        repo: Repository name.
        state: Filter by state: 'open', 'closed', 'all'.
        labels: Comma-separated label names to filter by.
        sort: Sort by: 'created', 'updated', 'comments'.
        per_page: Number of results (max 100).
    """
    params = f"?state={state}&sort={sort}&per_page={min(per_page, 100)}"
    if labels:
        params += f"&labels={labels}"
    result = await _request("GET", f"/repos/{owner}/{repo}/issues{params}")
    if isinstance(result, dict) and "error" in result:
        return json.dumps(result, indent=2)

    issues = [_fmt_issue(i) for i in result if "pull_request" not in i]
    return json.dumps({"total": len(issues), "issues": issues}, indent=2)


@server.tool()
async def create_issue(
    owner: str,
    repo: str,
    title: str,
    body: str = "",
    labels: str = "",
    assignees: str = "",
) -> str:
    """Create a new issue in a GitHub repository.

    Args:
        owner: Repository owner.
        repo: Repository name.
        title: Issue title.
        body: Issue body in Markdown (optional).
        labels: Comma-separated label names (optional).
        assignees: Comma-separated usernames to assign (optional).
    """
    payload: dict[str, Any] = {"title": title}
    if body:
        payload["body"] = body
    if labels:
        payload["labels"] = [l.strip() for l in labels.split(",") if l.strip()]
    if assignees:
        payload["assignees"] = [a.strip() for a in assignees.split(",") if a.strip()]

    result = await _request("POST", f"/repos/{owner}/{repo}/issues", payload)
    if "error" in result:
        return json.dumps(result, indent=2)
    return json.dumps({
        "success": True,
        "issue": _fmt_issue(result),
    }, indent=2)


@server.tool()
async def update_issue(
    owner: str,
    repo: str,
    issue_number: int,
    title: str = "",
    body: str = "",
    state: str = "",
    labels: str = "",
    assignees: str = "",
) -> str:
    """Update an existing issue (title, body, state, labels, assignees).

    Args:
        owner: Repository owner.
        repo: Repository name.
        issue_number: Issue number to update.
        title: New title (optional, leave empty to keep current).
        body: New body (optional).
        state: New state: 'open' or 'closed' (optional).
        labels: Comma-separated labels to set (optional, replaces existing).
        assignees: Comma-separated assignees to set (optional, replaces existing).
    """
    payload: dict[str, Any] = {}
    if title:
        payload["title"] = title
    if body:
        payload["body"] = body
    if state:
        payload["state"] = state
    if labels:
        payload["labels"] = [l.strip() for l in labels.split(",") if l.strip()]
    if assignees:
        payload["assignees"] = [a.strip() for a in assignees.split(",") if a.strip()]

    if not payload:
        return json.dumps({"error": "No fields to update. Provide at least one field."})

    result = await _request("PATCH", f"/repos/{owner}/{repo}/issues/{issue_number}", payload)
    if "error" in result:
        return json.dumps(result, indent=2)
    return json.dumps({"success": True, "issue": _fmt_issue(result)}, indent=2)


@server.tool()
async def list_pull_requests(
    owner: str,
    repo: str,
    state: str = "open",
    sort: str = "updated",
    per_page: int = 20,
) -> str:
    """List pull requests for a repository.

    Args:
        owner: Repository owner.
        repo: Repository name.
        state: Filter: 'open', 'closed', 'all'.
        sort: Sort by: 'created', 'updated', 'popularity'.
        per_page: Results per page (max 100).
    """
    params = f"?state={state}&sort={sort}&per_page={min(per_page, 100)}"
    result = await _request("GET", f"/repos/{owner}/{repo}/pulls{params}")
    if isinstance(result, dict) and "error" in result:
        return json.dumps(result, indent=2)

    prs = [_fmt_pr(pr) for pr in result]
    return json.dumps({"total": len(prs), "pull_requests": prs}, indent=2)


@server.tool()
async def get_repo_stats(owner: str, repo: str) -> str:
    """Get repository statistics: stars, forks, issues, languages, and recent activity.

    Args:
        owner: Repository owner.
        repo: Repository name.
    """
    repo_data = await _request("GET", f"/repos/{owner}/{repo}")
    if "error" in repo_data:
        return json.dumps(repo_data, indent=2)

    langs = await _request("GET", f"/repos/{owner}/{repo}/languages")
    contributors = await _request("GET", f"/repos/{owner}/{repo}/contributors?per_page=5")
    top_contribs = []
    if isinstance(contributors, list):
        top_contribs = [{"login": c["login"], "contributions": c["contributions"]} for c in contributors[:5]]

    total_lang_bytes = sum(langs.values()) if isinstance(langs, dict) and "error" not in langs else 1
    lang_pcts = {}
    if isinstance(langs, dict) and "error" not in langs:
        lang_pcts = {k: f"{v / total_lang_bytes * 100:.1f}%" for k, v in langs.items()}

    return json.dumps({
        "name": repo_data.get("full_name"),
        "description": repo_data.get("description"),
        "stars": repo_data.get("stargazers_count"),
        "forks": repo_data.get("forks_count"),
        "open_issues": repo_data.get("open_issues_count"),
        "watchers": repo_data.get("subscribers_count"),
        "default_branch": repo_data.get("default_branch"),
        "license": repo_data.get("license", {}).get("spdx_id") if repo_data.get("license") else None,
        "languages": lang_pcts,
        "top_contributors": top_contribs,
        "created_at": repo_data.get("created_at"),
        "updated_at": repo_data.get("updated_at"),
        "url": repo_data.get("html_url"),
    }, indent=2)


@server.tool()
async def search_issues(
    query: str,
    owner: str = "",
    repo: str = "",
    per_page: int = 20,
) -> str:
    """Search GitHub issues and pull requests across repositories.

    Args:
        query: Search query (GitHub search syntax). E.g. 'bug label:critical'.
        owner: Limit search to this owner's repos (optional).
        repo: Limit to specific repo (requires owner) (optional).
        per_page: Results per page (max 100).
    """
    q = query
    if owner and repo:
        q += f" repo:{owner}/{repo}"
    elif owner:
        q += f" user:{owner}"

    import urllib.parse
    encoded = urllib.parse.quote(q)
    result = await _request("GET", f"/search/issues?q={encoded}&per_page={min(per_page, 100)}")
    if "error" in result:
        return json.dumps(result, indent=2)

    items = [_fmt_issue(i) for i in result.get("items", [])]
    return json.dumps({
        "total_count": result.get("total_count", 0),
        "showing": len(items),
        "results": items,
    }, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
