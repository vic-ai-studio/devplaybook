import { useState, useMemo } from 'preact/hooks';

type Category = 'Code' | 'Writing' | 'Analysis' | 'Data' | 'Debug' | 'System';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: Category;
  model: string;
  template: string;
  tags: string[];
}

const TEMPLATES: PromptTemplate[] = [
  // Code
  {
    id: 'code-review',
    title: 'Code Review Expert',
    description: 'Deep code review with actionable feedback on quality, performance, and best practices.',
    category: 'Code',
    model: 'Claude 3.5',
    tags: ['review', 'quality'],
    template: `You are an expert {{language}} developer with 10+ years of experience. Review the following code and provide structured feedback on:

1. **{{focus_area}}** — be specific about what to change
2. **Performance** — identify bottlenecks, unnecessary allocations, or slow operations
3. **Best Practices** — conventions, naming, SOLID principles, idiomatic patterns
4. **Security** — any potential vulnerabilities or unsafe patterns
5. **Quick Wins** — small changes with high impact

Format your response with code examples for each improvement. Be direct and prioritize issues by severity (critical / warning / suggestion).

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\``,
  },
  {
    id: 'refactor-plan',
    title: 'Refactor Planner',
    description: 'Get a step-by-step refactoring plan for legacy or complex code.',
    category: 'Code',
    model: 'Claude 3.5',
    tags: ['refactor', 'architecture'],
    template: `You are a senior software architect. I need to refactor the following {{language}} code to improve {{goal}} (e.g. readability, testability, performance).

Provide:
1. A brief analysis of the current problems
2. A numbered refactoring plan (each step should be independently mergeable)
3. The refactored code with inline comments explaining changes
4. Any breaking changes or migration notes

Current code:
\`\`\`{{language}}
{{code}}
\`\`\`

Target environment / constraints: {{constraints}}`,
  },
  {
    id: 'unit-test-writer',
    title: 'Unit Test Writer',
    description: 'Generate comprehensive unit tests with edge cases for any function.',
    category: 'Code',
    model: 'GPT-4o',
    tags: ['testing', 'tdd'],
    template: `You are a TDD expert. Write comprehensive unit tests for the following {{language}} function using {{test_framework}}.

Cover:
- Happy path (expected inputs)
- Edge cases (empty, null, boundary values)
- Error/exception cases
- Performance-sensitive inputs (if applicable)

Add a brief comment above each test explaining what it verifies. Use descriptive test names following the pattern: \`should_{{action}}_when_{{condition}}\`.

Function to test:
\`\`\`{{language}}
{{function_code}}
\`\`\``,
  },
  {
    id: 'api-design',
    title: 'REST API Designer',
    description: 'Design a RESTful API with endpoints, request/response schemas, and error codes.',
    category: 'Code',
    model: 'Claude 3.5',
    tags: ['api', 'rest', 'design'],
    template: `You are a REST API design expert. Design a complete API for {{feature_description}}.

Provide:
1. Resource hierarchy and URL structure
2. HTTP methods and endpoints (GET, POST, PUT, PATCH, DELETE)
3. Request body schemas (JSON) with field descriptions and validation rules
4. Response schemas for success and error cases
5. HTTP status codes used and why
6. Authentication approach: {{auth_method}}
7. Pagination strategy (if applicable)
8. Rate limiting headers

Format endpoints as: \`METHOD /path\` with a table for each showing request/response examples.`,
  },
  {
    id: 'sql-optimizer',
    title: 'SQL Query Optimizer',
    description: 'Optimize slow SQL queries with explanations and indexing recommendations.',
    category: 'Code',
    model: 'GPT-4o',
    tags: ['sql', 'database', 'performance'],
    template: `You are a database performance expert. Optimize the following {{database}} SQL query.

Current query:
\`\`\`sql
{{query}}
\`\`\`

Table schemas (if known):
{{schema}}

Provide:
1. Why the query is slow (query plan analysis)
2. Optimized version with comments explaining each change
3. Recommended indexes with CREATE INDEX statements
4. Estimated performance improvement
5. Any alternative approaches worth considering`,
  },

  // Writing
  {
    id: 'blog-post',
    title: 'Technical Blog Post',
    description: 'Write an SEO-optimized technical blog post that educates and engages developers.',
    category: 'Writing',
    model: 'Claude 3.5',
    tags: ['blog', 'seo', 'content'],
    template: `You are a technical writer and developer advocate. Write a comprehensive blog post about {{topic}}.

Target audience: {{audience}} (e.g. "beginner JavaScript developers", "senior DevOps engineers")
Tone: {{tone}} (e.g. "friendly and practical", "formal and authoritative")
Target length: {{word_count}} words

Structure:
1. Hook opening (problem or surprising fact)
2. What and why (the core concept)
3. Step-by-step tutorial with code examples
4. Common pitfalls and how to avoid them
5. Summary and next steps

Include a meta description (150-160 chars) and 5 suggested SEO tags at the end.`,
  },
  {
    id: 'readme-writer',
    title: 'README Generator',
    description: 'Create a professional README.md with badges, installation, usage, and contributing guide.',
    category: 'Writing',
    model: 'GPT-4o',
    tags: ['readme', 'documentation', 'open-source'],
    template: `Write a professional README.md for a {{project_type}} project called "{{project_name}}".

Project description: {{description}}
Tech stack: {{tech_stack}}
Target users: {{target_users}}

Include:
- Project title with shields.io badges (build, license, npm/pypi version)
- One-paragraph elevator pitch
- Feature list (bullet points)
- Prerequisites
- Installation instructions (step-by-step with code blocks)
- Quick start example
- Configuration reference (table format)
- Contributing guidelines
- License section

Use GitHub Markdown. Make it scannable with clear sections and code examples.`,
  },
  {
    id: 'pr-description',
    title: 'PR Description Writer',
    description: 'Generate a clear, thorough pull request description from a git diff or change summary.',
    category: 'Writing',
    model: 'Claude 3.5',
    tags: ['git', 'pr', 'collaboration'],
    template: `Write a pull request description for the following change:

Change summary: {{change_summary}}

Git diff or changed files:
\`\`\`
{{diff_or_files}}
\`\`\`

Format:
## Summary
[2-3 sentences explaining what and why]

## Changes
- [Bullet list of specific changes]

## Testing
- [ ] [Test steps the reviewer should verify]

## Screenshots (if UI change)
[Placeholder or N/A]

## Breaking Changes
[None / describe any breaking changes]

Keep it concise but complete. Link to any related issues as "Closes #{{issue_number}}".`,
  },
  {
    id: 'changelog-entry',
    title: 'Changelog Entry Writer',
    description: 'Write user-facing changelog entries from technical commit messages.',
    category: 'Writing',
    model: 'GPT-4o',
    tags: ['changelog', 'release', 'communication'],
    template: `Convert the following technical commit messages into clear, user-facing changelog entries for version {{version}}.

Commit messages:
{{commits}}

Format as Keep a Changelog (https://keepachangelog.com):
## [{{version}}] - {{date}}
### Added
### Changed
### Fixed
### Deprecated
### Removed
### Security

Rules:
- Write for end users, not developers
- Use past tense ("Added", "Fixed", not "Add", "Fix")
- Group related changes
- Skip internal refactors unless they affect users
- Highlight breaking changes clearly`,
  },
  {
    id: 'error-message-writer',
    title: 'User-Friendly Error Message Writer',
    description: 'Transform cryptic technical errors into clear, actionable user-facing messages.',
    category: 'Writing',
    model: 'Claude 3.5',
    tags: ['ux', 'error-handling'],
    template: `Rewrite the following technical error message as a user-friendly message that helps users understand what went wrong and what to do next.

Technical error:
{{technical_error}}

Context (where in the app this occurs): {{context}}
Target user type: {{user_type}} (e.g. "non-technical end user", "developer using our API")

Provide:
1. **Short error title** (5-8 words max)
2. **User-facing message** (1-2 sentences, plain English, no jargon)
3. **Suggested action** ("Try again", "Contact support", "Check your settings at...")
4. **Error code** (if applicable, for support reference)`,
  },

  // Analysis
  {
    id: 'competitive-analysis',
    title: 'Competitive Analysis',
    description: 'Structured competitive analysis comparing features, positioning, and opportunities.',
    category: 'Analysis',
    model: 'Claude 3.5',
    tags: ['strategy', 'market', 'product'],
    template: `You are a product strategy consultant. Perform a competitive analysis of {{product_name}} versus its competitors.

My product: {{my_product_description}}
Key competitors: {{competitors}}
Focus area: {{focus_area}} (e.g. "pricing", "features", "developer experience", "market positioning")

Deliver:
1. Feature comparison matrix (table format)
2. Positioning map description (how each product is positioned)
3. Our key differentiators (genuine strengths)
4. Gaps and opportunities (what competitors do better)
5. Recommended strategic moves (3-5 actionable items)
6. Risk factors to monitor

Be honest and data-driven. Flag any assumptions you're making.`,
  },
  {
    id: 'requirements-analyzer',
    title: 'Requirements Analyzer',
    description: 'Analyze product requirements to surface ambiguities, risks, and missing pieces.',
    category: 'Analysis',
    model: 'Claude 3.5',
    tags: ['product', 'requirements', 'planning'],
    template: `You are a senior product manager and technical architect. Analyze the following requirements document and identify issues before development begins.

Requirements:
{{requirements}}

Analyze for:
1. **Ambiguities** — statements that could be interpreted multiple ways
2. **Missing requirements** — obvious gaps that will cause problems later
3. **Conflicting requirements** — contradictions within the document
4. **Technical risks** — requirements that are technically challenging or infeasible
5. **Scope creep risks** — vague statements that could expand indefinitely
6. **Dependencies** — external systems, teams, or data sources needed

Format as a numbered issue list with severity (high/medium/low) and suggested clarifying questions for each.`,
  },
  {
    id: 'code-complexity',
    title: 'Code Complexity Explainer',
    description: 'Explain complex code in plain English with visual diagrams (ASCII/Mermaid).',
    category: 'Analysis',
    model: 'GPT-4o',
    tags: ['documentation', 'onboarding'],
    template: `Explain the following {{language}} code to a {{audience_level}} developer (e.g. "junior", "non-technical stakeholder").

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. **Plain English summary** (what this code does, not how)
2. **Step-by-step walkthrough** (what happens in each major section)
3. **Data flow diagram** (ASCII or Mermaid diagram)
4. **Key concepts** used (with brief explanations)
5. **Gotchas** — anything surprising or non-obvious about this code

Avoid jargon. Use analogies where helpful.`,
  },
  {
    id: 'performance-audit',
    title: 'Performance Audit Prompt',
    description: 'Systematic performance audit checklist for web apps, APIs, or databases.',
    category: 'Analysis',
    model: 'Claude 3.5',
    tags: ['performance', 'audit', 'optimization'],
    template: `You are a performance engineering expert. Perform a performance audit of the following {{system_type}} (e.g. "React web app", "REST API", "PostgreSQL schema").

System description: {{description}}
Current performance metrics: {{metrics}}
Main pain points: {{pain_points}}

Audit across these dimensions:
1. **Critical path** — what's on the slowest user journey?
2. **Database** — N+1 queries, missing indexes, heavy joins
3. **Caching** — what should be cached and at which layer?
4. **Network** — payload sizes, round trips, CDN usage
5. **Frontend** (if applicable) — bundle size, render blocking, CLS/LCP
6. **Infrastructure** — connection pooling, vertical vs horizontal scaling

Prioritize findings by impact × effort. Provide specific, actionable recommendations with estimated improvement for each.`,
  },
  {
    id: 'feedback-synthesizer',
    title: 'User Feedback Synthesizer',
    description: 'Synthesize raw user feedback into themes, priorities, and product insights.',
    category: 'Analysis',
    model: 'GPT-4o',
    tags: ['product', 'user-research', 'feedback'],
    template: `You are a UX researcher. Synthesize the following raw user feedback into actionable product insights.

Product: {{product_name}}
Feedback source: {{source}} (e.g. "NPS surveys", "support tickets", "app store reviews", "user interviews")

Raw feedback:
{{feedback}}

Deliver:
1. **Top themes** (3-5 recurring topics, with frequency estimate)
2. **Sentiment breakdown** (positive / neutral / negative with key quotes)
3. **Top pain points** ranked by frequency and severity
4. **Feature requests** grouped by theme
5. **Delighters** — things users love (don't break these!)
6. **Recommended actions** (prioritized backlog items with user impact rationale)`,
  },

  // Data
  {
    id: 'data-cleaning',
    title: 'Data Cleaning Script',
    description: 'Generate Python/pandas data cleaning code with validation and transformation steps.',
    category: 'Data',
    model: 'GPT-4o',
    tags: ['python', 'pandas', 'data-engineering'],
    template: `You are a data engineer. Write a {{language}} (Python/pandas or SQL) script to clean and transform the following dataset.

Dataset description: {{dataset_description}}
Data source format: {{format}} (e.g. "CSV", "JSON API response", "SQL table")
Target schema: {{target_schema}}

Issues to address:
{{issues}} (e.g. "missing values", "duplicate rows", "inconsistent date formats", "outliers in price column")

The script should:
1. Load the data and print a summary (shape, dtypes, missing values)
2. Handle each issue with a comment explaining the approach
3. Validate the output against the target schema
4. Save to {{output_format}}
5. Print a before/after summary

Use defensive coding — never silently drop data without logging how much was dropped and why.`,
  },
  {
    id: 'regex-builder',
    title: 'Regex Pattern Builder',
    description: 'Build and explain complex regex patterns with test cases.',
    category: 'Data',
    model: 'Claude 3.5',
    tags: ['regex', 'parsing', 'validation'],
    template: `Build a regex pattern to match: {{description}}

Examples of strings that SHOULD match:
{{positive_examples}}

Examples of strings that SHOULD NOT match:
{{negative_examples}}

Language / flavor: {{language}} (e.g. "JavaScript", "Python re", "PCRE", "Go")

Provide:
1. The regex pattern
2. Line-by-line explanation of each component
3. A code snippet showing how to use it
4. Edge cases this pattern handles (and any it doesn't)
5. Alternative approaches if this regex is overly complex`,
  },
  {
    id: 'json-schema',
    title: 'JSON Schema Generator',
    description: 'Generate JSON Schema from example data with validation rules and descriptions.',
    category: 'Data',
    model: 'GPT-4o',
    tags: ['json', 'schema', 'validation'],
    template: `Generate a JSON Schema (draft-07 or 2020-12) for the following JSON data.

Example JSON:
\`\`\`json
{{json_example}}
\`\`\`

Requirements:
- Required fields: {{required_fields}}
- Field descriptions: add a "description" for every field
- Validation rules: {{validation_rules}} (e.g. "email must be valid format", "age must be 0-150")
- Allow additional properties: {{allow_additional}} (yes/no)

Also provide:
- A TypeScript interface equivalent
- 2-3 invalid JSON examples that would fail validation and why`,
  },
  {
    id: 'api-mock',
    title: 'Mock Data Generator',
    description: 'Generate realistic mock data arrays for testing and development.',
    category: 'Data',
    model: 'Claude 3.5',
    tags: ['mock', 'testing', 'fixtures'],
    template: `Generate {{count}} realistic mock data records for: {{entity_name}}

Fields needed:
{{fields}}

Requirements:
- Use realistic values (real-looking names, valid email formats, plausible dates)
- Include variety — don't repeat patterns
- Language: {{language}} (output as JSON, CSV, or {{language}} array/object literal)
- Seed the data so it's deterministic if using a faker library

Also provide the {{language}} code to generate this data programmatically using {{faker_library}} (e.g. Faker.js, Faker Python, factory_boy).`,
  },
  {
    id: 'etl-pipeline',
    title: 'ETL Pipeline Designer',
    description: 'Design a data pipeline with extraction, transformation, and loading steps.',
    category: 'Data',
    model: 'Claude 3.5',
    tags: ['etl', 'pipeline', 'data-engineering'],
    template: `Design an ETL pipeline for the following data flow:

Source: {{source}} (e.g. "PostgreSQL users table", "REST API endpoint", "S3 CSV files")
Destination: {{destination}} (e.g. "BigQuery analytics table", "Elasticsearch index")
Transformation needed: {{transformations}}
Schedule: {{schedule}} (e.g. "real-time streaming", "daily batch at 2AM", "triggered on file upload")

Design:
1. Architecture diagram (ASCII or Mermaid)
2. Extraction strategy (full load vs incremental, pagination, rate limits)
3. Transformation steps with data examples
4. Loading strategy (upsert, append, truncate-load)
5. Error handling and retry logic
6. Monitoring and alerting approach
7. Estimated resource requirements
8. Recommended tools/frameworks for this use case`,
  },

  // Debug
  {
    id: 'error-diagnosis',
    title: 'Error Diagnosis',
    description: 'Systematically diagnose and fix errors with root cause analysis.',
    category: 'Debug',
    model: 'Claude 3.5',
    tags: ['debugging', 'root-cause'],
    template: `You are a debugging expert. Help me diagnose and fix the following error.

Error message:
\`\`\`
{{error_message}}
\`\`\`

Stack trace (if available):
\`\`\`
{{stack_trace}}
\`\`\`

Code context:
\`\`\`{{language}}
{{code}}
\`\`\`

Environment: {{environment}} (e.g. "Node.js 20, macOS", "Python 3.11, Docker container")
What I already tried: {{tried}}

Provide:
1. **Root cause** — what is actually wrong
2. **Why it happens** — explain the underlying mechanism
3. **Fix** — code change with explanation
4. **Verification** — how to confirm the fix works
5. **Prevention** — how to avoid this class of error in the future`,
  },
  {
    id: 'log-analyzer',
    title: 'Log Analyzer',
    description: 'Analyze log output to identify errors, patterns, and anomalies.',
    category: 'Debug',
    model: 'GPT-4o',
    tags: ['logs', 'monitoring', 'ops'],
    template: `Analyze the following log output and identify issues, patterns, and anomalies.

Log content:
\`\`\`
{{log_content}}
\`\`\`

Context: {{context}} (e.g. "production API server", "CI pipeline", "database migration")
Time range: {{time_range}}
Expected behavior: {{expected_behavior}}

Provide:
1. **Summary** — overall health assessment
2. **Critical errors** — errors that likely caused failures (with timestamps)
3. **Warnings** — non-fatal issues to address
4. **Patterns** — recurring issues or suspicious sequences
5. **Timeline** — sequence of events leading to any failure
6. **Recommended actions** — prioritized list of things to investigate or fix`,
  },
  {
    id: 'memory-leak',
    title: 'Memory Leak Finder',
    description: 'Identify potential memory leaks in code with specific remediation steps.',
    category: 'Debug',
    model: 'Claude 3.5',
    tags: ['performance', 'memory', 'profiling'],
    template: `You are a performance engineering expert specializing in memory management. Analyze the following {{language}} code for memory leaks and excessive memory usage.

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Runtime environment: {{runtime}} (e.g. "Node.js", "Python", "JVM", "browser")
Observed symptom: {{symptom}} (e.g. "memory grows 50MB/hour", "OOM crash after 2 hours")

Identify:
1. **Specific leak locations** — line numbers and why they leak
2. **Leak mechanism** — what holds the reference (closure, cache, event listener, etc.)
3. **Fixed code** — corrected version with comments
4. **How to verify** — profiling commands or tools to confirm the fix
5. **Monitoring** — metrics to track to detect similar issues in production`,
  },
  {
    id: 'race-condition',
    title: 'Race Condition Debugger',
    description: 'Identify and fix race conditions, deadlocks, and concurrency issues.',
    category: 'Debug',
    model: 'Claude 3.5',
    tags: ['concurrency', 'async', 'threads'],
    template: `You are an expert in concurrent programming. Analyze the following code for race conditions, deadlocks, and thread-safety issues.

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Concurrency model: {{model}} (e.g. "async/await", "multi-threading", "actor model", "event loop")
Observed symptom: {{symptom}} (e.g. "intermittent failures under load", "deadlock every few hours")

Provide:
1. **Issue identification** — exactly where and why the race condition or deadlock occurs
2. **Scenario walkthrough** — step-by-step description of how the bug manifests
3. **Fixed code** — thread-safe version with explanation
4. **Synchronization strategy** — why you chose this approach (locks, atomics, channels, etc.)
5. **Testing approach** — how to write a test that reliably reproduces the bug`,
  },
  {
    id: 'test-flakiness',
    title: 'Flaky Test Fixer',
    description: 'Diagnose and fix flaky, intermittently failing tests.',
    category: 'Debug',
    model: 'GPT-4o',
    tags: ['testing', 'ci', 'reliability'],
    template: `Help me fix a flaky test that intermittently fails.

Test code:
\`\`\`{{language}}
{{test_code}}
\`\`\`

Code under test:
\`\`\`{{language}}
{{source_code}}
\`\`\`

Failure pattern: {{pattern}} (e.g. "fails ~20% in CI, passes locally", "fails only when tests run in parallel")
Error when failing:
\`\`\`
{{error_when_failing}}
\`\`\`

Diagnose:
1. **Root cause** of the flakiness
2. **Categories** — timing, ordering, external dependency, shared state, randomness
3. **Fixed test** — deterministic version
4. **Test isolation improvements** — setup/teardown changes needed
5. **CI configuration** — any CI-specific settings to add`,
  },

  // System
  {
    id: 'system-prompt',
    title: 'AI System Prompt Builder',
    description: 'Craft a precise system prompt that gives AI assistants a clear persona, rules, and constraints.',
    category: 'System',
    model: 'Claude 3.5',
    tags: ['prompt-engineering', 'llm', 'chatbot'],
    template: `You are a prompt engineering expert. Write a system prompt for an AI assistant with the following characteristics:

Role / persona: {{role}}
Primary use case: {{use_case}}
Target users: {{users}}
Tone and style: {{tone}}
Key capabilities it SHOULD have: {{capabilities}}
Hard constraints (things it must NEVER do): {{constraints}}
Output format preferences: {{format_preferences}}

The system prompt should:
- Open with a clear role definition
- List behavioral rules in order of priority
- Include specific examples of how to handle edge cases
- Define the response format clearly
- Be tested against: "What if a user asks something outside your scope?"

Write the final system prompt in a \`\`\`system\`\`\` code block, followed by 3 test prompts to validate it.`,
  },
  {
    id: 'dockerfile',
    title: 'Dockerfile Generator',
    description: 'Generate a production-ready, optimized Dockerfile for any stack.',
    category: 'System',
    model: 'GPT-4o',
    tags: ['docker', 'devops', 'containers'],
    template: `Generate a production-ready Dockerfile for the following application:

Language / runtime: {{runtime}} (e.g. "Node.js 20", "Python 3.11", "Go 1.22")
Framework: {{framework}}
Application type: {{app_type}} (e.g. "web server", "worker", "CLI tool")
Entry point: {{entrypoint}}
Environment: {{environment}} (development / staging / production)

Requirements:
- Multi-stage build to minimize final image size
- Non-root user for security
- Layer caching optimized for fast rebuilds
- Health check endpoint: {{health_check}}
- Environment variables needed: {{env_vars}}

Also provide:
- .dockerignore file contents
- docker-compose.yml for local development
- Build and run commands
- Estimated final image size`,
  },
  {
    id: 'ci-pipeline',
    title: 'CI/CD Pipeline Builder',
    description: 'Generate GitHub Actions or GitLab CI pipeline configuration with test, build, and deploy stages.',
    category: 'System',
    model: 'Claude 3.5',
    tags: ['ci-cd', 'github-actions', 'devops'],
    template: `Generate a CI/CD pipeline configuration for: {{platform}} (GitHub Actions / GitLab CI / CircleCI)

Project type: {{project_type}}
Tech stack: {{stack}}
Deployment target: {{deploy_target}} (e.g. "Vercel", "AWS ECS", "Kubernetes", "Fly.io")

Pipeline stages required:
{{stages}} (e.g. "lint, test, build, security scan, deploy to staging, deploy to production")

Requirements:
- Cache dependencies between runs
- Run tests in parallel if possible
- Deploy to staging on PR merge, production on release tag
- Notify {{notification}} on failure (Slack / email / Discord)
- Environment secrets: {{secrets_list}}

Include inline comments explaining each step and any security best practices applied.`,
  },
  {
    id: 'security-review',
    title: 'Security Review Checklist',
    description: 'Run a security audit against OWASP Top 10 and common vulnerabilities.',
    category: 'System',
    model: 'Claude 3.5',
    tags: ['security', 'owasp', 'audit'],
    template: `You are a senior application security engineer. Perform a security review of the following code.

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Application type: {{app_type}} (e.g. "REST API", "web frontend", "authentication service")
Data handled: {{data_sensitivity}} (e.g. "PII", "payment data", "public data only")

Check against:
1. **OWASP Top 10** — injection, broken auth, XSS, IDOR, misconfiguration, etc.
2. **Input validation** — all user inputs sanitized and validated?
3. **Authentication & authorization** — proper checks in place?
4. **Secrets management** — no hardcoded credentials?
5. **Error handling** — no sensitive data leaked in errors?
6. **Dependency vulnerabilities** — any known CVEs in dependencies?

Format findings as: Severity | Vulnerability | Location | Remediation`,
  },
  {
    id: 'monitoring-setup',
    title: 'Monitoring & Alerting Setup',
    description: 'Design a monitoring and alerting strategy for production applications.',
    category: 'System',
    model: 'GPT-4o',
    tags: ['monitoring', 'observability', 'ops'],
    template: `Design a monitoring and alerting strategy for: {{system_description}}

Current stack: {{tech_stack}}
Scale: {{scale}} (e.g. "10K req/day", "1M users", "50 microservices")
Current pain points: {{pain_points}}
Budget: {{budget}} (e.g. "OSS only", "up to $500/month", "enterprise tools available")

Design:
1. **Key metrics** — what to track (RED: Rate, Errors, Duration + system-specific)
2. **Logging strategy** — structured logging format and retention
3. **Distributed tracing** — where to add trace IDs
4. **Dashboards** — which Grafana/Datadog panels to build first
5. **Alerting rules** — specific thresholds and PagerDuty/Slack routing
6. **Runbooks** — template for on-call response to top 3 alert types
7. **Recommended tools** — specific products for this stack and budget`,
  },
];

const CATEGORIES: Category[] = ['Code', 'Writing', 'Analysis', 'Data', 'Debug', 'System'];

const CATEGORY_ICONS: Record<Category, string> = {
  Code: '⌨️',
  Writing: '✍️',
  Analysis: '🔍',
  Data: '📊',
  Debug: '🐛',
  System: '⚙️',
};

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  const unique = [...new Set(matches.map(m => m.slice(2, -2)))];
  return unique;
}

function applyVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  Object.entries(vars).forEach(([k, v]) => {
    result = result.replaceAll(`{{${k}}}`, v || `{{${k}}}`);
  });
  return result;
}

export default function AiPromptTemplateLibrary() {
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0].id);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    return TEMPLATES.filter(t => {
      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q)) || t.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const selected = TEMPLATES.find(t => t.id === selectedId) || TEMPLATES[0];
  const templateVars = extractVariables(selected.template);
  const finalPrompt = applyVariables(selected.template, variables);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setVariables({});
    setCopied(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(finalPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const setVar = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT: Browse panel */}
      <div class="lg:col-span-2 space-y-3">
        {/* Category tabs */}
        <div class="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory('All')}
            class={`px-2.5 py-1 rounded text-xs border transition-colors ${activeCategory === 'All'
              ? 'border-accent bg-accent/10 text-accent font-medium'
              : 'border-border text-text-muted hover:bg-surface'}`}
          >
            All ({TEMPLATES.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              class={`px-2.5 py-1 rounded text-xs border transition-colors ${activeCategory === cat
                ? 'border-accent bg-accent/10 text-accent font-medium'
                : 'border-border text-text-muted hover:bg-surface'}`}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search templates..."
          class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {/* Template list */}
        <div class="space-y-1 max-h-[520px] overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p class="text-sm text-text-muted text-center py-6">No templates match your search.</p>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              class={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedId === t.id
                ? 'border-accent bg-accent/10'
                : 'border-border hover:bg-surface hover:border-border'}`}
            >
              <div class="flex items-start gap-2">
                <span class="text-base mt-0.5">{CATEGORY_ICONS[t.category]}</span>
                <div class="flex-1 min-w-0">
                  <p class={`text-sm font-medium truncate ${selectedId === t.id ? 'text-accent' : 'text-text'}`}>
                    {t.title}
                  </p>
                  <p class="text-xs text-text-muted truncate mt-0.5">{t.description}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-text-muted opacity-60">{t.model}</span>
                    {t.tags.slice(0, 2).map(tag => (
                      <span key={tag} class="text-xs px-1 bg-surface-alt border border-border rounded text-text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: Selected template */}
      <div class="lg:col-span-3 space-y-4">
        {/* Template header */}
        <div>
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h2 class="text-base font-bold text-text">{selected.title}</h2>
            <span class="text-xs px-2 py-0.5 bg-surface border border-border rounded text-text-muted">
              {selected.category}
            </span>
            <span class="text-xs px-2 py-0.5 bg-accent/10 border border-accent/30 rounded text-accent">
              {selected.model}
            </span>
          </div>
          <p class="text-sm text-text-muted">{selected.description}</p>
        </div>

        {/* Variable substitution */}
        {templateVars.length > 0 && (
          <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
            <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Fill in variables</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templateVars.map(v => (
                <div key={v}>
                  <label class="block text-xs text-text-muted mb-1">
                    <code class="font-mono text-accent">{`{{${v}}}`}</code>
                  </label>
                  <input
                    type="text"
                    value={variables[v] || ''}
                    onInput={e => setVar(v, (e.target as HTMLInputElement).value)}
                    placeholder={v.replace(/_/g, ' ')}
                    class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-text-muted font-medium">
              {templateVars.length > 0 ? 'Preview (with your variables)' : 'Prompt template'}
            </p>
            <button
              onClick={copy}
              class="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap">
            {finalPrompt}
          </pre>
        </div>

        {/* Tags */}
        <div class="flex flex-wrap gap-1.5">
          {selected.tags.map(tag => (
            <button
              key={tag}
              onClick={() => { setSearch(tag); setActiveCategory('All'); }}
              class="text-xs px-2 py-0.5 bg-surface-alt border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
