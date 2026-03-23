"""
GitHub Issues → Notion Bug Tracker Sync

Syncs GitHub issues from a repository into the Notion Bug Tracker database.
Supports bidirectional status updates, label mapping, and incremental sync.

Usage:
    pip install notion-client PyGithub
    export NOTION_TOKEN=secret_xxx
    export NOTION_BUG_TRACKER_DB_ID=abc123
    export GITHUB_TOKEN=ghp_xxx
    export GITHUB_REPO=owner/repo
    python sync-github-issues.py

Optional env vars:
    SYNC_DIRECTION=both          # "to_notion", "to_github", or "both" (default: "to_notion")
    SYNC_INTERVAL_MINUTES=0      # Set >0 to run continuously (default: 0 = run once)
    GITHUB_LABEL_FILTER=bug      # Only sync issues with this label (default: sync all)
    DRY_RUN=true                 # Preview changes without writing (default: false)
"""

import os
import sys
import time
import logging
from datetime import datetime, timezone

from notion_client import Client as NotionClient
from github import Github, GithubException

# ─── Configuration ────────────────────────────────────────────────────────────

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
BUG_TRACKER_DB_ID = os.environ.get("NOTION_BUG_TRACKER_DB_ID")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_REPO = os.environ.get("GITHUB_REPO")
SYNC_DIRECTION = os.environ.get("SYNC_DIRECTION", "to_notion")
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL_MINUTES", "0"))
LABEL_FILTER = os.environ.get("GITHUB_LABEL_FILTER", "")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

# Validate required env vars
missing = []
if not NOTION_TOKEN:
    missing.append("NOTION_TOKEN")
if not BUG_TRACKER_DB_ID:
    missing.append("NOTION_BUG_TRACKER_DB_ID")
if not GITHUB_TOKEN:
    missing.append("GITHUB_TOKEN")
if not GITHUB_REPO:
    missing.append("GITHUB_REPO")

if missing:
    print(f"Error: Missing environment variables: {', '.join(missing)}")
    print("See script header for usage instructions.")
    sys.exit(1)

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("gh-notion-sync")

# ─── Clients ─────────────────────────────────────────────────────────────────

notion = NotionClient(auth=NOTION_TOKEN)
gh = Github(GITHUB_TOKEN)
repo = gh.get_repo(GITHUB_REPO)

# ─── Label → Notion Property Mapping ─────────────────────────────────────────

SEVERITY_MAP = {
    "critical": "Critical",
    "severity:critical": "Critical",
    "p0": "Critical",
    "high": "High",
    "severity:high": "High",
    "p1": "High",
    "medium": "Medium",
    "severity:medium": "Medium",
    "p2": "Medium",
    "low": "Low",
    "severity:low": "Low",
    "p3": "Low",
}

PRIORITY_MAP = {
    "p0": "P0 - Immediate",
    "priority:p0": "P0 - Immediate",
    "urgent": "P0 - Immediate",
    "p1": "P1 - Next Sprint",
    "priority:p1": "P1 - Next Sprint",
    "p2": "P2 - Backlog",
    "priority:p2": "P2 - Backlog",
    "p3": "P3 - Nice to Have",
    "priority:p3": "P3 - Nice to Have",
}

COMPONENT_MAP = {
    "frontend": "Frontend",
    "front-end": "Frontend",
    "ui": "Frontend",
    "backend": "Backend",
    "back-end": "Backend",
    "api": "Backend",
    "database": "Database",
    "db": "Database",
    "auth": "Auth",
    "authentication": "Auth",
    "payments": "Payments",
    "billing": "Payments",
    "infra": "Infra",
    "infrastructure": "Infra",
    "devops": "DevOps",
    "ci": "DevOps",
    "cd": "DevOps",
}

STATUS_GH_TO_NOTION = {
    "open": "New",
    "closed": "Closed",
}

STATUS_NOTION_TO_GH = {
    "New": "open",
    "Triaged": "open",
    "In Progress": "open",
    "In Review": "open",
    "Resolved": "closed",
    "Closed": "closed",
    "Won't Fix": "closed",
}

TAG_MAP = {
    "bug": "regression",
    "regression": "regression",
    "flaky": "flaky-test",
    "flaky-test": "flaky-test",
    "performance": "performance",
    "perf": "performance",
    "security": "security",
    "vulnerability": "security",
    "ux": "ux",
    "usability": "ux",
    "data-loss": "data-loss",
    "accessibility": "accessibility",
    "a11y": "accessibility",
}


# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_existing_notion_issues() -> dict[int, dict]:
    """Fetch all existing issues from Notion Bug Tracker, indexed by GitHub Issue #."""
    results = {}
    has_more = True
    start_cursor = None

    while has_more:
        query_params = {
            "database_id": BUG_TRACKER_DB_ID,
            "filter": {
                "property": "GitHub Issue #",
                "number": {"is_not_empty": True},
            },
            "page_size": 100,
        }
        if start_cursor:
            query_params["start_cursor"] = start_cursor

        response = notion.databases.query(**query_params)

        for page in response["results"]:
            props = page["properties"]
            gh_num = props.get("GitHub Issue #", {}).get("number")
            if gh_num is not None:
                status_select = props.get("Status", {}).get("select")
                results[gh_num] = {
                    "page_id": page["id"],
                    "status": status_select["name"] if status_select else None,
                    "last_edited": page["last_edited_time"],
                }

        has_more = response.get("has_more", False)
        start_cursor = response.get("next_cursor")

    return results


def extract_labels(issue) -> dict:
    """Extract severity, priority, component, and tags from GitHub labels."""
    labels = [label.name.lower() for label in issue.labels]
    result = {
        "severity": None,
        "priority": None,
        "component": None,
        "tags": [],
    }

    for label in labels:
        if label in SEVERITY_MAP and result["severity"] is None:
            result["severity"] = SEVERITY_MAP[label]
        if label in PRIORITY_MAP and result["priority"] is None:
            result["priority"] = PRIORITY_MAP[label]
        if label in COMPONENT_MAP and result["component"] is None:
            result["component"] = COMPONENT_MAP[label]
        if label in TAG_MAP:
            tag = TAG_MAP[label]
            if tag not in result["tags"]:
                result["tags"].append(tag)

    return result


def build_notion_properties(issue) -> dict:
    """Build Notion page properties from a GitHub issue."""
    labels = extract_labels(issue)

    properties = {
        "Bug Title": {"title": [{"text": {"content": issue.title}}]},
        "Status": {"select": {"name": STATUS_GH_TO_NOTION.get(issue.state, "New")}},
        "GitHub Issue #": {"number": issue.number},
        "GitHub URL": {"url": issue.html_url},
        "Date Reported": {"date": {"start": issue.created_at.strftime("%Y-%m-%d")}},
    }

    if labels["severity"]:
        properties["Severity"] = {"select": {"name": labels["severity"]}}

    if labels["priority"]:
        properties["Priority"] = {"select": {"name": labels["priority"]}}

    if labels["component"]:
        properties["Component"] = {"select": {"name": labels["component"]}}

    if labels["tags"]:
        properties["Tags"] = {
            "multi_select": [{"name": tag} for tag in labels["tags"]]
        }

    # Set environment based on labels
    env_labels = []
    for label in [l.name.lower() for l in issue.labels]:
        if label in ("production", "prod"):
            env_labels.append({"name": "Production"})
        elif label in ("staging", "stage"):
            env_labels.append({"name": "Staging"})
        elif label in ("development", "dev"):
            env_labels.append({"name": "Development"})
    if env_labels:
        properties["Environment"] = {"multi_select": env_labels}

    # Add resolution date for closed issues
    if issue.state == "closed" and issue.closed_at:
        properties["Date Resolved"] = {
            "date": {"start": issue.closed_at.strftime("%Y-%m-%d")}
        }

    return properties


def build_notion_body(issue) -> list[dict]:
    """Build Notion page body content from GitHub issue body."""
    blocks = []

    if issue.body:
        # Split body into chunks of 2000 chars (Notion API limit)
        body_text = issue.body[:2000]
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"text": {"content": body_text}}],
            },
        })

    # Add metadata section
    blocks.append({
        "object": "block",
        "type": "divider",
        "divider": {},
    })
    blocks.append({
        "object": "block",
        "type": "callout",
        "callout": {
            "icon": {"type": "emoji", "emoji": "\U0001F517"},
            "rich_text": [{
                "text": {
                    "content": f"Synced from GitHub: {issue.html_url}",
                    "link": {"url": issue.html_url},
                },
            }],
        },
    })

    return blocks


# ─── Sync: GitHub → Notion ────────────────────────────────────────────────────

def sync_to_notion():
    """Sync GitHub issues into the Notion Bug Tracker."""
    log.info(f"Fetching issues from {GITHUB_REPO}...")

    # Get existing Notion entries
    existing = get_existing_notion_issues()
    log.info(f"Found {len(existing)} existing issues in Notion Bug Tracker")

    # Fetch GitHub issues
    kwargs = {"state": "all", "sort": "updated", "direction": "desc"}
    if LABEL_FILTER:
        kwargs["labels"] = [LABEL_FILTER]

    issues = repo.get_issues(**kwargs)

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for issue in issues:
        # Skip pull requests (GitHub API returns PRs as issues)
        if issue.pull_request is not None:
            continue

        issue_num = issue.number

        if issue_num in existing:
            # Update existing issue
            existing_entry = existing[issue_num]

            # Check if GitHub issue was updated more recently
            gh_updated = issue.updated_at.replace(tzinfo=timezone.utc)
            notion_updated = datetime.fromisoformat(
                existing_entry["last_edited"].replace("Z", "+00:00")
            )

            if gh_updated <= notion_updated:
                skipped_count += 1
                continue

            properties = build_notion_properties(issue)

            if DRY_RUN:
                log.info(f"[DRY RUN] Would update #{issue_num}: {issue.title}")
            else:
                notion.pages.update(
                    page_id=existing_entry["page_id"],
                    properties=properties,
                )
                log.info(f"Updated #{issue_num}: {issue.title}")

            updated_count += 1
        else:
            # Create new issue in Notion
            properties = build_notion_properties(issue)
            body_blocks = build_notion_body(issue)

            if DRY_RUN:
                log.info(f"[DRY RUN] Would create #{issue_num}: {issue.title}")
            else:
                notion.pages.create(
                    parent={"database_id": BUG_TRACKER_DB_ID},
                    properties=properties,
                    children=body_blocks,
                )
                log.info(f"Created #{issue_num}: {issue.title}")

            created_count += 1

    log.info(
        f"Sync complete: {created_count} created, {updated_count} updated, "
        f"{skipped_count} skipped"
    )


# ─── Sync: Notion → GitHub ────────────────────────────────────────────────────

def sync_to_github():
    """Sync Notion Bug Tracker status changes back to GitHub."""
    log.info("Checking Notion for status changes to sync to GitHub...")

    existing = get_existing_notion_issues()

    synced_count = 0

    for gh_num, entry in existing.items():
        notion_status = entry["status"]
        if not notion_status:
            continue

        expected_gh_state = STATUS_NOTION_TO_GH.get(notion_status)
        if not expected_gh_state:
            continue

        try:
            issue = repo.get_issue(gh_num)
        except GithubException as e:
            log.warning(f"Could not fetch GitHub issue #{gh_num}: {e}")
            continue

        if issue.state != expected_gh_state:
            if DRY_RUN:
                log.info(
                    f"[DRY RUN] Would update GitHub #{gh_num} "
                    f"state: {issue.state} → {expected_gh_state}"
                )
            else:
                issue.edit(state=expected_gh_state)
                log.info(
                    f"Updated GitHub #{gh_num} state: "
                    f"{issue.state} → {expected_gh_state}"
                )
            synced_count += 1

    log.info(f"GitHub sync complete: {synced_count} issues updated")


# ─── Main ─────────────────────────────────────────────────────────────────────

def run_sync():
    """Run one sync cycle."""
    try:
        if SYNC_DIRECTION in ("to_notion", "both"):
            sync_to_notion()

        if SYNC_DIRECTION in ("to_github", "both"):
            sync_to_github()

    except Exception as e:
        log.error(f"Sync failed: {e}", exc_info=True)


def main():
    mode_label = f"direction={SYNC_DIRECTION}"
    if DRY_RUN:
        mode_label += " [DRY RUN]"
    if LABEL_FILTER:
        mode_label += f" label_filter={LABEL_FILTER}"

    log.info(f"=== GitHub-Notion Sync ({mode_label}) ===")
    log.info(f"Repository: {GITHUB_REPO}")
    log.info(f"Notion DB: {BUG_TRACKER_DB_ID}")

    if SYNC_INTERVAL > 0:
        log.info(f"Running continuously every {SYNC_INTERVAL} minutes")
        while True:
            run_sync()
            log.info(f"Sleeping {SYNC_INTERVAL} minutes until next sync...")
            time.sleep(SYNC_INTERVAL * 60)
    else:
        run_sync()
        log.info("Single run complete.")


if __name__ == "__main__":
    main()
