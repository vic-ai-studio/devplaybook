# 07 — Content CMS MCP Server

A headless CMS for managing articles, categories, tags, and publishing workflows.

## Tools

| Tool | Description |
|------|-------------|
| `list_articles` | List/filter articles by status, category, tag, author |
| `create_article` | Create new articles with Markdown body, tags, categories |
| `update_article` | Edit title, body, status, tags, category |
| `get_article` | Retrieve full article content |
| `manage_categories` | List, create, or update content categories |
| `get_content_stats` | Article counts, word counts, top tags, author stats |
| `search_content` | Full-text search with relevance scoring and snippets |

## Example Prompts

- "Show me all draft articles"
- "Create an article about TypeScript best practices in the technology category"
- "Publish the article about SaaS pricing"
- "What are our most used tags?"
- "Search for articles about MCP"

## Customization

- **Real CMS**: Connect to WordPress, Strapi, Sanity, or Contentful APIs
- **Media management**: Add image upload and gallery tools
- **SEO**: Add meta tags, Open Graph, and sitemap generation
- **Workflow**: Add review/approval stages before publishing
- **Versioning**: Track article revision history

## Setup

```bash
pip install mcp pydantic
python server.py
```
