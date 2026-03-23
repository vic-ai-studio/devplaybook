"""
MCP Server: Customer Support
Manage support tickets, knowledge base, SLA tracking, and customer interactions.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("customer-support")

# ---------------------------------------------------------------------------
# In-memory data store
# ---------------------------------------------------------------------------

tickets: dict[str, dict[str, Any]] = {}
kb_articles: dict[str, dict[str, Any]] = {}
customers: dict[str, dict[str, Any]] = {}
canned_responses: dict[str, dict[str, str]] = {
    "greeting": {
        "name": "Greeting",
        "text": "Hi {customer_name}, thank you for reaching out! I'd be happy to help you with this.",
    },
    "escalation": {
        "name": "Escalation Notice",
        "text": "I'm escalating this to our senior support team for further investigation. You'll hear back within 2 hours.",
    },
    "resolved": {
        "name": "Resolution",
        "text": "Great news! This issue has been resolved. Please let us know if you experience any further problems.",
    },
    "follow-up": {
        "name": "Follow Up",
        "text": "Hi {customer_name}, I'm following up on your ticket #{ticket_id}. Has your issue been resolved?",
    },
}

# SLA definitions (in hours)
SLA_TARGETS = {
    "critical": {"first_response": 1, "resolution": 4},
    "high": {"first_response": 4, "resolution": 24},
    "medium": {"first_response": 8, "resolution": 48},
    "low": {"first_response": 24, "resolution": 72},
}


def _generate_id(prefix: str = "TKT") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


def _sla_status(ticket: dict[str, Any]) -> dict[str, Any]:
    """Calculate SLA compliance for a ticket."""
    priority = ticket.get("priority", "medium")
    targets = SLA_TARGETS.get(priority, SLA_TARGETS["medium"])
    created = datetime.fromisoformat(ticket["created_at"])
    now = datetime.now()
    elapsed_hours = (now - created).total_seconds() / 3600

    first_response_target = targets["first_response"]
    resolution_target = targets["resolution"]

    first_responded = ticket.get("first_response_at")
    resolved_at = ticket.get("resolved_at")

    fr_elapsed = None
    if first_responded:
        fr_elapsed = (datetime.fromisoformat(first_responded) - created).total_seconds() / 3600

    return {
        "priority": priority,
        "first_response": {
            "target_hours": first_response_target,
            "actual_hours": round(fr_elapsed, 1) if fr_elapsed else None,
            "met": fr_elapsed <= first_response_target if fr_elapsed else None,
            "breached": elapsed_hours > first_response_target and not first_responded,
            "remaining_hours": round(max(0, first_response_target - elapsed_hours), 1) if not first_responded else None,
        },
        "resolution": {
            "target_hours": resolution_target,
            "elapsed_hours": round(elapsed_hours, 1),
            "met": resolved_at is not None and elapsed_hours <= resolution_target,
            "breached": elapsed_hours > resolution_target and not resolved_at,
            "remaining_hours": round(max(0, resolution_target - elapsed_hours), 1) if not resolved_at else None,
        },
    }


def _seed() -> None:
    """Seed demo data."""
    now = datetime.now()
    demo_tickets = [
        {
            "subject": "Cannot login after password reset",
            "description": "I reset my password yesterday and now I'm getting 'Invalid credentials' every time I try to log in. I've tried multiple browsers.",
            "customer_email": "sarah@acme.com",
            "customer_name": "Sarah Johnson",
            "priority": "high",
            "category": "authentication",
            "status": "open",
            "created_at": (now - timedelta(hours=3)).isoformat(),
        },
        {
            "subject": "Billing shows wrong amount",
            "description": "My invoice for March shows $299 but I'm on the $199/month plan. I've been on this plan since January.",
            "customer_email": "mike@startup.io",
            "customer_name": "Mike Chen",
            "priority": "medium",
            "category": "billing",
            "status": "in_progress",
            "created_at": (now - timedelta(hours=12)).isoformat(),
            "first_response_at": (now - timedelta(hours=10)).isoformat(),
            "assigned_to": "support-agent-1",
        },
        {
            "subject": "API rate limit too low",
            "description": "We're hitting the 100 req/min rate limit during peak hours. Our enterprise plan should have 1000 req/min.",
            "customer_email": "devops@bigcorp.com",
            "customer_name": "BigCorp DevOps",
            "priority": "critical",
            "category": "api",
            "status": "open",
            "created_at": (now - timedelta(hours=1)).isoformat(),
        },
    ]

    for t in demo_tickets:
        tid = _generate_id()
        tickets[tid] = {"id": tid, "messages": [], **t}
        customers[t["customer_email"]] = {
            "name": t["customer_name"],
            "email": t["customer_email"],
            "ticket_count": 1,
            "first_contact": t["created_at"],
        }

    # Seed knowledge base
    kb = [
        {"title": "How to Reset Your Password", "category": "authentication",
         "content": "Go to Settings > Security > Reset Password. Enter your current password and choose a new one. If you can't log in, use the 'Forgot Password' link on the login page."},
        {"title": "Understanding Your Invoice", "category": "billing",
         "content": "Invoices are generated on the 1st of each month. They include your base plan cost plus any overages. Pro-rated changes appear as separate line items."},
        {"title": "API Rate Limits by Plan", "category": "api",
         "content": "Free: 10 req/min. Starter: 100 req/min. Pro: 500 req/min. Enterprise: 1000 req/min. Contact support if you need higher limits."},
        {"title": "Two-Factor Authentication Setup", "category": "authentication",
         "content": "Enable 2FA in Settings > Security. We support authenticator apps (TOTP) and SMS. Authenticator apps are recommended for better security."},
    ]
    for article in kb:
        kid = _generate_id("KB")
        kb_articles[kid] = {
            "id": kid,
            "title": article["title"],
            "category": article["category"],
            "content": article["content"],
            "helpful_votes": 0,
            "views": 0,
            "created_at": now.isoformat(),
        }


_seed()


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_tickets(
    status: str = "",
    priority: str = "",
    category: str = "",
    assigned_to: str = "",
    sort_by: str = "created_at",
    limit: int = 20,
) -> str:
    """List support tickets with optional filters.

    Args:
        status: Filter: 'open', 'in_progress', 'waiting', 'resolved', 'closed'.
        priority: Filter: 'critical', 'high', 'medium', 'low'.
        category: Filter by category (e.g. 'billing', 'authentication', 'api').
        assigned_to: Filter by agent assigned.
        sort_by: Sort: 'created_at', 'priority', 'status'.
        limit: Max results.
    """
    results = []
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    for tid, t in tickets.items():
        if status and t["status"] != status:
            continue
        if priority and t.get("priority") != priority:
            continue
        if category and t.get("category") != category:
            continue
        if assigned_to and t.get("assigned_to") != assigned_to:
            continue

        sla = _sla_status(t)
        results.append({
            "id": t["id"],
            "subject": t["subject"],
            "customer": t["customer_name"],
            "priority": t.get("priority", "medium"),
            "status": t["status"],
            "category": t.get("category", "general"),
            "assigned_to": t.get("assigned_to"),
            "sla_breached": sla["first_response"]["breached"] or sla["resolution"]["breached"],
            "created_at": t["created_at"],
            "message_count": len(t.get("messages", [])),
        })

    if sort_by == "priority":
        results.sort(key=lambda x: priority_order.get(x["priority"], 2))
    else:
        results.sort(key=lambda x: x.get(sort_by, ""), reverse=True)

    breached_count = sum(1 for r in results if r.get("sla_breached"))
    return json.dumps({
        "total": len(results),
        "sla_breached": breached_count,
        "tickets": results[:limit],
    }, indent=2)


@server.tool()
async def get_ticket(ticket_id: str) -> str:
    """Get full ticket details including messages, SLA status, and customer history.

    Args:
        ticket_id: Ticket ID to retrieve.
    """
    if ticket_id not in tickets:
        return json.dumps({"error": f"Ticket {ticket_id} not found."})

    t = tickets[ticket_id]
    sla = _sla_status(t)
    customer = customers.get(t["customer_email"], {})

    return json.dumps({
        "ticket": t,
        "sla": sla,
        "customer": customer,
    }, indent=2)


@server.tool()
async def create_ticket(
    subject: str,
    description: str,
    customer_email: str,
    customer_name: str,
    priority: str = "medium",
    category: str = "general",
) -> str:
    """Create a new support ticket.

    Args:
        subject: Ticket subject line.
        description: Detailed description of the issue.
        customer_email: Customer email address.
        customer_name: Customer display name.
        priority: Priority: 'critical', 'high', 'medium', 'low'.
        category: Category: 'billing', 'authentication', 'api', 'bug', 'feature', 'general'.
    """
    if priority not in SLA_TARGETS:
        return json.dumps({"error": f"Invalid priority. Valid: {list(SLA_TARGETS.keys())}"})

    tid = _generate_id()
    now = datetime.now().isoformat()
    tickets[tid] = {
        "id": tid,
        "subject": subject,
        "description": description,
        "customer_email": customer_email,
        "customer_name": customer_name,
        "priority": priority,
        "category": category,
        "status": "open",
        "created_at": now,
        "messages": [],
    }

    if customer_email not in customers:
        customers[customer_email] = {
            "name": customer_name,
            "email": customer_email,
            "ticket_count": 0,
            "first_contact": now,
        }
    customers[customer_email]["ticket_count"] += 1

    sla = SLA_TARGETS[priority]
    return json.dumps({
        "success": True,
        "ticket_id": tid,
        "subject": subject,
        "priority": priority,
        "sla": {
            "first_response_target": f"{sla['first_response']}h",
            "resolution_target": f"{sla['resolution']}h",
        },
    }, indent=2)


@server.tool()
async def reply_to_ticket(
    ticket_id: str,
    message: str,
    internal_note: bool = False,
    status: str = "",
) -> str:
    """Add a reply or internal note to a ticket.

    Args:
        ticket_id: Ticket ID.
        message: Reply text.
        internal_note: If true, this is an internal note (not visible to customer).
        status: Optionally update status: 'in_progress', 'waiting', 'resolved', 'closed'.
    """
    if ticket_id not in tickets:
        return json.dumps({"error": f"Ticket {ticket_id} not found."})

    t = tickets[ticket_id]
    now = datetime.now().isoformat()

    msg = {
        "from": "support-agent",
        "message": message,
        "internal": internal_note,
        "timestamp": now,
    }
    t["messages"].append(msg)

    if not t.get("first_response_at") and not internal_note:
        t["first_response_at"] = now

    if status:
        t["status"] = status
        if status == "resolved":
            t["resolved_at"] = now

    return json.dumps({
        "success": True,
        "ticket_id": ticket_id,
        "message_type": "internal_note" if internal_note else "customer_reply",
        "status": t["status"],
        "total_messages": len(t["messages"]),
    }, indent=2)


@server.tool()
async def search_knowledge_base(query: str, category: str = "") -> str:
    """Search the knowledge base for relevant articles.

    Args:
        query: Search query.
        category: Filter by category (optional).
    """
    q = query.lower()
    results = []

    for kid, article in kb_articles.items():
        if category and article["category"] != category:
            continue
        score = 0
        if q in article["title"].lower():
            score += 10
        if q in article["content"].lower():
            score += 3
        if q in article["category"].lower():
            score += 1

        if score > 0:
            article["views"] += 1
            results.append({
                "id": kid,
                "title": article["title"],
                "category": article["category"],
                "relevance_score": score,
                "excerpt": article["content"][:200],
                "helpful_votes": article["helpful_votes"],
            })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return json.dumps({"query": query, "total": len(results), "articles": results}, indent=2)


@server.tool()
async def get_support_stats() -> str:
    """Get support team statistics: open tickets, SLA compliance, response times, categories."""
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    by_category: dict[str, int] = {}
    sla_breached = 0
    total_response_time = 0.0
    response_count = 0

    for t in tickets.values():
        by_status[t["status"]] = by_status.get(t["status"], 0) + 1
        by_priority[t.get("priority", "medium")] = by_priority.get(t.get("priority", "medium"), 0) + 1
        by_category[t.get("category", "general")] = by_category.get(t.get("category", "general"), 0) + 1

        sla = _sla_status(t)
        if sla["first_response"]["breached"] or sla["resolution"]["breached"]:
            sla_breached += 1

        if t.get("first_response_at"):
            created = datetime.fromisoformat(t["created_at"])
            responded = datetime.fromisoformat(t["first_response_at"])
            total_response_time += (responded - created).total_seconds() / 3600
            response_count += 1

    avg_response = round(total_response_time / max(response_count, 1), 1)
    total = len(tickets)
    sla_compliance = round((total - sla_breached) / max(total, 1) * 100, 1)

    return json.dumps({
        "total_tickets": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_category": by_category,
        "sla": {
            "compliance_rate": f"{sla_compliance}%",
            "breached_tickets": sla_breached,
            "avg_first_response_hours": avg_response,
        },
        "knowledge_base": {
            "total_articles": len(kb_articles),
        },
        "customers": {
            "total": len(customers),
        },
    }, indent=2)


@server.tool()
async def manage_kb_article(
    action: str,
    article_id: str = "",
    title: str = "",
    content: str = "",
    category: str = "general",
) -> str:
    """Create, update, or manage knowledge base articles.

    Args:
        action: One of: 'create', 'update', 'delete', 'list'.
        article_id: Required for update/delete.
        title: Article title (for create/update).
        content: Article content (for create/update).
        category: Article category (for create).
    """
    if action == "list":
        articles_list = []
        for kid, a in kb_articles.items():
            articles_list.append({
                "id": kid,
                "title": a["title"],
                "category": a["category"],
                "views": a["views"],
                "helpful_votes": a["helpful_votes"],
            })
        return json.dumps({"total": len(articles_list), "articles": articles_list}, indent=2)

    if action == "create":
        if not title or not content:
            return json.dumps({"error": "Both title and content are required."})
        kid = _generate_id("KB")
        kb_articles[kid] = {
            "id": kid,
            "title": title,
            "category": category,
            "content": content,
            "helpful_votes": 0,
            "views": 0,
            "created_at": datetime.now().isoformat(),
        }
        return json.dumps({"success": True, "article_id": kid, "title": title}, indent=2)

    if action == "update":
        if not article_id or article_id not in kb_articles:
            return json.dumps({"error": f"Article {article_id} not found."})
        if title:
            kb_articles[article_id]["title"] = title
        if content:
            kb_articles[article_id]["content"] = content
        return json.dumps({"success": True, "article_id": article_id}, indent=2)

    if action == "delete":
        if not article_id or article_id not in kb_articles:
            return json.dumps({"error": f"Article {article_id} not found."})
        del kb_articles[article_id]
        return json.dumps({"success": True, "deleted": article_id}, indent=2)

    return json.dumps({"error": f"Invalid action: {action}. Valid: create, update, delete, list."})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
