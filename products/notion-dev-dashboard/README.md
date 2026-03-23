# Notion Developer Dashboard Template

**Price: $9** | **Format: Notion Template + Markdown + API Scripts**

## What You Get

A complete, production-ready Notion workspace designed specifically for software developers and engineering teams. Stop wasting time building your own project management system — duplicate this template and start shipping code.

### 7 Interconnected Templates

| Template | Description |
|----------|-------------|
| **Developer Dashboard** | Central hub linking all databases, with quick-access views and weekly metrics |
| **Bug Tracker** | Full bug tracking with severity, priority, assignee, environment, and resolution tracking |
| **Sprint Board** | Kanban + timeline views for sprint planning with story points and velocity tracking |
| **Code Review Tracker** | Track PRs, review status, feedback rounds, and approval workflows |
| **Learning Log** | Personal developer growth tracker for courses, books, talks, and skills |
| **Meeting Notes** | Engineering meeting templates with action items, decisions, and follow-ups |
| **1:1 Tracker** | Structured 1:1 meeting notes with talking points, feedback, and career goals |

### 3 Automation Scripts

| Script | Description |
|--------|-------------|
| **notion-api-setup.js** | Node.js script to create all databases via Notion API |
| **notion-api-setup.py** | Python version of the same setup script |
| **sync-github-issues.py** | Sync GitHub issues bidirectionally to the Notion bug tracker |
| **daily-standup-bot.py** | Automated daily standup reminders posted to a Notion database |

## Screenshots

> [Screenshot: Dashboard overview with linked databases] — *dashboard-overview.png*

> [Screenshot: Sprint board in Kanban view] — *sprint-kanban.png*

> [Screenshot: Bug tracker with filters applied] — *bug-tracker-filtered.png*

> [Screenshot: Code review tracker board] — *code-review-board.png*

## Quick Start

### Option 1: Duplicate the Notion Template

1. Open the template link: `[NOTION_TEMPLATE_LINK_PLACEHOLDER]`
2. Click **Duplicate** in the top-right corner
3. The entire workspace (all 7 databases + relations) will be copied to your Notion

### Option 2: Create via API (Programmatic Setup)

1. Create a [Notion Integration](https://www.notion.so/my-integrations)
2. Copy your integration token
3. Share a parent page with your integration

**Node.js:**
```bash
cd scripts
npm install @notionhq/client
NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 node notion-api-setup.js
```

**Python:**
```bash
cd scripts
pip install notion-client
NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 python notion-api-setup.py
```

### Option 3: Import Markdown

Each template in `templates/` is a standalone Markdown file. You can import them directly into Notion:

1. Open Notion
2. Click **Import** in the sidebar
3. Select **Markdown & CSV**
4. Choose any `.md` file from the `templates/` folder

## GitHub Issues Sync

Automatically sync your GitHub issues into the Notion Bug Tracker:

```bash
pip install notion-client PyGithub
export NOTION_TOKEN=secret_xxx
export NOTION_BUG_TRACKER_DB_ID=abc123
export GITHUB_TOKEN=ghp_xxx
export GITHUB_REPO=owner/repo

python scripts/sync-github-issues.py
```

Run it on a cron schedule for continuous sync:
```
# Every 15 minutes
*/15 * * * * cd /path/to/scripts && python sync-github-issues.py >> sync.log 2>&1
```

## Daily Standup Bot

Automatically create daily standup entries and remind your team:

```bash
pip install notion-client schedule
export NOTION_TOKEN=secret_xxx
export NOTION_STANDUP_DB_ID=abc123

python scripts/daily-standup-bot.py
```

## Database Relations Map

```
Developer Dashboard (hub)
  |
  +-- Bug Tracker
  |     +-- relates to: Sprint Board (sprint assignment)
  |     +-- relates to: Code Review Tracker (linked PR)
  |
  +-- Sprint Board
  |     +-- relates to: Bug Tracker (bugs in sprint)
  |     +-- formula: velocity calculation
  |
  +-- Code Review Tracker
  |     +-- relates to: Sprint Board (related task)
  |     +-- relates to: Bug Tracker (related bug)
  |
  +-- Learning Log (standalone)
  |
  +-- Meeting Notes
  |     +-- relates to: Sprint Board (action items)
  |
  +-- 1:1 Tracker (standalone)
```

## Customization Tips

- **Add your team members** as options in the Assignee/Reviewer select properties
- **Customize severity levels** to match your team's definitions
- **Add integrations** — connect Slack, GitHub, or Linear via Notion's built-in integrations
- **Create filtered views** — save views per team member, per sprint, or per priority

## Requirements

- Notion account (free or paid)
- For API scripts: Node.js 18+ or Python 3.9+
- For GitHub sync: GitHub personal access token
- For standup bot: a server or scheduler to run the script

## License

This template is sold as a digital product. You may use it for personal and commercial projects. You may not resell or redistribute the template itself.

---

**Built by [DevPlaybook](https://devplaybook.cc)** — Developer tools that actually save you time.
