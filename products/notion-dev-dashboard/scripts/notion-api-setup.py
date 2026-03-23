"""
Notion Developer Dashboard — API Setup Script (Python)

Creates all 7 databases (Bug Tracker, Sprint Board, Code Review Tracker,
Learning Log, Meeting Notes, 1:1 Tracker, Daily Standup) under a parent page
via the Notion API, then sets up relations between them.

Usage:
    pip install notion-client
    NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 python notion-api-setup.py

Requirements:
    - A Notion integration with "Insert content" and "Read content" capabilities
    - A parent page shared with the integration
"""

import os
import sys
from datetime import date

from notion_client import Client

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
PARENT_PAGE_ID = os.environ.get("NOTION_PARENT_PAGE_ID")

if not NOTION_TOKEN or not PARENT_PAGE_ID:
    print("Error: Set NOTION_TOKEN and NOTION_PARENT_PAGE_ID environment variables.")
    print("  NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 python notion-api-setup.py")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

# Store created database IDs for setting up relations
db_ids: dict[str, str] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def opt(name: str, color: str = "default") -> dict:
    return {"name": name, "color": color}


def select_prop(options: list[dict]) -> dict:
    return {"select": {"options": options}}


def multi_select_prop(options: list[dict]) -> dict:
    return {"multi_select": {"options": options}}


# ─── Database Property Definitions ────────────────────────────────────────────

def bug_tracker_properties() -> dict:
    return {
        "Bug Title": {"title": {}},
        "Status": select_prop([
            opt("New", "gray"), opt("Triaged", "blue"),
            opt("In Progress", "yellow"), opt("In Review", "purple"),
            opt("Resolved", "green"), opt("Closed", "default"),
            opt("Won't Fix", "red"),
        ]),
        "Severity": select_prop([
            opt("Critical", "red"), opt("High", "orange"),
            opt("Medium", "yellow"), opt("Low", "gray"),
        ]),
        "Priority": select_prop([
            opt("P0 - Immediate", "red"), opt("P1 - Next Sprint", "orange"),
            opt("P2 - Backlog", "yellow"), opt("P3 - Nice to Have", "gray"),
        ]),
        "Assignee": {"people": {}},
        "Reporter": {"people": {}},
        "Environment": multi_select_prop([
            opt("Production", "red"), opt("Staging", "orange"),
            opt("Development", "blue"), opt("CI/CD", "purple"),
        ]),
        "Platform": multi_select_prop([
            opt("Web", "blue"), opt("iOS", "green"),
            opt("Android", "green"), opt("API", "purple"),
            opt("Desktop", "gray"), opt("CLI", "default"),
        ]),
        "Component": select_prop([
            opt("Frontend", "blue"), opt("Backend", "purple"),
            opt("Database", "orange"), opt("Auth", "red"),
            opt("Payments", "green"), opt("Infra", "gray"),
            opt("DevOps", "default"),
        ]),
        "Reproduction Steps": {"rich_text": {}},
        "Expected Behavior": {"rich_text": {}},
        "Actual Behavior": {"rich_text": {}},
        "Root Cause": {"rich_text": {}},
        "Resolution": {"rich_text": {}},
        "Date Reported": {"date": {}},
        "Date Resolved": {"date": {}},
        "GitHub Issue #": {"number": {}},
        "GitHub URL": {"url": {}},
        "Git Branch": {"rich_text": {}},
        "Tags": multi_select_prop([
            opt("regression", "red"), opt("flaky-test", "orange"),
            opt("performance", "yellow"), opt("security", "red"),
            opt("ux", "blue"), opt("data-loss", "red"),
            opt("accessibility", "purple"),
        ]),
    }


def sprint_board_properties() -> dict:
    return {
        "Task Title": {"title": {}},
        "Status": select_prop([
            opt("Backlog", "gray"), opt("To Do", "blue"),
            opt("In Progress", "yellow"), opt("In Review", "purple"),
            opt("Done", "green"), opt("Blocked", "red"),
            opt("Cancelled", "default"),
        ]),
        "Type": select_prop([
            opt("Feature", "blue"), opt("Bug Fix", "red"),
            opt("Chore", "gray"), opt("Spike", "purple"),
            opt("Tech Debt", "orange"), opt("Documentation", "green"),
        ]),
        "Priority": select_prop([
            opt("Urgent", "red"), opt("High", "orange"),
            opt("Medium", "yellow"), opt("Low", "gray"),
        ]),
        "Story Points": select_prop([
            opt("1", "gray"), opt("2", "blue"), opt("3", "green"),
            opt("5", "yellow"), opt("8", "orange"),
            opt("13", "red"), opt("21", "red"),
        ]),
        "Sprint": select_prop([
            opt("Sprint 24 (Mar 11-22)", "blue"),
            opt("Sprint 25 (Mar 25 - Apr 5)", "green"),
            opt("Sprint 26 (Apr 7-18)", "purple"),
            opt("Backlog", "gray"),
        ]),
        "Assignee": {"people": {}},
        "Epic": select_prop([
            opt("User Auth", "red"), opt("API v2", "blue"),
            opt("Dashboard Redesign", "purple"), opt("Performance", "orange"),
            opt("Mobile App", "green"), opt("DevOps", "gray"),
            opt("Testing", "yellow"),
        ]),
        "Labels": multi_select_prop([
            opt("frontend", "blue"), opt("backend", "purple"),
            opt("database", "orange"), opt("api", "green"),
            opt("infra", "gray"), opt("mobile", "yellow"),
            opt("design", "pink"), opt("testing", "red"),
        ]),
        "Start Date": {"date": {}},
        "Due Date": {"date": {}},
        "Completed Date": {"date": {}},
        "GitHub PR": {"url": {}},
        "Branch Name": {"rich_text": {}},
        "Description": {"rich_text": {}},
        "Estimated Hours": {"number": {"format": "number"}},
        "Actual Hours": {"number": {"format": "number"}},
    }


def code_review_properties() -> dict:
    return {
        "PR Title": {"title": {}},
        "PR Number": {"number": {}},
        "Status": select_prop([
            opt("Draft", "gray"), opt("Open", "blue"),
            opt("Pending Review", "yellow"), opt("Changes Requested", "orange"),
            opt("Approved", "green"), opt("Merged", "purple"),
            opt("Closed", "red"),
        ]),
        "Author": {"people": {}},
        "Reviewers": {"people": {}},
        "Repository": select_prop([
            opt("frontend", "blue"), opt("backend", "purple"),
            opt("mobile", "green"), opt("infra", "gray"),
            opt("shared-libs", "orange"),
        ]),
        "Branch": {"rich_text": {}},
        "Target Branch": select_prop([
            opt("main", "red"), opt("develop", "blue"), opt("staging", "yellow"),
        ]),
        "PR URL": {"url": {}},
        "Type": select_prop([
            opt("Feature", "blue"), opt("Bug Fix", "red"),
            opt("Refactor", "purple"), opt("Hotfix", "orange"),
            opt("Chore", "gray"), opt("Docs", "green"),
        ]),
        "Size": select_prop([
            opt("XS (1-10 lines)", "gray"), opt("S (11-50)", "blue"),
            opt("M (51-200)", "green"), opt("L (201-500)", "yellow"),
            opt("XL (500+)", "red"),
        ]),
        "Lines Added": {"number": {}},
        "Lines Removed": {"number": {}},
        "Files Changed": {"number": {}},
        "Review Rounds": {"number": {}},
        "Date Created": {"date": {}},
        "Date First Review": {"date": {}},
        "Date Approved": {"date": {}},
        "Date Merged": {"date": {}},
        "CI Status": select_prop([
            opt("Passing", "green"), opt("Failing", "red"),
            opt("Pending", "yellow"), opt("Skipped", "gray"),
        ]),
        "Has Breaking Changes": {"checkbox": {}},
        "Has Migration": {"checkbox": {}},
        "Test Coverage": select_prop([
            opt("Increased", "green"), opt("Same", "blue"),
            opt("Decreased", "red"), opt("No Tests", "gray"),
        ]),
        "Review Notes": {"rich_text": {}},
        "Labels": multi_select_prop([
            opt("needs-design-review", "blue"),
            opt("needs-security-review", "red"),
            opt("needs-qa", "yellow"),
            opt("do-not-merge", "red"),
            opt("auto-merge", "green"),
            opt("breaking-change", "orange"),
        ]),
    }


def learning_log_properties() -> dict:
    return {
        "Title": {"title": {}},
        "Category": select_prop([
            opt("Course", "blue"), opt("Book", "green"),
            opt("Article", "yellow"), opt("Video/Talk", "purple"),
            opt("Tutorial", "orange"), opt("Podcast", "pink"),
            opt("Workshop", "red"), opt("Conference", "gray"),
            opt("Side Project", "blue"), opt("Certification", "green"),
        ]),
        "Status": select_prop([
            opt("Want to Learn", "gray"), opt("In Progress", "yellow"),
            opt("Completed", "green"), opt("Dropped", "red"),
            opt("Revisit", "blue"),
        ]),
        "Skill Area": multi_select_prop([
            opt("Frontend", "blue"), opt("Backend", "purple"),
            opt("DevOps", "orange"), opt("System Design", "red"),
            opt("Algorithms", "yellow"), opt("Databases", "green"),
            opt("Security", "red"), opt("ML/AI", "pink"),
            opt("Mobile", "blue"), opt("Leadership", "green"),
            opt("Communication", "yellow"), opt("Architecture", "purple"),
        ]),
        "Technology": multi_select_prop([
            opt("TypeScript", "blue"), opt("Python", "yellow"),
            opt("Go", "blue"), opt("Rust", "orange"),
            opt("React", "blue"), opt("Next.js", "gray"),
            opt("Node.js", "green"), opt("PostgreSQL", "blue"),
            opt("Redis", "red"), opt("Docker", "blue"),
            opt("Kubernetes", "blue"), opt("AWS", "orange"),
        ]),
        "Difficulty": select_prop([
            opt("Beginner", "green"), opt("Intermediate", "yellow"),
            opt("Advanced", "orange"), opt("Expert", "red"),
        ]),
        "Priority": select_prop([
            opt("High - Career Goal", "red"), opt("Medium - Useful", "yellow"),
            opt("Low - Interest", "blue"), opt("Someday", "gray"),
        ]),
        "Source": {"url": {}},
        "Author/Instructor": {"rich_text": {}},
        "Platform": select_prop([
            opt("Udemy", "purple"), opt("Coursera", "blue"),
            opt("Pluralsight", "orange"), opt("YouTube", "red"),
            opt("O'Reilly", "gray"), opt("Frontendmasters", "red"),
            opt("Egghead", "blue"), opt("Blog", "green"),
            opt("Book", "yellow"), opt("Conference", "purple"),
            opt("Free", "green"),
        ]),
        "Cost": {"number": {"format": "dollar"}},
        "Start Date": {"date": {}},
        "Completion Date": {"date": {}},
        "Time Invested": {"number": {"format": "number"}},
        "Rating": select_prop([
            opt("5 - Excellent", "green"), opt("4 - Great", "blue"),
            opt("3 - Good", "yellow"), opt("2 - Fair", "orange"),
            opt("1 - Poor", "red"),
        ]),
        "Key Takeaways": {"rich_text": {}},
        "Applied At Work": {"checkbox": {}},
        "Would Recommend": {"checkbox": {}},
        "Certificate URL": {"url": {}},
        "Quarter": select_prop([
            opt("2026-Q1", "blue"), opt("2026-Q2", "green"),
            opt("2026-Q3", "yellow"), opt("2026-Q4", "red"),
        ]),
    }


def meeting_notes_properties() -> dict:
    return {
        "Meeting Title": {"title": {}},
        "Meeting Type": select_prop([
            opt("Daily Standup", "blue"), opt("Sprint Planning", "green"),
            opt("Sprint Retro", "purple"), opt("Design Review", "yellow"),
            opt("Architecture Review", "orange"), opt("Incident Review", "red"),
            opt("Team Sync", "blue"), opt("All Hands", "gray"),
            opt("Demo", "green"), opt("Interview Debrief", "purple"),
            opt("Ad Hoc", "default"),
        ]),
        "Date": {"date": {}},
        "Duration": select_prop([
            opt("15 min", "gray"), opt("30 min", "blue"),
            opt("45 min", "yellow"), opt("60 min", "orange"),
            opt("90 min", "red"), opt("120 min", "red"),
        ]),
        "Attendees": {"people": {}},
        "Facilitator": {"people": {}},
        "Note Taker": {"people": {}},
        "Status": select_prop([
            opt("Scheduled", "blue"), opt("In Progress", "yellow"),
            opt("Completed", "green"), opt("Cancelled", "red"),
        ]),
        "Recording URL": {"url": {}},
        "Follow-up Date": {"date": {}},
        "Tags": multi_select_prop([
            opt("architecture", "purple"), opt("planning", "blue"),
            opt("process", "green"), opt("hiring", "yellow"),
            opt("incident", "red"), opt("performance", "orange"),
            opt("security", "red"), opt("launch", "green"),
            opt("retrospective", "purple"),
        ]),
        "Series": select_prop([
            opt("Weekly Team Sync", "blue"), opt("Daily Standup", "green"),
            opt("Bi-weekly Retro", "purple"), opt("Monthly All Hands", "yellow"),
            opt("One-off", "gray"),
        ]),
        "Decisions Made": {"number": {}},
        "Action Items Open": {"number": {}},
        "Action Items Closed": {"number": {}},
    }


def one_on_one_properties() -> dict:
    return {
        "Meeting Title": {"title": {}},
        "Date": {"date": {}},
        "Manager": {"people": {}},
        "Report": {"people": {}},
        "Mood": select_prop([
            opt("Great", "green"), opt("Good", "blue"),
            opt("Okay", "yellow"), opt("Struggling", "orange"),
            opt("Burnt Out", "red"),
        ]),
        "Status": select_prop([
            opt("Scheduled", "blue"), opt("Completed", "green"),
            opt("Cancelled", "red"), opt("Rescheduled", "yellow"),
        ]),
        "Duration": select_prop([
            opt("15 min", "gray"), opt("30 min", "blue"),
            opt("45 min", "yellow"), opt("60 min", "orange"),
        ]),
        "Meeting Cadence": select_prop([
            opt("Weekly", "green"), opt("Bi-weekly", "blue"),
            opt("Monthly", "yellow"),
        ]),
        "Topics Covered": multi_select_prop([
            opt("Project Updates", "blue"), opt("Career Growth", "green"),
            opt("Feedback", "yellow"), opt("Blockers", "red"),
            opt("Goals Review", "purple"), opt("Personal", "pink"),
            opt("Team Dynamics", "orange"), opt("Compensation", "gray"),
            opt("Performance Review", "blue"), opt("Onboarding", "green"),
            opt("PTO/Leave", "yellow"),
        ]),
        "Action Items Open": {"number": {}},
        "Action Items Closed": {"number": {}},
        "Follow-up Items": {"rich_text": {}},
        "Quarter": select_prop([
            opt("2026-Q1", "blue"), opt("2026-Q2", "green"),
            opt("2026-Q3", "yellow"), opt("2026-Q4", "red"),
        ]),
        "Next Meeting": {"date": {}},
        "Streak": {"number": {}},
    }


def daily_standup_properties() -> dict:
    return {
        "Title": {"title": {}},
        "Date": {"date": {}},
        "Person": {"people": {}},
        "Yesterday": {"rich_text": {}},
        "Today": {"rich_text": {}},
        "Blockers": {"rich_text": {}},
        "Mood": select_prop([
            opt("Great", "green"), opt("Good", "blue"),
            opt("Okay", "yellow"), opt("Struggling", "orange"),
        ]),
        "Has Blockers": {"checkbox": {}},
        "Sprint": select_prop([
            opt("Sprint 24", "blue"), opt("Sprint 25", "green"),
            opt("Sprint 26", "purple"),
        ]),
    }


# ─── Create database ─────────────────────────────────────────────────────────

def create_database(title: str, icon: str, properties: dict) -> str:
    print(f"Creating database: {title}...")

    response = notion.databases.create(
        parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
        icon={"type": "emoji", "emoji": icon},
        title=[{"type": "text", "text": {"content": title}}],
        properties=properties,
    )

    db_id = response["id"]
    print(f"  Created: {db_id}")
    return db_id


# ─── Add relations ────────────────────────────────────────────────────────────

def add_relation(db_id: str, prop_name: str, related_db_id: str, synced_name: str):
    print(f"Adding relation: {prop_name} -> {related_db_id[:8]}...")

    notion.databases.update(
        database_id=db_id,
        properties={
            prop_name: {
                "relation": {
                    "database_id": related_db_id,
                    "type": "dual_property",
                    "dual_property": {
                        "synced_property_name": synced_name,
                    },
                },
            },
        },
    )


# ─── Add sample data ─────────────────────────────────────────────────────────

def add_sample_bug(db_id: str, title: str, status: str, severity: str,
                   priority: str, component: str):
    notion.pages.create(
        parent={"database_id": db_id},
        properties={
            "Bug Title": {"title": [{"text": {"content": title}}]},
            "Status": {"select": {"name": status}},
            "Severity": {"select": {"name": severity}},
            "Priority": {"select": {"name": priority}},
            "Component": {"select": {"name": component}},
            "Date Reported": {"date": {"start": date.today().isoformat()}},
        },
    )


def add_sample_task(db_id: str, title: str, status: str, task_type: str,
                    points: str, sprint: str, epic: str):
    notion.pages.create(
        parent={"database_id": db_id},
        properties={
            "Task Title": {"title": [{"text": {"content": title}}]},
            "Status": {"select": {"name": status}},
            "Type": {"select": {"name": task_type}},
            "Story Points": {"select": {"name": points}},
            "Sprint": {"select": {"name": sprint}},
            "Epic": {"select": {"name": epic}},
        },
    )


def add_sample_pr(db_id: str, title: str, status: str, repo: str,
                  pr_type: str, size: str):
    notion.pages.create(
        parent={"database_id": db_id},
        properties={
            "PR Title": {"title": [{"text": {"content": title}}]},
            "Status": {"select": {"name": status}},
            "Repository": {"select": {"name": repo}},
            "Type": {"select": {"name": pr_type}},
            "Size": {"select": {"name": size}},
            "Date Created": {"date": {"start": date.today().isoformat()}},
        },
    )


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=== Notion Developer Dashboard Setup (Python) ===\n")

    # 1. Create all databases
    db_ids["bug_tracker"] = create_database("Bug Tracker", "\U0001F41B", bug_tracker_properties())
    db_ids["sprint_board"] = create_database("Sprint Board", "\U0001F3C3", sprint_board_properties())
    db_ids["code_review"] = create_database("Code Review Tracker", "\U0001F50D", code_review_properties())
    db_ids["learning_log"] = create_database("Learning Log", "\U0001F4DA", learning_log_properties())
    db_ids["meeting_notes"] = create_database("Meeting Notes", "\U0001F4DD", meeting_notes_properties())
    db_ids["one_on_one"] = create_database("1:1 Tracker", "\U0001F91D", one_on_one_properties())
    db_ids["standup"] = create_database("Daily Standup", "\u2615", daily_standup_properties())

    print("\n--- All databases created ---\n")

    # 2. Set up relations
    print("Setting up relations...\n")

    add_relation(db_ids["bug_tracker"], "Sprint", db_ids["sprint_board"], "Bugs")
    add_relation(db_ids["bug_tracker"], "Related PR", db_ids["code_review"], "Related Bug")
    add_relation(db_ids["sprint_board"], "Code Reviews", db_ids["code_review"], "Sprint Task")
    add_relation(db_ids["meeting_notes"], "Sprint Tasks", db_ids["sprint_board"], "Meeting Notes")

    print("--- Relations configured ---\n")

    # 3. Add sample data
    print("Adding sample data...\n")

    add_sample_bug(db_ids["bug_tracker"],
                   "Login fails with SSO on Safari 17.4",
                   "Triaged", "High", "P0 - Immediate", "Auth")
    add_sample_bug(db_ids["bug_tracker"],
                   "Dashboard charts render blank on mobile",
                   "In Progress", "Medium", "P1 - Next Sprint", "Frontend")
    add_sample_bug(db_ids["bug_tracker"],
                   "API rate limiter allows burst above 1000 req/s",
                   "New", "Critical", "P0 - Immediate", "Backend")

    add_sample_task(db_ids["sprint_board"],
                    "Implement OAuth2 PKCE flow",
                    "In Progress", "Feature", "8",
                    "Sprint 25 (Mar 25 - Apr 5)", "User Auth")
    add_sample_task(db_ids["sprint_board"],
                    "Add rate limiting to /api/v2/*",
                    "To Do", "Feature", "5",
                    "Sprint 25 (Mar 25 - Apr 5)", "API v2")
    add_sample_task(db_ids["sprint_board"],
                    "Write E2E tests for checkout flow",
                    "To Do", "Chore", "5",
                    "Sprint 25 (Mar 25 - Apr 5)", "Testing")

    add_sample_pr(db_ids["code_review"],
                  "Add OAuth2 PKCE authentication flow",
                  "Pending Review", "backend", "Feature", "L (201-500)")
    add_sample_pr(db_ids["code_review"],
                  "Fix memory leak in WS connection pool",
                  "Approved", "backend", "Bug Fix", "M (51-200)")

    print("--- Sample data added ---\n")

    # 4. Create dashboard page
    print("Creating dashboard page...\n")

    db_id_text = "\n".join(f"{k}: {v}" for k, v in db_ids.items())

    notion.pages.create(
        parent={"type": "page_id", "page_id": PARENT_PAGE_ID},
        icon={"type": "emoji", "emoji": "\U0001F4CA"},
        properties={
            "title": {"title": [{"text": {"content": "Developer Dashboard"}}]},
        },
        children=[
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{"text": {"content": "Developer Dashboard"}}],
                },
            },
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "icon": {"type": "emoji", "emoji": "\U0001F680"},
                    "rich_text": [{
                        "text": {
                            "content": "Your central engineering hub. Use the linked databases below to navigate your workflow.",
                        },
                    }],
                },
            },
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"text": {"content": "Database IDs (for API scripts)"}}],
                },
            },
            {
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"text": {"content": db_id_text}}],
                    "language": "plain text",
                },
            },
        ],
    )

    print("=== Setup Complete! ===\n")
    print("Database IDs:")
    for name, db_id in db_ids.items():
        print(f"  {name}: {db_id}")
    print("\nSave these IDs for use with sync-github-issues.py and daily-standup-bot.py")


if __name__ == "__main__":
    main()
