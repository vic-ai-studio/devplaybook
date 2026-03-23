"""
MCP Server: Content CMS
Manage articles, categories, media, and publishing workflows for content sites.
"""

import json
import re
import uuid
from datetime import datetime
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("content-cms")

# ---------------------------------------------------------------------------
# In-memory content store
# ---------------------------------------------------------------------------

articles: dict[str, dict[str, Any]] = {}
categories: dict[str, dict[str, Any]] = {
    "technology": {"name": "Technology", "slug": "technology", "description": "Tech news and tutorials", "article_count": 0},
    "business": {"name": "Business", "slug": "business", "description": "Business strategy and growth", "article_count": 0},
    "design": {"name": "Design", "slug": "design", "description": "UI/UX and visual design", "article_count": 0},
}
media: dict[str, dict[str, Any]] = {}
tags: dict[str, int] = {}  # tag -> usage count


def _generate_id() -> str:
    return uuid.uuid4().hex[:8]


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _word_count(text: str) -> int:
    return len(text.split())


def _reading_time(text: str) -> int:
    """Estimate reading time in minutes (250 words/min)."""
    return max(1, _word_count(text) // 250)


# Seed demo content
def _seed() -> None:
    demo_articles = [
        {
            "title": "Getting Started with MCP Servers",
            "body": "Model Context Protocol (MCP) is a new standard for connecting AI assistants to external tools and data. "
                    "In this guide, we'll walk through setting up your first MCP server using Python. "
                    "MCP servers expose tools that Claude can discover and call automatically. "
                    "Each tool is a function with typed parameters and a description. "
                    "The server communicates over stdio using JSON-RPC, making it simple to deploy anywhere. " * 10,
            "category": "technology",
            "tags": "mcp,python,ai,tutorial",
            "status": "published",
            "author": "Alice Chen",
        },
        {
            "title": "10 UI Design Trends for 2025",
            "body": "Design trends evolve rapidly. This year brings several exciting changes to how we build user interfaces. "
                    "From glassmorphism to AI-generated layouts, designers have more tools than ever. "
                    "Accessibility continues to be a top priority, with WCAG 3.0 guidelines shaping decisions. " * 8,
            "category": "design",
            "tags": "design,ui,trends,2025",
            "status": "published",
            "author": "Bob Smith",
        },
        {
            "title": "SaaS Pricing Strategy Guide",
            "body": "Pricing your SaaS product correctly can make or break your business. "
                    "This guide covers value-based pricing, freemium models, and enterprise tiers. "
                    "We'll analyze case studies from successful startups and share frameworks for experimentation. " * 8,
            "category": "business",
            "tags": "saas,pricing,strategy",
            "status": "draft",
            "author": "Carol Davis",
        },
    ]
    for a in demo_articles:
        aid = _generate_id()
        tag_list = [t.strip() for t in a["tags"].split(",") if t.strip()]
        for t in tag_list:
            tags[t] = tags.get(t, 0) + 1
        articles[aid] = {
            "id": aid,
            "title": a["title"],
            "slug": _slugify(a["title"]),
            "body": a["body"],
            "excerpt": a["body"][:200] + "...",
            "category": a["category"],
            "tags": tag_list,
            "status": a["status"],
            "author": a["author"],
            "word_count": _word_count(a["body"]),
            "reading_time_min": _reading_time(a["body"]),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "published_at": datetime.now().isoformat() if a["status"] == "published" else None,
        }
        if a["category"] in categories:
            categories[a["category"]]["article_count"] += 1


_seed()


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_articles(
    status: str = "",
    category: str = "",
    tag: str = "",
    author: str = "",
    sort_by: str = "updated_at",
    limit: int = 20,
) -> str:
    """List articles with optional filters and sorting.

    Args:
        status: Filter by status: 'draft', 'published', 'archived' (optional).
        category: Filter by category slug (optional).
        tag: Filter by tag name (optional).
        author: Filter by author name (optional).
        sort_by: Sort field: 'updated_at', 'created_at', 'title', 'word_count'.
        limit: Maximum articles to return.
    """
    results = []
    for aid, a in articles.items():
        if status and a["status"] != status:
            continue
        if category and a["category"] != category:
            continue
        if tag and tag not in a["tags"]:
            continue
        if author and author.lower() not in a["author"].lower():
            continue
        results.append({
            "id": a["id"],
            "title": a["title"],
            "slug": a["slug"],
            "status": a["status"],
            "category": a["category"],
            "author": a["author"],
            "word_count": a["word_count"],
            "reading_time": f"{a['reading_time_min']} min",
            "tags": a["tags"],
            "updated_at": a["updated_at"],
            "published_at": a.get("published_at"),
        })

    if sort_by in ("updated_at", "created_at"):
        results.sort(key=lambda x: x.get(sort_by, ""), reverse=True)
    elif sort_by == "title":
        results.sort(key=lambda x: x["title"])
    elif sort_by == "word_count":
        results.sort(key=lambda x: x["word_count"], reverse=True)

    results = results[:limit]
    total_by_status = {}
    for a in articles.values():
        total_by_status[a["status"]] = total_by_status.get(a["status"], 0) + 1

    return json.dumps({
        "total": len(results),
        "status_counts": total_by_status,
        "articles": results,
    }, indent=2)


@server.tool()
async def create_article(
    title: str,
    body: str,
    category: str,
    author: str,
    article_tags: str = "",
    status: str = "draft",
    excerpt: str = "",
) -> str:
    """Create a new article.

    Args:
        title: Article title.
        body: Full article body in Markdown.
        category: Category slug (e.g. 'technology', 'business').
        author: Author name.
        article_tags: Comma-separated tags (optional).
        status: Initial status: 'draft' or 'published'.
        excerpt: Short excerpt/summary (auto-generated if empty).
    """
    if category not in categories:
        return json.dumps({"error": f"Unknown category: {category}. Valid: {list(categories.keys())}"})

    slug = _slugify(title)
    for a in articles.values():
        if a["slug"] == slug:
            slug = f"{slug}-{_generate_id()[:4]}"
            break

    tag_list = [t.strip() for t in article_tags.split(",") if t.strip()] if article_tags else []
    for t in tag_list:
        tags[t] = tags.get(t, 0) + 1

    aid = _generate_id()
    now = datetime.now().isoformat()
    articles[aid] = {
        "id": aid,
        "title": title,
        "slug": slug,
        "body": body,
        "excerpt": excerpt if excerpt else (body[:200] + "..." if len(body) > 200 else body),
        "category": category,
        "tags": tag_list,
        "status": status,
        "author": author,
        "word_count": _word_count(body),
        "reading_time_min": _reading_time(body),
        "created_at": now,
        "updated_at": now,
        "published_at": now if status == "published" else None,
    }
    categories[category]["article_count"] += 1

    return json.dumps({
        "success": True,
        "article": {
            "id": aid,
            "title": title,
            "slug": slug,
            "status": status,
            "word_count": _word_count(body),
            "reading_time": f"{_reading_time(body)} min",
            "url": f"/blog/{slug}",
        },
    }, indent=2)


@server.tool()
async def update_article(
    article_id: str,
    title: str = "",
    body: str = "",
    category: str = "",
    article_tags: str = "",
    status: str = "",
    excerpt: str = "",
) -> str:
    """Update an existing article. Only provided fields are changed.

    Args:
        article_id: Article ID to update.
        title: New title (optional).
        body: New body (optional).
        category: New category slug (optional).
        article_tags: New comma-separated tags (optional, replaces existing).
        status: New status: 'draft', 'published', 'archived' (optional).
        excerpt: New excerpt (optional).
    """
    if article_id not in articles:
        return json.dumps({"error": f"Article {article_id} not found."})

    a = articles[article_id]
    changes = []

    if title:
        a["title"] = title
        a["slug"] = _slugify(title)
        changes.append("title")
    if body:
        a["body"] = body
        a["word_count"] = _word_count(body)
        a["reading_time_min"] = _reading_time(body)
        if not excerpt:
            a["excerpt"] = body[:200] + "..." if len(body) > 200 else body
        changes.append("body")
    if excerpt:
        a["excerpt"] = excerpt
        changes.append("excerpt")
    if category:
        if category not in categories:
            return json.dumps({"error": f"Unknown category: {category}."})
        old_cat = a["category"]
        if old_cat in categories:
            categories[old_cat]["article_count"] = max(0, categories[old_cat]["article_count"] - 1)
        a["category"] = category
        categories[category]["article_count"] += 1
        changes.append("category")
    if article_tags:
        for t in a["tags"]:
            tags[t] = max(0, tags.get(t, 1) - 1)
        new_tags = [t.strip() for t in article_tags.split(",") if t.strip()]
        for t in new_tags:
            tags[t] = tags.get(t, 0) + 1
        a["tags"] = new_tags
        changes.append("tags")
    if status:
        a["status"] = status
        if status == "published" and not a.get("published_at"):
            a["published_at"] = datetime.now().isoformat()
        changes.append("status")

    a["updated_at"] = datetime.now().isoformat()

    return json.dumps({
        "success": True,
        "article_id": article_id,
        "changes": changes,
        "title": a["title"],
        "status": a["status"],
    }, indent=2)


@server.tool()
async def get_article(article_id: str) -> str:
    """Get the full content of an article.

    Args:
        article_id: Article ID to retrieve.
    """
    if article_id not in articles:
        return json.dumps({"error": f"Article {article_id} not found."})
    return json.dumps({"article": articles[article_id]}, indent=2)


@server.tool()
async def manage_categories(
    action: str,
    name: str = "",
    slug: str = "",
    description: str = "",
) -> str:
    """List, create, or update content categories.

    Args:
        action: One of: 'list', 'create', 'update'.
        name: Category display name (for create/update).
        slug: Category slug identifier (for create/update).
        description: Category description (for create/update).
    """
    if action == "list":
        return json.dumps({"categories": list(categories.values())}, indent=2)

    if action == "create":
        if not name or not slug:
            return json.dumps({"error": "Both name and slug are required."})
        if slug in categories:
            return json.dumps({"error": f"Category '{slug}' already exists."})
        categories[slug] = {
            "name": name,
            "slug": slug,
            "description": description,
            "article_count": 0,
        }
        return json.dumps({"success": True, "category": categories[slug]}, indent=2)

    if action == "update":
        if not slug or slug not in categories:
            return json.dumps({"error": f"Category '{slug}' not found."})
        if name:
            categories[slug]["name"] = name
        if description:
            categories[slug]["description"] = description
        return json.dumps({"success": True, "category": categories[slug]}, indent=2)

    return json.dumps({"error": f"Invalid action: {action}. Use: list, create, update."})


@server.tool()
async def get_content_stats() -> str:
    """Get content statistics: article counts, word counts, popular tags, and publishing activity."""
    total_words = 0
    by_status: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_author: dict[str, int] = {}

    for a in articles.values():
        total_words += a["word_count"]
        by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        by_category[a["category"]] = by_category.get(a["category"], 0) + 1
        by_author[a["author"]] = by_author.get(a["author"], 0) + 1

    top_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)[:10]

    return json.dumps({
        "total_articles": len(articles),
        "total_words": total_words,
        "avg_word_count": total_words // max(len(articles), 1),
        "total_reading_time_min": sum(a["reading_time_min"] for a in articles.values()),
        "by_status": by_status,
        "by_category": by_category,
        "by_author": by_author,
        "top_tags": [{"tag": t, "count": c} for t, c in top_tags],
        "total_categories": len(categories),
    }, indent=2)


@server.tool()
async def search_content(query: str, limit: int = 10) -> str:
    """Full-text search across article titles, bodies, and tags.

    Args:
        query: Search query.
        limit: Max results.
    """
    q = query.lower()
    results = []

    for aid, a in articles.items():
        score = 0
        if q in a["title"].lower():
            score += 10
        if q in " ".join(a["tags"]).lower():
            score += 5
        if q in a["body"].lower():
            score += 1

        if score > 0:
            # Find a context snippet
            body_lower = a["body"].lower()
            idx = body_lower.find(q)
            snippet = ""
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(a["body"]), idx + len(query) + 100)
                snippet = "..." + a["body"][start:end] + "..."

            results.append({
                "id": aid,
                "title": a["title"],
                "status": a["status"],
                "category": a["category"],
                "relevance_score": score,
                "snippet": snippet or a["excerpt"][:150],
            })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return json.dumps({"query": query, "total": len(results), "results": results[:limit]}, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
