"""
MCP Server: Analytics Dashboard
Track metrics, generate reports, analyze funnels, and monitor KPIs.
"""

import json
import random
from datetime import datetime, timedelta
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("analytics-dashboard")

# ---------------------------------------------------------------------------
# Simulated analytics data
# ---------------------------------------------------------------------------


def _generate_daily_metrics(days: int = 30) -> list[dict[str, Any]]:
    """Generate realistic daily website metrics."""
    data = []
    base_visitors = 2500
    base_signups = 45
    base_revenue = 1200.0
    now = datetime.now()

    for i in range(days, 0, -1):
        date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_of_week = (now - timedelta(days=i)).weekday()

        # Weekend dip
        weekend_factor = 0.6 if day_of_week >= 5 else 1.0
        # Growth trend
        growth = 1 + (days - i) * 0.005
        noise = random.uniform(0.85, 1.15)

        visitors = int(base_visitors * weekend_factor * growth * noise)
        page_views = int(visitors * random.uniform(2.5, 4.0))
        signups = int(base_signups * weekend_factor * growth * noise)
        revenue = round(base_revenue * weekend_factor * growth * noise, 2)
        bounce_rate = round(random.uniform(30, 55), 1)
        avg_session_sec = random.randint(90, 300)

        data.append({
            "date": date,
            "visitors": visitors,
            "page_views": page_views,
            "signups": signups,
            "revenue": revenue,
            "bounce_rate": bounce_rate,
            "avg_session_sec": avg_session_sec,
            "conversion_rate": round(signups / max(visitors, 1) * 100, 2),
        })

    return data


def _generate_traffic_sources() -> list[dict[str, Any]]:
    return [
        {"source": "Google Organic", "visitors": 12400, "percent": 38.5, "conversion_rate": 2.1},
        {"source": "Direct", "visitors": 8200, "percent": 25.5, "conversion_rate": 3.4},
        {"source": "Social Media", "visitors": 4800, "percent": 14.9, "conversion_rate": 1.2},
        {"source": "Referral", "visitors": 3600, "percent": 11.2, "conversion_rate": 2.8},
        {"source": "Email", "visitors": 2100, "percent": 6.5, "conversion_rate": 4.5},
        {"source": "Paid Search", "visitors": 1100, "percent": 3.4, "conversion_rate": 3.1},
    ]


def _generate_top_pages() -> list[dict[str, Any]]:
    return [
        {"path": "/", "title": "Homepage", "views": 15200, "avg_time_sec": 45, "bounce_rate": 42.1},
        {"path": "/pricing", "title": "Pricing", "views": 8400, "avg_time_sec": 120, "bounce_rate": 28.5},
        {"path": "/blog/getting-started", "title": "Getting Started Guide", "views": 6200, "avg_time_sec": 240, "bounce_rate": 22.0},
        {"path": "/features", "title": "Features", "views": 5100, "avg_time_sec": 90, "bounce_rate": 35.2},
        {"path": "/signup", "title": "Sign Up", "views": 4800, "avg_time_sec": 60, "bounce_rate": 55.0},
        {"path": "/blog", "title": "Blog Index", "views": 3900, "avg_time_sec": 30, "bounce_rate": 48.3},
        {"path": "/docs", "title": "Documentation", "views": 3400, "avg_time_sec": 180, "bounce_rate": 20.1},
        {"path": "/contact", "title": "Contact Us", "views": 1200, "avg_time_sec": 75, "bounce_rate": 40.5},
    ]


DAILY_DATA = _generate_daily_metrics(30)


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def get_metrics(
    period: str = "7d",
    metric: str = "",
) -> str:
    """Get website metrics for a time period.

    Args:
        period: Time period: '1d', '7d', '14d', '30d'.
        metric: Specific metric to focus on (optional): 'visitors', 'revenue', 'signups', 'conversion_rate'.
    """
    period_map = {"1d": 1, "7d": 7, "14d": 14, "30d": 30}
    days = period_map.get(period, 7)
    data = DAILY_DATA[-days:]

    if not data:
        return json.dumps({"error": "No data available for this period."})

    total_visitors = sum(d["visitors"] for d in data)
    total_pageviews = sum(d["page_views"] for d in data)
    total_signups = sum(d["signups"] for d in data)
    total_revenue = sum(d["revenue"] for d in data)
    avg_bounce = sum(d["bounce_rate"] for d in data) / len(data)
    avg_conversion = sum(d["conversion_rate"] for d in data) / len(data)
    avg_session = sum(d["avg_session_sec"] for d in data) / len(data)

    # Compare to previous period
    prev_data = DAILY_DATA[-(days * 2):-days] if len(DAILY_DATA) >= days * 2 else []
    changes: dict[str, str] = {}
    if prev_data:
        prev_visitors = sum(d["visitors"] for d in prev_data)
        prev_revenue = sum(d["revenue"] for d in prev_data)
        prev_signups = sum(d["signups"] for d in prev_data)
        changes = {
            "visitors": f"{((total_visitors - prev_visitors) / max(prev_visitors, 1) * 100):+.1f}%",
            "revenue": f"{((total_revenue - prev_revenue) / max(prev_revenue, 1) * 100):+.1f}%",
            "signups": f"{((total_signups - prev_signups) / max(prev_signups, 1) * 100):+.1f}%",
        }

    result: dict[str, Any] = {
        "period": period,
        "days": days,
        "summary": {
            "total_visitors": total_visitors,
            "total_page_views": total_pageviews,
            "total_signups": total_signups,
            "total_revenue": f"${total_revenue:,.2f}",
            "avg_bounce_rate": f"{avg_bounce:.1f}%",
            "avg_conversion_rate": f"{avg_conversion:.2f}%",
            "avg_session_duration": f"{int(avg_session)}s",
        },
        "vs_previous_period": changes,
    }

    if metric and metric in ("visitors", "revenue", "signups", "conversion_rate"):
        result["daily_breakdown"] = [{"date": d["date"], metric: d[metric]} for d in data]
    else:
        result["daily_breakdown"] = data

    return json.dumps(result, indent=2)


@server.tool()
async def get_traffic_sources() -> str:
    """Get traffic source breakdown with visitor counts and conversion rates."""
    sources = _generate_traffic_sources()
    total = sum(s["visitors"] for s in sources)
    return json.dumps({
        "total_visitors": total,
        "sources": sources,
        "top_converting": max(sources, key=lambda s: s["conversion_rate"])["source"],
        "top_volume": max(sources, key=lambda s: s["visitors"])["source"],
    }, indent=2)


@server.tool()
async def get_top_pages(limit: int = 10) -> str:
    """Get most visited pages with engagement metrics.

    Args:
        limit: Maximum number of pages to return.
    """
    pages = _generate_top_pages()[:limit]
    total_views = sum(p["views"] for p in pages)

    for p in pages:
        p["percent_of_traffic"] = round(p["views"] / max(total_views, 1) * 100, 1)

    return json.dumps({
        "total_tracked_views": total_views,
        "pages": pages,
        "best_engagement": min(pages, key=lambda p: p["bounce_rate"])["path"],
        "highest_time_on_page": max(pages, key=lambda p: p["avg_time_sec"])["path"],
    }, indent=2)


@server.tool()
async def get_funnel_analysis(funnel_name: str = "signup") -> str:
    """Analyze conversion funnel stages and drop-off points.

    Args:
        funnel_name: Funnel to analyze: 'signup', 'purchase', 'onboarding'.
    """
    funnels: dict[str, list[dict[str, Any]]] = {
        "signup": [
            {"stage": "Landing Page Visit", "users": 10000, "drop_off": 0},
            {"stage": "Pricing Page View", "users": 4200, "drop_off": 58.0},
            {"stage": "Signup Form Started", "users": 2100, "drop_off": 50.0},
            {"stage": "Email Verified", "users": 1680, "drop_off": 20.0},
            {"stage": "Profile Completed", "users": 1260, "drop_off": 25.0},
            {"stage": "First Action Taken", "users": 945, "drop_off": 25.0},
        ],
        "purchase": [
            {"stage": "Product Page View", "users": 8000, "drop_off": 0},
            {"stage": "Add to Cart", "users": 2400, "drop_off": 70.0},
            {"stage": "Begin Checkout", "users": 1440, "drop_off": 40.0},
            {"stage": "Enter Payment", "users": 1080, "drop_off": 25.0},
            {"stage": "Complete Purchase", "users": 864, "drop_off": 20.0},
        ],
        "onboarding": [
            {"stage": "Account Created", "users": 5000, "drop_off": 0},
            {"stage": "Tutorial Started", "users": 3500, "drop_off": 30.0},
            {"stage": "Tutorial Completed", "users": 2100, "drop_off": 40.0},
            {"stage": "First Project Created", "users": 1575, "drop_off": 25.0},
            {"stage": "Invited Team Member", "users": 630, "drop_off": 60.0},
            {"stage": "Active After 7 Days", "users": 473, "drop_off": 25.0},
        ],
    }

    if funnel_name not in funnels:
        return json.dumps({"error": f"Unknown funnel: {funnel_name}. Valid: {list(funnels.keys())}"})

    stages = funnels[funnel_name]
    top_users = stages[0]["users"]
    bottom_users = stages[-1]["users"]
    overall_rate = round(bottom_users / max(top_users, 1) * 100, 2)

    worst_drop = max(stages[1:], key=lambda s: s["drop_off"])

    for stage in stages:
        stage["percent_of_total"] = round(stage["users"] / max(top_users, 1) * 100, 1)

    return json.dumps({
        "funnel": funnel_name,
        "stages": stages,
        "overall_conversion_rate": f"{overall_rate}%",
        "biggest_drop_off": {
            "stage": worst_drop["stage"],
            "drop_off_percent": f"{worst_drop['drop_off']}%",
            "recommendation": f"Focus optimization efforts on the '{worst_drop['stage']}' stage.",
        },
    }, indent=2)


@server.tool()
async def get_cohort_retention(cohort_size: str = "weekly") -> str:
    """Get user retention by cohort (weekly or monthly groups).

    Args:
        cohort_size: Cohort grouping: 'weekly' or 'monthly'.
    """
    if cohort_size == "weekly":
        cohorts = []
        for w in range(8, 0, -1):
            start = (datetime.now() - timedelta(weeks=w)).strftime("%Y-%m-%d")
            initial = random.randint(200, 400)
            retention = [100.0]
            for period in range(1, min(w + 1, 8)):
                prev = retention[-1]
                drop = random.uniform(10, 25) if period <= 2 else random.uniform(3, 10)
                retention.append(round(max(prev - drop, 5), 1))
            cohorts.append({
                "cohort_start": start,
                "initial_users": initial,
                "retention_by_week": {f"week_{i}": f"{r}%" for i, r in enumerate(retention)},
            })
    else:
        cohorts = []
        for m in range(6, 0, -1):
            start = (datetime.now() - timedelta(days=m * 30)).strftime("%Y-%m")
            initial = random.randint(800, 1500)
            retention = [100.0]
            for period in range(1, min(m + 1, 6)):
                prev = retention[-1]
                drop = random.uniform(15, 30) if period <= 1 else random.uniform(5, 12)
                retention.append(round(max(prev - drop, 8), 1))
            cohorts.append({
                "cohort_month": start,
                "initial_users": initial,
                "retention_by_month": {f"month_{i}": f"{r}%" for i, r in enumerate(retention)},
            })

    return json.dumps({
        "cohort_size": cohort_size,
        "cohorts": cohorts,
        "note": "Week/month 0 is the signup period (always 100%).",
    }, indent=2)


@server.tool()
async def generate_report(
    report_type: str,
    period: str = "7d",
) -> str:
    """Generate a formatted analytics report.

    Args:
        report_type: Report type: 'executive', 'marketing', 'product'.
        period: Time period: '7d', '14d', '30d'.
    """
    period_map = {"7d": 7, "14d": 14, "30d": 30}
    days = period_map.get(period, 7)
    data = DAILY_DATA[-days:]
    prev_data = DAILY_DATA[-(days * 2):-days] if len(DAILY_DATA) >= days * 2 else []

    total = lambda key: sum(d[key] for d in data)
    prev_total = lambda key: sum(d[key] for d in prev_data) if prev_data else 0
    change = lambda key: ((total(key) - prev_total(key)) / max(prev_total(key), 1) * 100) if prev_data else 0

    if report_type == "executive":
        return json.dumps({
            "report": "Executive Summary",
            "period": period,
            "kpis": {
                "revenue": {"value": f"${total('revenue'):,.2f}", "change": f"{change('revenue'):+.1f}%"},
                "new_signups": {"value": total("signups"), "change": f"{change('signups'):+.1f}%"},
                "visitors": {"value": total("visitors"), "change": f"{change('visitors'):+.1f}%"},
                "conversion_rate": {
                    "value": f"{sum(d['conversion_rate'] for d in data) / len(data):.2f}%",
                },
            },
            "highlights": [
                f"Revenue {'increased' if change('revenue') > 0 else 'decreased'} by {abs(change('revenue')):.1f}% vs previous period",
                f"{total('signups')} new users signed up",
                f"Top traffic source: {_generate_traffic_sources()[0]['source']}",
            ],
        }, indent=2)

    elif report_type == "marketing":
        sources = _generate_traffic_sources()
        return json.dumps({
            "report": "Marketing Performance",
            "period": period,
            "traffic": {
                "total_visitors": total("visitors"),
                "change": f"{change('visitors'):+.1f}%",
                "sources": sources[:5],
            },
            "content": {
                "top_pages": _generate_top_pages()[:5],
            },
            "conversions": {
                "total_signups": total("signups"),
                "best_source": max(sources, key=lambda s: s["conversion_rate"]),
            },
        }, indent=2)

    elif report_type == "product":
        return json.dumps({
            "report": "Product Metrics",
            "period": period,
            "engagement": {
                "avg_session_duration": f"{sum(d['avg_session_sec'] for d in data) / len(data):.0f}s",
                "avg_bounce_rate": f"{sum(d['bounce_rate'] for d in data) / len(data):.1f}%",
                "pages_per_session": round(total("page_views") / max(total("visitors"), 1), 1),
            },
            "growth": {
                "new_signups": total("signups"),
                "signup_change": f"{change('signups'):+.1f}%",
            },
            "top_features": _generate_top_pages()[:5],
        }, indent=2)

    return json.dumps({"error": f"Unknown report type: {report_type}. Valid: executive, marketing, product."})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
