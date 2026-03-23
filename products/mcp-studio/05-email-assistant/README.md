# 05 — Email Assistant MCP Server

Compose, search, organize, and manage emails through Claude.

## Tools

| Tool | Description |
|------|-------------|
| `list_emails` | List emails by folder (inbox, sent, starred, archive, trash) |
| `read_email` | Read full email content and mark as read |
| `compose_email` | Write new emails, send or save as draft |
| `reply_to_email` | Reply with quoted original, send or save as draft |
| `search_emails` | Full-text search with sender/date/starred filters |
| `manage_email` | Star, archive, trash, mark read/unread |
| `get_email_stats` | Unread counts, folder sizes, 24h activity summary |

## Example Prompts

- "Show me unread emails in my inbox"
- "Read the email from Alice about the Q1 report"
- "Reply to Alice: Thanks, I'll review it by Thursday"
- "Compose an email to bob@example.com about the project deadline"
- "Archive all read emails from last week"
- "How many unread emails do I have?"

## Customization

- **Real email**: Replace the in-memory store with IMAP (reading) and SMTP (sending)
- **Multiple accounts**: Add account switching logic
- **Attachments**: Add attachment handling tools
- **Templates**: Add email template management
- **Scheduling**: Add scheduled send functionality

## Setup

```bash
pip install mcp pydantic
python server.py
```
