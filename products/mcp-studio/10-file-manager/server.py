"""
MCP Server: File Manager
Browse, search, read, organize, and transform files on the local filesystem.
"""

import json
import hashlib
import mimetypes
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("file-manager")

# Safety: restrict operations to a base directory
BASE_DIR = os.environ.get("FILE_MANAGER_BASE_DIR", os.path.expanduser("~"))
MAX_FILE_READ_BYTES = 1_000_000  # 1 MB max read
MAX_SEARCH_RESULTS = 100


def _safe_path(path: str) -> Path:
    """Resolve a path and ensure it's within BASE_DIR."""
    resolved = Path(BASE_DIR, path).resolve()
    base = Path(BASE_DIR).resolve()
    if not str(resolved).startswith(str(base)):
        raise ValueError(f"Access denied: path is outside the allowed directory ({BASE_DIR}).")
    return resolved


def _file_info(p: Path) -> dict[str, Any]:
    """Get metadata for a file or directory."""
    try:
        stat = p.stat()
        info: dict[str, Any] = {
            "name": p.name,
            "path": str(p),
            "type": "directory" if p.is_dir() else "file",
            "size_bytes": stat.st_size if p.is_file() else None,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        }
        if p.is_file():
            info["extension"] = p.suffix
            info["mime_type"] = mimetypes.guess_type(str(p))[0]
            if stat.st_size < 1024:
                info["size_display"] = f"{stat.st_size} B"
            elif stat.st_size < 1024 * 1024:
                info["size_display"] = f"{stat.st_size / 1024:.1f} KB"
            elif stat.st_size < 1024 * 1024 * 1024:
                info["size_display"] = f"{stat.st_size / (1024 * 1024):.1f} MB"
            else:
                info["size_display"] = f"{stat.st_size / (1024 * 1024 * 1024):.2f} GB"
        return info
    except OSError as e:
        return {"name": p.name, "path": str(p), "error": str(e)}


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def list_directory(
    path: str = ".",
    show_hidden: bool = False,
    sort_by: str = "name",
) -> str:
    """List contents of a directory.

    Args:
        path: Directory path relative to base dir (use '.' for root).
        show_hidden: Include hidden files (starting with '.').
        sort_by: Sort by: 'name', 'size', 'modified', 'type'.
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists():
        return json.dumps({"error": f"Directory not found: {path}"})
    if not target.is_dir():
        return json.dumps({"error": f"Not a directory: {path}"})

    entries = []
    total_size = 0
    try:
        for item in target.iterdir():
            if not show_hidden and item.name.startswith("."):
                continue
            info = _file_info(item)
            entries.append(info)
            if item.is_file():
                total_size += item.stat().st_size
    except PermissionError:
        return json.dumps({"error": f"Permission denied: {path}"})

    # Sort
    if sort_by == "size":
        entries.sort(key=lambda x: x.get("size_bytes") or 0, reverse=True)
    elif sort_by == "modified":
        entries.sort(key=lambda x: x.get("modified", ""), reverse=True)
    elif sort_by == "type":
        entries.sort(key=lambda x: (0 if x["type"] == "directory" else 1, x["name"]))
    else:
        entries.sort(key=lambda x: (0 if x["type"] == "directory" else 1, x["name"].lower()))

    dirs = sum(1 for e in entries if e["type"] == "directory")
    files = len(entries) - dirs

    return json.dumps({
        "path": str(target),
        "directories": dirs,
        "files": files,
        "total_size_bytes": total_size,
        "entries": entries,
    }, indent=2)


@server.tool()
async def read_file(path: str, encoding: str = "utf-8", max_lines: int = 0) -> str:
    """Read the contents of a text file.

    Args:
        path: File path relative to base dir.
        encoding: File encoding (default: utf-8).
        max_lines: Maximum lines to read (0 = all, up to size limit).
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists():
        return json.dumps({"error": f"File not found: {path}"})
    if not target.is_file():
        return json.dumps({"error": f"Not a file: {path}"})
    if target.stat().st_size > MAX_FILE_READ_BYTES:
        return json.dumps({
            "error": f"File too large ({target.stat().st_size} bytes). Max: {MAX_FILE_READ_BYTES} bytes.",
            "suggestion": "Use search_in_file to find specific content, or read with max_lines.",
        })

    try:
        content = target.read_text(encoding=encoding, errors="replace")
        lines = content.split("\n")
        total_lines = len(lines)

        if max_lines > 0:
            lines = lines[:max_lines]
            content = "\n".join(lines)

        info = _file_info(target)
        return json.dumps({
            "file": info,
            "total_lines": total_lines,
            "showing_lines": len(lines),
            "content": content,
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to read file: {str(e)}"})


@server.tool()
async def search_files(
    query: str,
    path: str = ".",
    file_extension: str = "",
    max_results: int = 50,
) -> str:
    """Search for files by name pattern.

    Args:
        query: Search term to match in file/directory names.
        path: Directory to search in (recursive).
        file_extension: Filter by extension, e.g. '.py', '.json' (optional).
        max_results: Maximum results to return.
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists() or not target.is_dir():
        return json.dumps({"error": f"Directory not found: {path}"})

    q = query.lower()
    results = []
    searched = 0

    try:
        for item in target.rglob("*"):
            searched += 1
            if searched > 10000:
                break

            if q not in item.name.lower():
                continue
            if file_extension and item.suffix.lower() != file_extension.lower():
                continue

            results.append(_file_info(item))
            if len(results) >= min(max_results, MAX_SEARCH_RESULTS):
                break
    except PermissionError:
        pass

    results.sort(key=lambda x: x.get("modified", ""), reverse=True)
    return json.dumps({
        "query": query,
        "search_path": str(target),
        "files_scanned": searched,
        "results_found": len(results),
        "results": results,
    }, indent=2)


@server.tool()
async def search_in_file(
    path: str,
    pattern: str,
    context_lines: int = 2,
) -> str:
    """Search for a text pattern inside a file and return matching lines with context.

    Args:
        path: File path to search in.
        pattern: Text pattern to search for (case-insensitive).
        context_lines: Number of lines before/after each match to include.
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists() or not target.is_file():
        return json.dumps({"error": f"File not found: {path}"})
    if target.stat().st_size > MAX_FILE_READ_BYTES * 5:
        return json.dumps({"error": "File too large for content search."})

    try:
        lines = target.read_text(encoding="utf-8", errors="replace").split("\n")
    except Exception as e:
        return json.dumps({"error": f"Cannot read file: {str(e)}"})

    p = pattern.lower()
    matches = []

    for i, line in enumerate(lines):
        if p in line.lower():
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines + 1)
            context = []
            for j in range(start, end):
                context.append({
                    "line_number": j + 1,
                    "text": lines[j],
                    "is_match": j == i,
                })
            matches.append({
                "line_number": i + 1,
                "line": line.strip(),
                "context": context,
            })

    return json.dumps({
        "file": str(target),
        "pattern": pattern,
        "total_lines": len(lines),
        "matches_found": len(matches),
        "matches": matches[:50],
    }, indent=2)


@server.tool()
async def get_file_info(path: str) -> str:
    """Get detailed information about a file including hash and metadata.

    Args:
        path: File path.
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists():
        return json.dumps({"error": f"Not found: {path}"})

    info = _file_info(target)

    if target.is_file() and target.stat().st_size < MAX_FILE_READ_BYTES:
        content = target.read_bytes()
        info["md5"] = hashlib.md5(content).hexdigest()
        info["sha256"] = hashlib.sha256(content).hexdigest()

        # Line count for text files
        try:
            text = content.decode("utf-8", errors="replace")
            info["line_count"] = text.count("\n") + 1
            info["word_count"] = len(text.split())
            info["char_count"] = len(text)
        except Exception:
            pass

    if target.is_dir():
        file_count = sum(1 for _ in target.rglob("*") if _.is_file())
        dir_count = sum(1 for _ in target.rglob("*") if _.is_dir())
        total_size = sum(f.stat().st_size for f in target.rglob("*") if f.is_file())
        info["contains_files"] = file_count
        info["contains_dirs"] = dir_count
        info["total_size_bytes"] = total_size

    return json.dumps(info, indent=2)


@server.tool()
async def organize_files(
    source_path: str,
    organize_by: str = "extension",
    dry_run: bool = True,
) -> str:
    """Organize files in a directory into subdirectories by type or date.

    Args:
        source_path: Directory containing files to organize.
        organize_by: Strategy: 'extension' (by file type), 'date' (by modified date), 'size' (small/medium/large).
        dry_run: If true, preview changes without moving files. Set to false to execute.
    """
    try:
        target = _safe_path(source_path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists() or not target.is_dir():
        return json.dumps({"error": f"Directory not found: {source_path}"})

    moves: list[dict[str, str]] = []
    files = [f for f in target.iterdir() if f.is_file() and not f.name.startswith(".")]

    for f in files:
        if organize_by == "extension":
            ext = f.suffix.lower().lstrip(".") or "no-extension"
            dest_dir = target / ext
        elif organize_by == "date":
            mtime = datetime.fromtimestamp(f.stat().st_mtime)
            dest_dir = target / mtime.strftime("%Y-%m")
        elif organize_by == "size":
            size = f.stat().st_size
            if size < 100 * 1024:
                bucket = "small-under-100KB"
            elif size < 10 * 1024 * 1024:
                bucket = "medium-100KB-10MB"
            else:
                bucket = "large-over-10MB"
            dest_dir = target / bucket
        else:
            return json.dumps({"error": f"Unknown strategy: {organize_by}. Use: extension, date, size."})

        dest_file = dest_dir / f.name
        moves.append({
            "file": f.name,
            "from": str(f),
            "to": str(dest_file),
            "destination_folder": dest_dir.name,
        })

    if not dry_run:
        moved_count = 0
        errors = []
        for move in moves:
            try:
                dest = Path(move["to"])
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(move["from"], str(dest))
                moved_count += 1
            except OSError as e:
                errors.append({"file": move["file"], "error": str(e)})

        return json.dumps({
            "success": True,
            "files_moved": moved_count,
            "errors": errors,
            "organize_by": organize_by,
        }, indent=2)

    # Group preview
    by_folder: dict[str, list[str]] = {}
    for m in moves:
        folder = m["destination_folder"]
        by_folder.setdefault(folder, []).append(m["file"])

    return json.dumps({
        "dry_run": True,
        "total_files": len(moves),
        "organize_by": organize_by,
        "preview": {folder: {"count": len(files_list), "files": files_list[:5]} for folder, files_list in by_folder.items()},
        "note": "Set dry_run=false to execute these moves.",
    }, indent=2)


@server.tool()
async def get_directory_stats(path: str = ".") -> str:
    """Get statistics about a directory: file counts by type, size distribution, largest files.

    Args:
        path: Directory to analyze.
    """
    try:
        target = _safe_path(path)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    if not target.exists() or not target.is_dir():
        return json.dumps({"error": f"Directory not found: {path}"})

    by_extension: dict[str, dict[str, Any]] = {}
    largest_files: list[dict[str, Any]] = []
    total_size = 0
    file_count = 0
    dir_count = 0
    scanned = 0

    try:
        for item in target.rglob("*"):
            scanned += 1
            if scanned > 50000:
                break

            if item.is_dir():
                dir_count += 1
                continue

            file_count += 1
            size = item.stat().st_size
            total_size += size
            ext = item.suffix.lower() or "(no extension)"

            if ext not in by_extension:
                by_extension[ext] = {"count": 0, "total_size": 0}
            by_extension[ext]["count"] += 1
            by_extension[ext]["total_size"] += size

            largest_files.append({"name": item.name, "path": str(item), "size_bytes": size})
    except PermissionError:
        pass

    largest_files.sort(key=lambda x: x["size_bytes"], reverse=True)
    largest_files = largest_files[:10]

    for f in largest_files:
        s = f["size_bytes"]
        if s < 1024 * 1024:
            f["size_display"] = f"{s / 1024:.1f} KB"
        else:
            f["size_display"] = f"{s / (1024 * 1024):.1f} MB"

    top_extensions = sorted(by_extension.items(), key=lambda x: x[1]["count"], reverse=True)[:15]

    size_display = f"{total_size / (1024 * 1024):.1f} MB" if total_size > 1024 * 1024 else f"{total_size / 1024:.1f} KB"

    return json.dumps({
        "path": str(target),
        "total_files": file_count,
        "total_directories": dir_count,
        "total_size": size_display,
        "total_size_bytes": total_size,
        "by_extension": {ext: info for ext, info in top_extensions},
        "largest_files": largest_files,
        "scanned_items": scanned,
    }, indent=2)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
