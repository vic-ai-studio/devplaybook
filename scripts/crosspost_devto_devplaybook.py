"""
DevPlaybook → Dev.to 交叉發文腳本
從 devplaybook/src/content/blog/ 讀取 Markdown 文章，透過 Dev.to API 發布。
canonical_url 指回 devplaybook.cc，自動加 Gumroad CTA。

用法：
  python scripts/crosspost_devto_devplaybook.py --list
  python scripts/crosspost_devto_devplaybook.py --dry-run
  python scripts/crosspost_devto_devplaybook.py --slug claude-code-vs-cursor-vs-copilot
  python scripts/crosspost_devto_devplaybook.py  # 發布全部 AI 優先文章
"""

import os
import re
import json
import sys
import argparse
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# === 設定 ===
PROJECT_ROOT = Path(__file__).parent.parent
BLOG_DIR = PROJECT_ROOT / "src" / "content" / "blog"
STATE_FILE = PROJECT_ROOT / "scripts" / "devto_devplaybook_published.json"
SITE_URL = "https://devplaybook.cc"
DEVTO_API_URL = "https://dev.to/api/articles"
ENV_FILE = PROJECT_ROOT.parent / ".env"

# AI/Claude Code 優先文章（5 篇，依 VIC-97 指定）
AI_PRIORITY_SLUGS = [
    "claude-code-vs-cursor-vs-copilot",
    "best-ai-coding-assistants-2025-claude-copilot-cursor",
    "build-your-first-ai-agent",
    "github-copilot-vs-claude-vs-chatgpt-best-ai-coding-assistant",
    "how-to-use-claude-api-complete-guide-developers",
]

# Gumroad CTA（DevPlaybook 版本）
GUMROAD_CTA = """

---

## Level Up Your Dev Workflow

Found this useful? Explore [DevPlaybook](https://devplaybook.cc) — cheat sheets, tool comparisons, and hands-on guides for modern developers.

🛒 **[Get the DevToolkit Starter Kit on Gumroad](https://devtoolkit.gumroad.com)** — 40+ browser-based dev tools, source code + deployment guide included.
"""

# slug → Dev.to tags
TAG_RULES = {
    "claude": ["claudecode", "ai", "programming", "devtools", "productivity"],
    "cursor": ["cursor", "ai", "programming", "devtools", "productivity"],
    "copilot": ["githubcopilot", "ai", "programming", "devtools", "productivity"],
    "ai-agent": ["ai", "programming", "machinelearning", "tutorial", "devtools"],
    "build-your-first-ai": ["ai", "programming", "tutorial", "machinelearning", "beginners"],
    "openai": ["openai", "ai", "api", "programming", "tutorial"],
    "vscode": ["vscode", "devtools", "programming", "productivity", "editors"],
    "git": ["git", "programming", "devops", "tutorial", "productivity"],
    "json": ["json", "webdev", "programming", "devtools", "tutorial"],
    "api": ["api", "webdev", "programming", "rest", "tutorial"],
    "docker": ["docker", "devops", "programming", "tutorial", "containers"],
    "javascript": ["javascript", "webdev", "programming", "tutorial", "beginners"],
    "typescript": ["typescript", "javascript", "webdev", "programming", "tutorial"],
    "python": ["python", "programming", "tutorial", "beginners", "devtools"],
    "css": ["css", "webdev", "frontend", "design", "tutorial"],
    "sql": ["sql", "database", "programming", "tutorial", "devtools"],
}
DEFAULT_TAGS = ["webdev", "programming", "devtools", "productivity", "tutorial"]


def get_api_key():
    key = os.environ.get("DEVTO_API_KEY")
    if key:
        return key
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("DEVTO_API_KEY="):
                return line.split("=", 1)[1].strip()
    return None


def load_published_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_published_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_markdown_article(filepath):
    """Parse markdown frontmatter + body from devplaybook blog post."""
    text = filepath.read_text(encoding="utf-8")

    # Extract frontmatter
    fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', text, re.DOTALL)
    if not fm_match:
        return None

    frontmatter_raw = fm_match.group(1)
    body = fm_match.group(2).strip()

    # Parse frontmatter fields
    title_match = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', frontmatter_raw, re.MULTILINE)
    desc_match = re.search(r'^description:\s*["\']?(.*?)["\']?\s*$', frontmatter_raw, re.MULTILINE)
    date_match = re.search(r'^date:\s*["\']?(.*?)["\']?\s*$', frontmatter_raw, re.MULTILINE)

    if not title_match:
        return None

    title = title_match.group(1).strip().strip('"\'')
    description = desc_match.group(1).strip().strip('"\'') if desc_match else ""
    publish_date = date_match.group(1).strip().strip('"\'') if date_match else ""

    slug = filepath.stem  # filename without .md

    # Add Gumroad CTA to body
    body_with_cta = body + GUMROAD_CTA

    return {
        "title": title,
        "description": description,
        "slug": slug,
        "publish_date": publish_date,
        "body_markdown": body_with_cta,
    }


def get_tags_for_slug(slug):
    slug_lower = slug.lower()
    for keyword, tags in TAG_RULES.items():
        if keyword in slug_lower:
            return tags[:4]
    return DEFAULT_TAGS[:4]


def devto_api_request(method, url, api_key, data=None, max_retries=3):
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DevPlaybook-CrossPoster/1.0",
    }
    body = json.dumps(data).encode("utf-8") if data else None

    for attempt in range(max_retries):
        req = Request(url, data=body, headers=headers, method=method)
        try:
            with urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            if e.code == 429 and attempt < max_retries - 1:
                wait = 60 * (attempt + 1)
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            print(f"  API error {e.code}: {error_body}")
            return None


def publish_to_devto(article, api_key, dry_run=False):
    canonical_url = f"{SITE_URL}/blog/{article['slug']}"
    tags = get_tags_for_slug(article["slug"])

    payload = {
        "article": {
            "title": article["title"],
            "body_markdown": article["body_markdown"],
            "published": False,
            "canonical_url": canonical_url,
            "description": article["description"],
            "tags": tags,
        }
    }

    print(f"  Title: {article['title']}")
    print(f"  Canonical: {canonical_url}")
    print(f"  Tags: {', '.join(tags)}")

    if dry_run:
        print("  [DRY RUN] Skipping actual publish")
        return {"id": "dry-run", "url": "dry-run"}

    # Step 1: Create draft
    result = devto_api_request("POST", DEVTO_API_URL, api_key, payload)
    if not result:
        return None

    article_id = result.get("id")
    print(f"  Draft created: id={article_id}")

    # Step 2: Publish draft
    publish_payload = {"article": {"published": True}}
    result = devto_api_request("PUT", f"{DEVTO_API_URL}/{article_id}", api_key, publish_payload)
    if result:
        print(f"  Published: {result.get('url', 'N/A')}")
    return result


def list_all_posts():
    posts = []
    for f in sorted(BLOG_DIR.glob("*.md")):
        article = parse_markdown_article(f)
        if article:
            posts.append(article)
    return posts


def main():
    parser = argparse.ArgumentParser(description="DevPlaybook → Dev.to crossposting tool")
    parser.add_argument("--slug", help="Publish only this slug")
    parser.add_argument("--list", action="store_true", help="List all articles with status")
    parser.add_argument("--dry-run", action="store_true", help="Preview without publishing")
    parser.add_argument("--force", action="store_true", help="Force re-publish already published articles")
    parser.add_argument("--all", action="store_true", help="Publish all articles (not just AI priority)")
    args = parser.parse_args()

    all_posts = list_all_posts()
    published = load_published_state()

    if args.list:
        print(f"Total {len(all_posts)} articles:\n")
        for p in all_posts:
            ai_flag = " [AI]" if p["slug"] in AI_PRIORITY_SLUGS else ""
            status = "✓ published" if p["slug"] in published else "○ unpublished"
            print(f"  {status}{ai_flag}  {p['slug']}")
        print(f"\nAI priority slugs ({len(AI_PRIORITY_SLUGS)}):")
        for slug in AI_PRIORITY_SLUGS:
            exists = any(p["slug"] == slug for p in all_posts)
            status = "✓" if slug in published else ("○" if exists else "✗ MISSING")
            print(f"  {status}  {slug}")
        return

    api_key = get_api_key()
    if not api_key and not args.dry_run:
        print("Error: DEVTO_API_KEY not found in env or .env file")
        sys.exit(1)

    # Select articles to publish
    if args.slug:
        to_publish = [p for p in all_posts if p["slug"] == args.slug]
    elif args.all:
        to_publish = [p for p in all_posts if p["slug"] not in published or args.force]
    else:
        # Default: AI priority list only
        slug_map = {p["slug"]: p for p in all_posts}
        to_publish = []
        for slug in AI_PRIORITY_SLUGS:
            if slug in slug_map and (slug not in published or args.force):
                to_publish.append(slug_map[slug])

    if not to_publish:
        print("No new articles to publish.")
        return

    print(f"Publishing {len(to_publish)} article(s) to Dev.to\n")

    success_count = 0
    for i, article in enumerate(to_publish):
        print(f"[{i+1}/{len(to_publish)}] Publishing: {article['slug']}")
        result = publish_to_devto(article, api_key, dry_run=args.dry_run)

        if result:
            published[article["slug"]] = {
                "devto_id": result.get("id"),
                "devto_url": result.get("url"),
                "published_at": article.get("publish_date", ""),
            }
            success_count += 1

        if i < len(to_publish) - 1:
            time.sleep(10)

    if not args.dry_run:
        save_published_state(published)

    print(f"\nDone: {success_count}/{len(to_publish)} published successfully")


if __name__ == "__main__":
    main()
