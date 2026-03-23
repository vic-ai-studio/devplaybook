"""
Daily Standup Bot for Notion

Creates daily standup entries in a Notion database and optionally sends
reminders via webhook (Slack, Discord, or any webhook-compatible service).

Usage:
    pip install notion-client schedule requests
    export NOTION_TOKEN=secret_xxx
    export NOTION_STANDUP_DB_ID=abc123
    python daily-standup-bot.py

Optional env vars:
    STANDUP_TIME=09:00              # When to create entries (default: 09:00)
    TEAM_MEMBERS=alice,bob,carol    # Comma-separated team member names
    WEBHOOK_URL=https://hooks...    # Slack/Discord webhook for reminders
    WEBHOOK_TYPE=slack              # "slack" or "discord" (default: slack)
    TIMEZONE=America/New_York       # Timezone for scheduling (default: UTC)
    SKIP_WEEKENDS=true              # Skip Saturday/Sunday (default: true)
    RUN_ONCE=true                   # Create entries once and exit (default: false)

Features:
    - Creates a standup entry for each team member daily
    - Sends a reminder message to Slack/Discord with a link to the standup DB
    - Skips weekends (configurable)
    - Tracks who has filled in their standup and sends follow-up reminders
    - Archives old standup entries (>30 days) by marking them as archived
"""

import os
import sys
import logging
from datetime import datetime, date, timedelta

import requests
from notion_client import Client as NotionClient

# Optional: schedule for continuous running
try:
    import schedule
    HAS_SCHEDULE = True
except ImportError:
    HAS_SCHEDULE = False

# ─── Configuration ────────────────────────────────────────────────────────────

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
STANDUP_DB_ID = os.environ.get("NOTION_STANDUP_DB_ID")
STANDUP_TIME = os.environ.get("STANDUP_TIME", "09:00")
TEAM_MEMBERS = os.environ.get("TEAM_MEMBERS", "").split(",") if os.environ.get("TEAM_MEMBERS") else []
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
WEBHOOK_TYPE = os.environ.get("WEBHOOK_TYPE", "slack")
SKIP_WEEKENDS = os.environ.get("SKIP_WEEKENDS", "true").lower() == "true"
RUN_ONCE = os.environ.get("RUN_ONCE", "false").lower() == "true"

if not NOTION_TOKEN or not STANDUP_DB_ID:
    print("Error: Set NOTION_TOKEN and NOTION_STANDUP_DB_ID environment variables.")
    print("See script header for all configuration options.")
    sys.exit(1)

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("standup-bot")

# ─── Notion Client ────────────────────────────────────────────────────────────

notion = NotionClient(auth=NOTION_TOKEN)


# ─── Standup Entry Creation ───────────────────────────────────────────────────

def get_current_sprint() -> str:
    """Determine the current sprint name based on date."""
    today = date.today()
    # Simple 2-week sprint calculation starting from a known date
    sprint_start = date(2026, 3, 25)  # Sprint 25 start
    days_since = (today - sprint_start).days
    sprint_number = 25 + (days_since // 14)
    return f"Sprint {sprint_number}"


def check_existing_entries(target_date: str) -> list[str]:
    """Check which team members already have entries for today."""
    existing_names = []

    try:
        response = notion.databases.query(
            database_id=STANDUP_DB_ID,
            filter={
                "property": "Date",
                "date": {"equals": target_date},
            },
        )

        for page in response["results"]:
            title_prop = page["properties"].get("Title", {})
            title_arr = title_prop.get("title", [])
            if title_arr:
                title_text = title_arr[0].get("text", {}).get("content", "")
                # Extract name from "Standup — Name — Date" format
                parts = title_text.split(" — ")
                if len(parts) >= 2:
                    existing_names.append(parts[1])

    except Exception as e:
        log.warning(f"Error checking existing entries: {e}")

    return existing_names


def create_standup_entry(member_name: str, target_date: str) -> str:
    """Create a standup entry for one team member. Returns the page URL."""
    sprint = get_current_sprint()
    title = f"Standup — {member_name} — {target_date}"

    page = notion.pages.create(
        parent={"database_id": STANDUP_DB_ID},
        icon={"type": "emoji", "emoji": "\u2615"},
        properties={
            "Title": {"title": [{"text": {"content": title}}]},
            "Date": {"date": {"start": target_date}},
            "Mood": {"select": {"name": "Good"}},
            "Has Blockers": {"checkbox": False},
            "Sprint": {"select": {"name": sprint}},
        },
        children=[
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"text": {"content": f"Standup — {member_name}"}}],
                },
            },
            {
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": [{"text": {"content": "Yesterday"}}],
                },
            },
            {
                "object": "block",
                "type": "to_do",
                "to_do": {
                    "rich_text": [{"text": {"content": "What did you work on yesterday?"}}],
                    "checked": False,
                },
            },
            {
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": [{"text": {"content": "Today"}}],
                },
            },
            {
                "object": "block",
                "type": "to_do",
                "to_do": {
                    "rich_text": [{"text": {"content": "What will you work on today?"}}],
                    "checked": False,
                },
            },
            {
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": [{"text": {"content": "Blockers"}}],
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"text": {"content": "Any blockers or issues? (Delete this line if none)"}}],
                },
            },
            {
                "object": "block",
                "type": "divider",
                "divider": {},
            },
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "icon": {"type": "emoji", "emoji": "\U0001F4A1"},
                    "rich_text": [{
                        "text": {
                            "content": "Tips: Update your Mood, check Has Blockers if applicable, "
                                       "and fill in the Yesterday/Today/Blockers fields above.",
                        },
                    }],
                },
            },
        ],
    )

    page_id = page["id"].replace("-", "")
    page_url = f"https://notion.so/{page_id}"
    return page_url


def create_daily_entries() -> dict:
    """Create standup entries for all team members. Returns summary."""
    today_str = date.today().isoformat()

    # Check if it's a weekend
    if SKIP_WEEKENDS and date.today().weekday() >= 5:
        log.info("Skipping — it's the weekend")
        return {"skipped": True, "reason": "weekend"}

    # Check existing entries to avoid duplicates
    existing = check_existing_entries(today_str)

    if not TEAM_MEMBERS:
        log.warning("No TEAM_MEMBERS configured. Creating a single generic entry.")
        members_to_create = ["Team"]
    else:
        members_to_create = [m.strip() for m in TEAM_MEMBERS if m.strip() and m.strip() not in existing]

    if not members_to_create:
        log.info("All team members already have entries for today")
        return {"created": 0, "already_exist": len(existing)}

    created_urls = {}
    for member in members_to_create:
        try:
            url = create_standup_entry(member, today_str)
            created_urls[member] = url
            log.info(f"Created standup entry for {member}")
        except Exception as e:
            log.error(f"Failed to create entry for {member}: {e}")

    return {
        "created": len(created_urls),
        "already_exist": len(existing),
        "urls": created_urls,
    }


# ─── Webhook Notifications ───────────────────────────────────────────────────

def send_slack_reminder(summary: dict):
    """Send a standup reminder to Slack."""
    if not WEBHOOK_URL:
        return

    today_str = date.today().strftime("%A, %B %d")
    db_url = f"https://notion.so/{STANDUP_DB_ID.replace('-', '')}"

    # Build message
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Daily Standup — {today_str}",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"Good morning! Time to fill in your standup.\n\n"
                    f"*{summary.get('created', 0)}* entries created"
                ),
            },
        },
    ]

    # Add individual links
    urls = summary.get("urls", {})
    if urls:
        member_lines = "\n".join(
            f"- <{url}|{name}>" for name, url in urls.items()
        )
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Fill in your standup:*\n{member_lines}",
            },
        })

    blocks.append({
        "type": "actions",
        "elements": [{
            "type": "button",
            "text": {"type": "plain_text", "text": "Open Standup Board"},
            "url": db_url,
            "style": "primary",
        }],
    })

    payload = {"blocks": blocks}

    try:
        resp = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        resp.raise_for_status()
        log.info("Slack reminder sent")
    except requests.RequestException as e:
        log.error(f"Failed to send Slack reminder: {e}")


def send_discord_reminder(summary: dict):
    """Send a standup reminder to Discord."""
    if not WEBHOOK_URL:
        return

    today_str = date.today().strftime("%A, %B %d")
    db_url = f"https://notion.so/{STANDUP_DB_ID.replace('-', '')}"

    urls = summary.get("urls", {})
    member_lines = "\n".join(
        f"- [{name}]({url})" for name, url in urls.items()
    ) if urls else "No new entries created."

    embed = {
        "title": f"Daily Standup — {today_str}",
        "description": (
            f"Good morning! Time to fill in your standup.\n\n"
            f"**{summary.get('created', 0)}** entries created\n\n"
            f"**Fill in your standup:**\n{member_lines}\n\n"
            f"[Open Standup Board]({db_url})"
        ),
        "color": 0x2F80ED,  # Blue
        "timestamp": datetime.utcnow().isoformat(),
    }

    payload = {"embeds": [embed]}

    try:
        resp = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        resp.raise_for_status()
        log.info("Discord reminder sent")
    except requests.RequestException as e:
        log.error(f"Failed to send Discord reminder: {e}")


def send_reminder(summary: dict):
    """Send reminder via configured webhook type."""
    if not WEBHOOK_URL:
        log.info("No WEBHOOK_URL configured — skipping notification")
        return

    if summary.get("skipped"):
        return

    if WEBHOOK_TYPE == "discord":
        send_discord_reminder(summary)
    else:
        send_slack_reminder(summary)


# ─── Follow-up: Check Unfilled Standups ──────────────────────────────────────

def check_unfilled_standups() -> list[str]:
    """Check which team members haven't filled in their standup yet."""
    today_str = date.today().isoformat()
    unfilled = []

    try:
        response = notion.databases.query(
            database_id=STANDUP_DB_ID,
            filter={
                "and": [
                    {"property": "Date", "date": {"equals": today_str}},
                    {
                        "or": [
                            {"property": "Yesterday", "rich_text": {"is_empty": True}},
                            {"property": "Today", "rich_text": {"is_empty": True}},
                        ],
                    },
                ],
            },
        )

        for page in response["results"]:
            title_prop = page["properties"].get("Title", {})
            title_arr = title_prop.get("title", [])
            if title_arr:
                title_text = title_arr[0].get("text", {}).get("content", "")
                parts = title_text.split(" — ")
                if len(parts) >= 2:
                    unfilled.append(parts[1])

    except Exception as e:
        log.warning(f"Error checking unfilled standups: {e}")

    return unfilled


def send_followup_reminder():
    """Send a follow-up reminder for unfilled standups."""
    unfilled = check_unfilled_standups()

    if not unfilled:
        log.info("All standups filled in!")
        return

    log.info(f"Unfilled standups: {', '.join(unfilled)}")

    if not WEBHOOK_URL:
        return

    if WEBHOOK_TYPE == "discord":
        payload = {
            "embeds": [{
                "title": "Standup Reminder",
                "description": (
                    f"The following team members haven't filled in their standup yet:\n\n"
                    + "\n".join(f"- **{name}**" for name in unfilled)
                ),
                "color": 0xFFA500,  # Orange
            }],
        }
    else:
        payload = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            "*Standup Reminder*\n\n"
                            "The following people haven't filled in their standup yet:\n"
                            + "\n".join(f"- *{name}*" for name in unfilled)
                        ),
                    },
                },
            ],
        }

    try:
        resp = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        resp.raise_for_status()
        log.info("Follow-up reminder sent")
    except requests.RequestException as e:
        log.error(f"Failed to send follow-up: {e}")


# ─── Archive Old Entries ──────────────────────────────────────────────────────

def archive_old_entries(days: int = 30):
    """Archive standup entries older than N days."""
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    archived = 0

    try:
        response = notion.databases.query(
            database_id=STANDUP_DB_ID,
            filter={
                "property": "Date",
                "date": {"before": cutoff},
            },
            page_size= 100,
        )

        for page in response["results"]:
            if not page.get("archived", False):
                notion.pages.update(page_id=page["id"], archived=True)
                archived += 1

        if archived > 0:
            log.info(f"Archived {archived} standup entries older than {days} days")

    except Exception as e:
        log.warning(f"Error archiving old entries: {e}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def daily_job():
    """Full daily standup workflow."""
    log.info("=== Daily Standup Bot ===")
    summary = create_daily_entries()

    if not summary.get("skipped"):
        send_reminder(summary)
        # Archive entries older than 30 days
        archive_old_entries(30)

    log.info("Daily job complete")


def followup_job():
    """Follow-up reminder for unfilled standups."""
    if SKIP_WEEKENDS and date.today().weekday() >= 5:
        return
    send_followup_reminder()


def main():
    log.info(f"Standup Bot starting")
    log.info(f"  Database: {STANDUP_DB_ID}")
    log.info(f"  Team: {', '.join(TEAM_MEMBERS) if TEAM_MEMBERS else '(not configured)'}")
    log.info(f"  Standup time: {STANDUP_TIME}")
    log.info(f"  Webhook: {'configured' if WEBHOOK_URL else 'not configured'}")
    log.info(f"  Skip weekends: {SKIP_WEEKENDS}")

    if RUN_ONCE:
        log.info("Running once...")
        daily_job()
        return

    if not HAS_SCHEDULE:
        log.info("'schedule' package not installed — running once")
        log.info("Install with: pip install schedule")
        daily_job()
        return

    # Schedule the daily job
    schedule.every().day.at(STANDUP_TIME).do(daily_job)

    # Schedule follow-up 2 hours after standup time
    hour, minute = STANDUP_TIME.split(":")
    followup_hour = int(hour) + 2
    if followup_hour < 24:
        followup_time = f"{followup_hour:02d}:{minute}"
        schedule.every().day.at(followup_time).do(followup_job)
        log.info(f"Follow-up reminder scheduled at {followup_time}")

    log.info(f"Scheduler running. Standup at {STANDUP_TIME} daily.")
    log.info("Press Ctrl+C to stop.")

    # Run immediately if first time
    daily_job()

    import time
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        log.info("Standup Bot stopped.")


if __name__ == "__main__":
    main()
