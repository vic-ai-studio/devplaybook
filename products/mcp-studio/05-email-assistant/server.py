"""
MCP Server: Email Assistant
Compose, search, manage, and organize emails.
Uses an in-memory store by default; connect to IMAP/SMTP for production.
"""

import json
import uuid
import re
from datetime import datetime, timedelta
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("email-assistant")

# ---------------------------------------------------------------------------
# In-memory email store (replace with IMAP/SMTP in production)
# ---------------------------------------------------------------------------

emails: dict[str, dict[str, Any]] = {}
drafts: dict[str, dict[str, Any]] = {}
labels: dict[str, list[str]] = {
    "inbox": [],
    "sent": [],
    "drafts": [],
    "starred": [],
    "archive": [],
    "trash": [],
}
contacts: dict[str, dict[str, str]] = {
    "alice@example.com": {"name": "Alice Chen", "company": "TechCorp"},
    "bob@example.com": {"name": "Bob Smith", "company": "DesignLab"},
    "carol@example.com": {"name": "Carol Davis", "company": "StartupInc"},
}


def _generate_id() -> str:
    return uuid.uuid4().hex[:10]


def _seed_emails() -> None:
    """Seed demo emails for testing."""
    now = datetime.now()
    demo = [
        {
            "from": "alice@example.com",
            "to": "me@company.com",
            "subject": "Q1 Report Review",
            "body": "Hi, please review the attached Q1 report and let me know your thoughts by Friday.\n\nBest,\nAlice",
            "date": (now - timedelta(hours=2)).isoformat(),
            "read": False,
            "starred": False,
            "label": "inbox",
        },
        {
            "from": "bob@example.com",
            "to": "me@company.com",
            "subject": "Design mockups ready",
            "body": "The new landing page mockups are ready for review. I've uploaded them to Figma.\n\nLet me know if you need any changes.\n\nBob",
            "date": (now - timedelta(hours=5)).isoformat(),
            "read": True,
            "starred": True,
            "label": "inbox",
        },
        {
            "from": "noreply@github.com",
            "to": "me@company.com",
            "subject": "[repo] New pull request: Fix memory leak #142",
            "body": "carol opened a pull request:\n\nFix memory leak in connection pool\n\nThis PR addresses the memory leak reported in issue #138.",
            "date": (now - timedelta(days=1)).isoformat(),
            "read": True,
            "starred": False,
            "label": "inbox",
        },
    ]
    for e in demo:
        eid = _generate_id()
        emails[eid] = {"id": eid, **e}
        labels["inbox"].append(eid)
        if e["starred"]:
            labels["starred"].append(eid)


_seed_emails()


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_emails(
    label: str = "inbox",
    unread_only: bool = False,
    limit: int = 20,
) -> str:
    """List emails in a folder/label.

    Args:
        label: Folder to list: 'inbox', 'sent', 'starred', 'archive', 'trash'.
        unread_only: If true, only show unread emails.
        limit: Maximum emails to return.
    """
    if label not in labels:
        return json.dumps({"error": f"Unknown label: {label}. Valid: {list(labels.keys())}"})

    email_ids = labels[label]
    results = []
    for eid in email_ids:
        if eid not in emails:
            continue
        e = emails[eid]
        if unread_only and e.get("read", True):
            continue
        results.append({
            "id": e["id"],
            "from": e["from"],
            "to": e["to"],
            "subject": e["subject"],
            "date": e["date"],
            "read": e.get("read", True),
            "starred": e.get("starred", False),
            "preview": e["body"][:100] + "..." if len(e["body"]) > 100 else e["body"],
        })

    results.sort(key=lambda x: x["date"], reverse=True)
    results = results[:limit]

    unread_count = sum(1 for eid in email_ids if eid in emails and not emails[eid].get("read", True))
    return json.dumps({
        "label": label,
        "total": len(email_ids),
        "unread": unread_count,
        "showing": len(results),
        "emails": results,
    }, indent=2)


@server.tool()
async def read_email(email_id: str) -> str:
    """Read the full content of an email and mark it as read.

    Args:
        email_id: The email ID to read.
    """
    if email_id not in emails:
        return json.dumps({"error": f"Email {email_id} not found."})

    e = emails[email_id]
    e["read"] = True

    return json.dumps({
        "id": e["id"],
        "from": e["from"],
        "to": e["to"],
        "subject": e["subject"],
        "date": e["date"],
        "body": e["body"],
        "starred": e.get("starred", False),
        "read": True,
    }, indent=2)


@server.tool()
async def compose_email(
    to: str,
    subject: str,
    body: str,
    send: bool = False,
) -> str:
    """Compose a new email. Save as draft or send immediately.

    Args:
        to: Recipient email address (comma-separated for multiple).
        subject: Email subject line.
        body: Email body text.
        send: If true, send immediately. If false, save as draft.
    """
    if not to or not subject:
        return json.dumps({"error": "Both 'to' and 'subject' are required."})

    # Validate email format
    recipients = [r.strip() for r in to.split(",")]
    for r in recipients:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", r):
            return json.dumps({"error": f"Invalid email address: {r}"})

    eid = _generate_id()
    email_obj: dict[str, Any] = {
        "id": eid,
        "from": "me@company.com",
        "to": to,
        "subject": subject,
        "body": body,
        "date": datetime.now().isoformat(),
        "read": True,
        "starred": False,
    }

    if send:
        email_obj["label"] = "sent"
        emails[eid] = email_obj
        labels["sent"].append(eid)
        return json.dumps({
            "success": True,
            "action": "sent",
            "email_id": eid,
            "to": to,
            "subject": subject,
        }, indent=2)
    else:
        email_obj["label"] = "drafts"
        drafts[eid] = email_obj
        labels["drafts"].append(eid)
        return json.dumps({
            "success": True,
            "action": "saved_as_draft",
            "draft_id": eid,
            "to": to,
            "subject": subject,
        }, indent=2)


@server.tool()
async def reply_to_email(email_id: str, body: str, send: bool = False) -> str:
    """Reply to an existing email.

    Args:
        email_id: The email ID to reply to.
        body: Reply body text.
        send: If true, send immediately. If false, save as draft.
    """
    if email_id not in emails:
        return json.dumps({"error": f"Email {email_id} not found."})

    original = emails[email_id]
    reply_to = original["from"]
    subject = original["subject"]
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    quoted = "\n".join(f"> {line}" for line in original["body"].split("\n"))
    full_body = f"{body}\n\nOn {original['date']}, {original['from']} wrote:\n{quoted}"

    eid = _generate_id()
    email_obj: dict[str, Any] = {
        "id": eid,
        "from": "me@company.com",
        "to": reply_to,
        "subject": subject,
        "body": full_body,
        "date": datetime.now().isoformat(),
        "read": True,
        "starred": False,
        "in_reply_to": email_id,
    }

    if send:
        email_obj["label"] = "sent"
        emails[eid] = email_obj
        labels["sent"].append(eid)
        action = "sent"
    else:
        email_obj["label"] = "drafts"
        drafts[eid] = email_obj
        labels["drafts"].append(eid)
        action = "saved_as_draft"

    return json.dumps({
        "success": True,
        "action": action,
        "email_id": eid,
        "to": reply_to,
        "subject": subject,
    }, indent=2)


@server.tool()
async def search_emails(
    query: str,
    from_addr: str = "",
    date_after: str = "",
    date_before: str = "",
    starred_only: bool = False,
) -> str:
    """Search emails by content, sender, or date range.

    Args:
        query: Search term to match in subject or body.
        from_addr: Filter by sender email (optional).
        date_after: Only emails after this date YYYY-MM-DD (optional).
        date_before: Only emails before this date YYYY-MM-DD (optional).
        starred_only: Only return starred emails.
    """
    results = []
    q = query.lower()

    for eid, e in emails.items():
        if starred_only and not e.get("starred", False):
            continue
        if from_addr and e["from"].lower() != from_addr.lower():
            continue
        if date_after:
            if e["date"][:10] < date_after:
                continue
        if date_before:
            if e["date"][:10] > date_before:
                continue
        if q:
            text = f"{e['subject']} {e['body']}".lower()
            if q not in text:
                continue
        results.append({
            "id": eid,
            "from": e["from"],
            "subject": e["subject"],
            "date": e["date"],
            "read": e.get("read", True),
            "starred": e.get("starred", False),
            "match_preview": e["body"][:120],
        })

    results.sort(key=lambda x: x["date"], reverse=True)
    return json.dumps({"query": query, "total": len(results), "results": results}, indent=2)


@server.tool()
async def manage_email(
    email_id: str,
    action: str,
) -> str:
    """Perform an action on an email: star, unstar, archive, trash, mark_read, mark_unread.

    Args:
        email_id: The email ID.
        action: One of: 'star', 'unstar', 'archive', 'trash', 'mark_read', 'mark_unread'.
    """
    if email_id not in emails:
        return json.dumps({"error": f"Email {email_id} not found."})

    e = emails[email_id]
    valid_actions = ["star", "unstar", "archive", "trash", "mark_read", "mark_unread"]
    if action not in valid_actions:
        return json.dumps({"error": f"Invalid action. Valid: {valid_actions}"})

    if action == "star":
        e["starred"] = True
        if email_id not in labels["starred"]:
            labels["starred"].append(email_id)
    elif action == "unstar":
        e["starred"] = False
        if email_id in labels["starred"]:
            labels["starred"].remove(email_id)
    elif action == "archive":
        for lbl in ["inbox"]:
            if email_id in labels[lbl]:
                labels[lbl].remove(email_id)
        if email_id not in labels["archive"]:
            labels["archive"].append(email_id)
    elif action == "trash":
        for lbl in ["inbox", "archive"]:
            if email_id in labels[lbl]:
                labels[lbl].remove(email_id)
        if email_id not in labels["trash"]:
            labels["trash"].append(email_id)
    elif action == "mark_read":
        e["read"] = True
    elif action == "mark_unread":
        e["read"] = False

    return json.dumps({
        "success": True,
        "email_id": email_id,
        "action": action,
        "subject": e["subject"],
    }, indent=2)


@server.tool()
async def get_email_stats() -> str:
    """Get email statistics: unread count, emails per folder, recent activity."""
    stats: dict[str, Any] = {"folders": {}}
    total_unread = 0

    for lbl, ids in labels.items():
        valid_ids = [eid for eid in ids if eid in emails]
        unread = sum(1 for eid in valid_ids if not emails[eid].get("read", True))
        total_unread += unread
        stats["folders"][lbl] = {"total": len(valid_ids), "unread": unread}

    stats["total_emails"] = len(emails)
    stats["total_drafts"] = len(drafts)
    stats["total_unread"] = total_unread
    stats["contacts"] = len(contacts)

    # Recent activity (last 24h)
    cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
    recent = [e for e in emails.values() if e["date"] > cutoff]
    stats["last_24h"] = {
        "received": len([e for e in recent if e["from"] != "me@company.com"]),
        "sent": len([e for e in recent if e["from"] == "me@company.com"]),
    }

    return json.dumps(stats, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
