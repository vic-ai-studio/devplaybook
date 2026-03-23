# 10 — File Manager MCP Server

Browse, search, read, and organize files on the local filesystem through Claude.

## Safety

All operations are restricted to a configurable base directory (defaults to home directory). Set the `FILE_MANAGER_BASE_DIR` environment variable to limit access.

## Tools

| Tool | Description |
|------|-------------|
| `list_directory` | Browse directory contents with sorting options |
| `read_file` | Read text file contents with line limits |
| `search_files` | Recursive file name search with extension filtering |
| `search_in_file` | Grep-like content search with context lines |
| `get_file_info` | Detailed metadata: hashes, line counts, word counts |
| `organize_files` | Auto-organize files by extension, date, or size |
| `get_directory_stats` | Disk usage, file type breakdown, largest files |

## Example Prompts

- "Show me the files in my Documents folder"
- "Find all Python files in this project"
- "Search for 'TODO' in all .py files"
- "What are the largest files in my Downloads folder?"
- "Organize my Downloads folder by file type (dry run first)"
- "How much space is each file type using?"

## Environment Variables

- `FILE_MANAGER_BASE_DIR` — Root directory for all operations (default: home directory)

## Customization

- **Cloud storage**: Add S3, Google Drive, or Dropbox integration
- **File operations**: Add copy, move, rename, delete tools (with confirmation)
- **Compression**: Add zip/unzip capabilities
- **Preview**: Add image thumbnail generation
- **Monitoring**: Add file change watching

## Setup

```bash
pip install mcp pydantic
python server.py
```
