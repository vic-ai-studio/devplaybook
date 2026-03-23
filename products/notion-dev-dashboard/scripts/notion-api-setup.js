/**
 * Notion Developer Dashboard — API Setup Script (Node.js)
 *
 * Creates all 7 databases (Bug Tracker, Sprint Board, Code Review Tracker,
 * Learning Log, Meeting Notes, 1:1 Tracker, Daily Standup) under a parent page
 * via the Notion API, then sets up relations between them.
 *
 * Usage:
 *   npm install @notionhq/client
 *   NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 node notion-api-setup.js
 *
 * Requirements:
 *   - A Notion integration with "Insert content" and "Read content" capabilities
 *   - A parent page shared with the integration
 */

const { Client } = require("@notionhq/client");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error(
    "Error: Set NOTION_TOKEN and NOTION_PARENT_PAGE_ID environment variables."
  );
  console.error(
    "  NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=abc123 node notion-api-setup.js"
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Store created database IDs for setting up relations
const dbIds = {};

// ─── Color helpers ───────────────────────────────────────────────────────────

function opt(name, color = "default") {
  return { name, color };
}

// ─── Database definitions ────────────────────────────────────────────────────

function bugTrackerProperties() {
  return {
    "Bug Title": { title: {} },
    Status: {
      select: {
        options: [
          opt("New", "gray"),
          opt("Triaged", "blue"),
          opt("In Progress", "yellow"),
          opt("In Review", "purple"),
          opt("Resolved", "green"),
          opt("Closed", "default"),
          opt("Won't Fix", "red"),
        ],
      },
    },
    Severity: {
      select: {
        options: [
          opt("Critical", "red"),
          opt("High", "orange"),
          opt("Medium", "yellow"),
          opt("Low", "gray"),
        ],
      },
    },
    Priority: {
      select: {
        options: [
          opt("P0 - Immediate", "red"),
          opt("P1 - Next Sprint", "orange"),
          opt("P2 - Backlog", "yellow"),
          opt("P3 - Nice to Have", "gray"),
        ],
      },
    },
    Assignee: { people: {} },
    Reporter: { people: {} },
    Environment: {
      multi_select: {
        options: [
          opt("Production", "red"),
          opt("Staging", "orange"),
          opt("Development", "blue"),
          opt("CI/CD", "purple"),
        ],
      },
    },
    Platform: {
      multi_select: {
        options: [
          opt("Web", "blue"),
          opt("iOS", "green"),
          opt("Android", "green"),
          opt("API", "purple"),
          opt("Desktop", "gray"),
          opt("CLI", "default"),
        ],
      },
    },
    Component: {
      select: {
        options: [
          opt("Frontend", "blue"),
          opt("Backend", "purple"),
          opt("Database", "orange"),
          opt("Auth", "red"),
          opt("Payments", "green"),
          opt("Infra", "gray"),
          opt("DevOps", "default"),
        ],
      },
    },
    "Reproduction Steps": { rich_text: {} },
    "Expected Behavior": { rich_text: {} },
    "Actual Behavior": { rich_text: {} },
    "Root Cause": { rich_text: {} },
    Resolution: { rich_text: {} },
    "Date Reported": { date: {} },
    "Date Resolved": { date: {} },
    "GitHub Issue #": { number: {} },
    "GitHub URL": { url: {} },
    "Git Branch": { rich_text: {} },
    Tags: {
      multi_select: {
        options: [
          opt("regression", "red"),
          opt("flaky-test", "orange"),
          opt("performance", "yellow"),
          opt("security", "red"),
          opt("ux", "blue"),
          opt("data-loss", "red"),
          opt("accessibility", "purple"),
        ],
      },
    },
  };
}

function sprintBoardProperties() {
  return {
    "Task Title": { title: {} },
    Status: {
      select: {
        options: [
          opt("Backlog", "gray"),
          opt("To Do", "blue"),
          opt("In Progress", "yellow"),
          opt("In Review", "purple"),
          opt("Done", "green"),
          opt("Blocked", "red"),
          opt("Cancelled", "default"),
        ],
      },
    },
    Type: {
      select: {
        options: [
          opt("Feature", "blue"),
          opt("Bug Fix", "red"),
          opt("Chore", "gray"),
          opt("Spike", "purple"),
          opt("Tech Debt", "orange"),
          opt("Documentation", "green"),
        ],
      },
    },
    Priority: {
      select: {
        options: [
          opt("Urgent", "red"),
          opt("High", "orange"),
          opt("Medium", "yellow"),
          opt("Low", "gray"),
        ],
      },
    },
    "Story Points": {
      select: {
        options: [
          opt("1", "gray"),
          opt("2", "blue"),
          opt("3", "green"),
          opt("5", "yellow"),
          opt("8", "orange"),
          opt("13", "red"),
          opt("21", "red"),
        ],
      },
    },
    Sprint: {
      select: {
        options: [
          opt("Sprint 24 (Mar 11-22)", "blue"),
          opt("Sprint 25 (Mar 25 - Apr 5)", "green"),
          opt("Sprint 26 (Apr 7-18)", "purple"),
          opt("Backlog", "gray"),
        ],
      },
    },
    Assignee: { people: {} },
    Epic: {
      select: {
        options: [
          opt("User Auth", "red"),
          opt("API v2", "blue"),
          opt("Dashboard Redesign", "purple"),
          opt("Performance", "orange"),
          opt("Mobile App", "green"),
          opt("DevOps", "gray"),
          opt("Testing", "yellow"),
        ],
      },
    },
    Labels: {
      multi_select: {
        options: [
          opt("frontend", "blue"),
          opt("backend", "purple"),
          opt("database", "orange"),
          opt("api", "green"),
          opt("infra", "gray"),
          opt("mobile", "yellow"),
          opt("design", "pink"),
          opt("testing", "red"),
        ],
      },
    },
    "Start Date": { date: {} },
    "Due Date": { date: {} },
    "Completed Date": { date: {} },
    "GitHub PR": { url: {} },
    "Branch Name": { rich_text: {} },
    Description: { rich_text: {} },
    "Estimated Hours": { number: { format: "number" } },
    "Actual Hours": { number: { format: "number" } },
  };
}

function codeReviewProperties() {
  return {
    "PR Title": { title: {} },
    "PR Number": { number: {} },
    Status: {
      select: {
        options: [
          opt("Draft", "gray"),
          opt("Open", "blue"),
          opt("Pending Review", "yellow"),
          opt("Changes Requested", "orange"),
          opt("Approved", "green"),
          opt("Merged", "purple"),
          opt("Closed", "red"),
        ],
      },
    },
    Author: { people: {} },
    Reviewers: { people: {} },
    Repository: {
      select: {
        options: [
          opt("frontend", "blue"),
          opt("backend", "purple"),
          opt("mobile", "green"),
          opt("infra", "gray"),
          opt("shared-libs", "orange"),
        ],
      },
    },
    Branch: { rich_text: {} },
    "Target Branch": {
      select: {
        options: [
          opt("main", "red"),
          opt("develop", "blue"),
          opt("staging", "yellow"),
        ],
      },
    },
    "PR URL": { url: {} },
    Type: {
      select: {
        options: [
          opt("Feature", "blue"),
          opt("Bug Fix", "red"),
          opt("Refactor", "purple"),
          opt("Hotfix", "orange"),
          opt("Chore", "gray"),
          opt("Docs", "green"),
        ],
      },
    },
    Size: {
      select: {
        options: [
          opt("XS (1-10 lines)", "gray"),
          opt("S (11-50)", "blue"),
          opt("M (51-200)", "green"),
          opt("L (201-500)", "yellow"),
          opt("XL (500+)", "red"),
        ],
      },
    },
    "Lines Added": { number: {} },
    "Lines Removed": { number: {} },
    "Files Changed": { number: {} },
    "Review Rounds": { number: {} },
    "Date Created": { date: {} },
    "Date First Review": { date: {} },
    "Date Approved": { date: {} },
    "Date Merged": { date: {} },
    "CI Status": {
      select: {
        options: [
          opt("Passing", "green"),
          opt("Failing", "red"),
          opt("Pending", "yellow"),
          opt("Skipped", "gray"),
        ],
      },
    },
    "Has Breaking Changes": { checkbox: {} },
    "Has Migration": { checkbox: {} },
    "Test Coverage": {
      select: {
        options: [
          opt("Increased", "green"),
          opt("Same", "blue"),
          opt("Decreased", "red"),
          opt("No Tests", "gray"),
        ],
      },
    },
    "Review Notes": { rich_text: {} },
    Labels: {
      multi_select: {
        options: [
          opt("needs-design-review", "blue"),
          opt("needs-security-review", "red"),
          opt("needs-qa", "yellow"),
          opt("do-not-merge", "red"),
          opt("auto-merge", "green"),
          opt("breaking-change", "orange"),
        ],
      },
    },
  };
}

function learningLogProperties() {
  return {
    Title: { title: {} },
    Category: {
      select: {
        options: [
          opt("Course", "blue"),
          opt("Book", "green"),
          opt("Article", "yellow"),
          opt("Video/Talk", "purple"),
          opt("Tutorial", "orange"),
          opt("Podcast", "pink"),
          opt("Workshop", "red"),
          opt("Conference", "gray"),
          opt("Side Project", "blue"),
          opt("Certification", "green"),
        ],
      },
    },
    Status: {
      select: {
        options: [
          opt("Want to Learn", "gray"),
          opt("In Progress", "yellow"),
          opt("Completed", "green"),
          opt("Dropped", "red"),
          opt("Revisit", "blue"),
        ],
      },
    },
    "Skill Area": {
      multi_select: {
        options: [
          opt("Frontend", "blue"),
          opt("Backend", "purple"),
          opt("DevOps", "orange"),
          opt("System Design", "red"),
          opt("Algorithms", "yellow"),
          opt("Databases", "green"),
          opt("Security", "red"),
          opt("ML/AI", "pink"),
          opt("Mobile", "blue"),
          opt("Leadership", "green"),
          opt("Communication", "yellow"),
          opt("Architecture", "purple"),
        ],
      },
    },
    Technology: {
      multi_select: {
        options: [
          opt("TypeScript", "blue"),
          opt("Python", "yellow"),
          opt("Go", "blue"),
          opt("Rust", "orange"),
          opt("React", "blue"),
          opt("Next.js", "gray"),
          opt("Node.js", "green"),
          opt("PostgreSQL", "blue"),
          opt("Redis", "red"),
          opt("Docker", "blue"),
          opt("Kubernetes", "blue"),
          opt("AWS", "orange"),
        ],
      },
    },
    Difficulty: {
      select: {
        options: [
          opt("Beginner", "green"),
          opt("Intermediate", "yellow"),
          opt("Advanced", "orange"),
          opt("Expert", "red"),
        ],
      },
    },
    Priority: {
      select: {
        options: [
          opt("High - Career Goal", "red"),
          opt("Medium - Useful", "yellow"),
          opt("Low - Interest", "blue"),
          opt("Someday", "gray"),
        ],
      },
    },
    Source: { url: {} },
    "Author/Instructor": { rich_text: {} },
    Platform: {
      select: {
        options: [
          opt("Udemy", "purple"),
          opt("Coursera", "blue"),
          opt("Pluralsight", "orange"),
          opt("YouTube", "red"),
          opt("O'Reilly", "gray"),
          opt("Frontendmasters", "red"),
          opt("Egghead", "blue"),
          opt("Blog", "green"),
          opt("Book", "yellow"),
          opt("Conference", "purple"),
          opt("Free", "green"),
        ],
      },
    },
    Cost: { number: { format: "dollar" } },
    "Start Date": { date: {} },
    "Completion Date": { date: {} },
    "Time Invested": { number: { format: "number" } },
    Rating: {
      select: {
        options: [
          opt("5 - Excellent", "green"),
          opt("4 - Great", "blue"),
          opt("3 - Good", "yellow"),
          opt("2 - Fair", "orange"),
          opt("1 - Poor", "red"),
        ],
      },
    },
    "Key Takeaways": { rich_text: {} },
    "Applied At Work": { checkbox: {} },
    "Would Recommend": { checkbox: {} },
    "Certificate URL": { url: {} },
    Quarter: {
      select: {
        options: [
          opt("2026-Q1", "blue"),
          opt("2026-Q2", "green"),
          opt("2026-Q3", "yellow"),
          opt("2026-Q4", "red"),
        ],
      },
    },
  };
}

function meetingNotesProperties() {
  return {
    "Meeting Title": { title: {} },
    "Meeting Type": {
      select: {
        options: [
          opt("Daily Standup", "blue"),
          opt("Sprint Planning", "green"),
          opt("Sprint Retro", "purple"),
          opt("Design Review", "yellow"),
          opt("Architecture Review", "orange"),
          opt("Incident Review", "red"),
          opt("Team Sync", "blue"),
          opt("All Hands", "gray"),
          opt("Demo", "green"),
          opt("Interview Debrief", "purple"),
          opt("Ad Hoc", "default"),
        ],
      },
    },
    Date: { date: {} },
    Duration: {
      select: {
        options: [
          opt("15 min", "gray"),
          opt("30 min", "blue"),
          opt("45 min", "yellow"),
          opt("60 min", "orange"),
          opt("90 min", "red"),
          opt("120 min", "red"),
        ],
      },
    },
    Attendees: { people: {} },
    Facilitator: { people: {} },
    "Note Taker": { people: {} },
    Status: {
      select: {
        options: [
          opt("Scheduled", "blue"),
          opt("In Progress", "yellow"),
          opt("Completed", "green"),
          opt("Cancelled", "red"),
        ],
      },
    },
    "Recording URL": { url: {} },
    "Follow-up Date": { date: {} },
    Tags: {
      multi_select: {
        options: [
          opt("architecture", "purple"),
          opt("planning", "blue"),
          opt("process", "green"),
          opt("hiring", "yellow"),
          opt("incident", "red"),
          opt("performance", "orange"),
          opt("security", "red"),
          opt("launch", "green"),
          opt("retrospective", "purple"),
        ],
      },
    },
    Series: {
      select: {
        options: [
          opt("Weekly Team Sync", "blue"),
          opt("Daily Standup", "green"),
          opt("Bi-weekly Retro", "purple"),
          opt("Monthly All Hands", "yellow"),
          opt("One-off", "gray"),
        ],
      },
    },
    "Decisions Made": { number: {} },
    "Action Items Open": { number: {} },
    "Action Items Closed": { number: {} },
  };
}

function oneOnOneProperties() {
  return {
    "Meeting Title": { title: {} },
    Date: { date: {} },
    Manager: { people: {} },
    Report: { people: {} },
    Mood: {
      select: {
        options: [
          opt("Great", "green"),
          opt("Good", "blue"),
          opt("Okay", "yellow"),
          opt("Struggling", "orange"),
          opt("Burnt Out", "red"),
        ],
      },
    },
    Status: {
      select: {
        options: [
          opt("Scheduled", "blue"),
          opt("Completed", "green"),
          opt("Cancelled", "red"),
          opt("Rescheduled", "yellow"),
        ],
      },
    },
    Duration: {
      select: {
        options: [
          opt("15 min", "gray"),
          opt("30 min", "blue"),
          opt("45 min", "yellow"),
          opt("60 min", "orange"),
        ],
      },
    },
    "Meeting Cadence": {
      select: {
        options: [
          opt("Weekly", "green"),
          opt("Bi-weekly", "blue"),
          opt("Monthly", "yellow"),
        ],
      },
    },
    "Topics Covered": {
      multi_select: {
        options: [
          opt("Project Updates", "blue"),
          opt("Career Growth", "green"),
          opt("Feedback", "yellow"),
          opt("Blockers", "red"),
          opt("Goals Review", "purple"),
          opt("Personal", "pink"),
          opt("Team Dynamics", "orange"),
          opt("Compensation", "gray"),
          opt("Performance Review", "blue"),
          opt("Onboarding", "green"),
          opt("PTO/Leave", "yellow"),
        ],
      },
    },
    "Action Items Open": { number: {} },
    "Action Items Closed": { number: {} },
    "Follow-up Items": { rich_text: {} },
    Quarter: {
      select: {
        options: [
          opt("2026-Q1", "blue"),
          opt("2026-Q2", "green"),
          opt("2026-Q3", "yellow"),
          opt("2026-Q4", "red"),
        ],
      },
    },
    "Next Meeting": { date: {} },
    Streak: { number: {} },
  };
}

function dailyStandupProperties() {
  return {
    Title: { title: {} },
    Date: { date: {} },
    Person: { people: {} },
    Yesterday: { rich_text: {} },
    Today: { rich_text: {} },
    Blockers: { rich_text: {} },
    Mood: {
      select: {
        options: [
          opt("Great", "green"),
          opt("Good", "blue"),
          opt("Okay", "yellow"),
          opt("Struggling", "orange"),
        ],
      },
    },
    "Has Blockers": { checkbox: {} },
    Sprint: {
      select: {
        options: [
          opt("Sprint 24", "blue"),
          opt("Sprint 25", "green"),
          opt("Sprint 26", "purple"),
        ],
      },
    },
  };
}

// ─── Create database ─────────────────────────────────────────────────────────

async function createDatabase(title, icon, properties) {
  console.log(`Creating database: ${title}...`);

  const response = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: icon },
    title: [{ type: "text", text: { content: title } }],
    properties,
  });

  console.log(`  Created: ${response.id}`);
  return response.id;
}

// ─── Add relation properties ─────────────────────────────────────────────────

async function addRelation(dbId, propertyName, relatedDbId, syncedName) {
  console.log(
    `Adding relation: ${propertyName} -> ${relatedDbId.slice(0, 8)}...`
  );

  const updatePayload = {
    database_id: dbId,
    properties: {
      [propertyName]: {
        relation: {
          database_id: relatedDbId,
          type: "dual_property",
          dual_property: {
            synced_property_name: syncedName,
          },
        },
      },
    },
  };

  await notion.databases.update(updatePayload);
}

// ─── Add sample pages ────────────────────────────────────────────────────────

async function addSampleBug(dbId, title, status, severity, priority, component) {
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      "Bug Title": { title: [{ text: { content: title } }] },
      Status: { select: { name: status } },
      Severity: { select: { name: severity } },
      Priority: { select: { name: priority } },
      Component: { select: { name: component } },
      "Date Reported": { date: { start: new Date().toISOString().split("T")[0] } },
    },
  });
}

async function addSampleTask(dbId, title, status, type, points, sprint, epic) {
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      "Task Title": { title: [{ text: { content: title } }] },
      Status: { select: { name: status } },
      Type: { select: { name: type } },
      "Story Points": { select: { name: points } },
      Sprint: { select: { name: sprint } },
      Epic: { select: { name: epic } },
    },
  });
}

async function addSamplePR(dbId, title, status, repo, type, size) {
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      "PR Title": { title: [{ text: { content: title } }] },
      Status: { select: { name: status } },
      Repository: { select: { name: repo } },
      Type: { select: { name: type } },
      Size: { select: { name: size } },
      "Date Created": { date: { start: new Date().toISOString().split("T")[0] } },
    },
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Notion Developer Dashboard Setup ===\n");

  // 1. Create all databases
  dbIds.bugTracker = await createDatabase(
    "Bug Tracker",
    "\uD83D\uDC1B",
    bugTrackerProperties()
  );

  dbIds.sprintBoard = await createDatabase(
    "Sprint Board",
    "\uD83C\uDFC3",
    sprintBoardProperties()
  );

  dbIds.codeReview = await createDatabase(
    "Code Review Tracker",
    "\uD83D\uDD0D",
    codeReviewProperties()
  );

  dbIds.learningLog = await createDatabase(
    "Learning Log",
    "\uD83D\uDCDA",
    learningLogProperties()
  );

  dbIds.meetingNotes = await createDatabase(
    "Meeting Notes",
    "\uD83D\uDCDD",
    meetingNotesProperties()
  );

  dbIds.oneOnOne = await createDatabase(
    "1:1 Tracker",
    "\uD83E\uDD1D",
    oneOnOneProperties()
  );

  dbIds.standup = await createDatabase(
    "Daily Standup",
    "\u2615",
    dailyStandupProperties()
  );

  console.log("\n--- All databases created ---\n");

  // 2. Set up relations
  console.log("Setting up relations...\n");

  await addRelation(
    dbIds.bugTracker,
    "Sprint",
    dbIds.sprintBoard,
    "Bugs"
  );

  await addRelation(
    dbIds.bugTracker,
    "Related PR",
    dbIds.codeReview,
    "Related Bug"
  );

  await addRelation(
    dbIds.sprintBoard,
    "Code Reviews",
    dbIds.codeReview,
    "Sprint Task"
  );

  await addRelation(
    dbIds.meetingNotes,
    "Sprint Tasks",
    dbIds.sprintBoard,
    "Meeting Notes"
  );

  console.log("--- Relations configured ---\n");

  // 3. Add sample data
  console.log("Adding sample data...\n");

  await addSampleBug(
    dbIds.bugTracker,
    "Login fails with SSO on Safari 17.4",
    "Triaged",
    "High",
    "P0 - Immediate",
    "Auth"
  );
  await addSampleBug(
    dbIds.bugTracker,
    "Dashboard charts render blank on mobile",
    "In Progress",
    "Medium",
    "P1 - Next Sprint",
    "Frontend"
  );
  await addSampleBug(
    dbIds.bugTracker,
    "API rate limiter allows burst above 1000 req/s",
    "New",
    "Critical",
    "P0 - Immediate",
    "Backend"
  );

  await addSampleTask(
    dbIds.sprintBoard,
    "Implement OAuth2 PKCE flow",
    "In Progress",
    "Feature",
    "8",
    "Sprint 25 (Mar 25 - Apr 5)",
    "User Auth"
  );
  await addSampleTask(
    dbIds.sprintBoard,
    "Add rate limiting to /api/v2/*",
    "To Do",
    "Feature",
    "5",
    "Sprint 25 (Mar 25 - Apr 5)",
    "API v2"
  );
  await addSampleTask(
    dbIds.sprintBoard,
    "Write E2E tests for checkout flow",
    "To Do",
    "Chore",
    "5",
    "Sprint 25 (Mar 25 - Apr 5)",
    "Testing"
  );

  await addSamplePR(
    dbIds.codeReview,
    "Add OAuth2 PKCE authentication flow",
    "Pending Review",
    "backend",
    "Feature",
    "L (201-500)"
  );
  await addSamplePR(
    dbIds.codeReview,
    "Fix memory leak in WS connection pool",
    "Approved",
    "backend",
    "Bug Fix",
    "M (51-200)"
  );

  console.log("--- Sample data added ---\n");

  // 4. Create dashboard page
  console.log("Creating dashboard page...\n");

  await notion.pages.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "\uD83D\uDCCA" },
    properties: {
      title: { title: [{ text: { content: "Developer Dashboard" } }] },
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ text: { content: "Developer Dashboard" } }],
        },
      },
      {
        object: "block",
        type: "callout",
        callout: {
          icon: { type: "emoji", emoji: "\uD83D\uDE80" },
          rich_text: [
            {
              text: {
                content:
                  "Your central engineering hub. Use the linked databases below to navigate your workflow.",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Quick Links" } }],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: "Bug Tracker",
                link: {
                  url: `https://notion.so/${dbIds.bugTracker.replace(/-/g, "")}`,
                },
              },
            },
            { text: { content: " — Track and triage bugs" } },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: "Sprint Board",
                link: {
                  url: `https://notion.so/${dbIds.sprintBoard.replace(/-/g, "")}`,
                },
              },
            },
            { text: { content: " — Current sprint tasks and backlog" } },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: "Code Review Tracker",
                link: {
                  url: `https://notion.so/${dbIds.codeReview.replace(/-/g, "")}`,
                },
              },
            },
            { text: { content: " — Open PRs and review status" } },
          ],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: "Learning Log",
                link: {
                  url: `https://notion.so/${dbIds.learningLog.replace(/-/g, "")}`,
                },
              },
            },
            { text: { content: " — Personal growth and skills" } },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Database IDs (for API scripts)" } }],
        },
      },
      {
        object: "block",
        type: "code",
        code: {
          rich_text: [
            {
              text: {
                content: Object.entries(dbIds)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n"),
              },
            },
          ],
          language: "plain text",
        },
      },
    ],
  });

  console.log("=== Setup Complete! ===\n");
  console.log("Database IDs:");
  for (const [name, id] of Object.entries(dbIds)) {
    console.log(`  ${name}: ${id}`);
  }
  console.log(
    "\nSave these IDs for use with sync-github-issues.py and daily-standup-bot.py"
  );
}

main().catch((error) => {
  console.error("Setup failed:", error.message);
  if (error.body) {
    console.error("Details:", JSON.stringify(error.body, null, 2));
  }
  process.exit(1);
});
