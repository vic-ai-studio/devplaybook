---
title: "Linux Command Line Basics: 15 Commands You Need to Know"
description: "Master 15 essential Linux terminal commands for navigation, file management, text processing, permissions, and process control — with practical examples."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["linux", "command-line", "terminal", "bash", "developer-tools"]
readingTime: "9 min read"
---

The Linux command line looks intimidating until you realize most day-to-day work uses maybe 20 commands. Here are the 15 you'll reach for constantly — whether you're managing servers, writing scripts, or just navigating your development environment.

## Navigation

### 1. `ls` — List Files

```bash
ls                   # list current directory
ls -la               # long format, including hidden files
ls -lh               # human-readable file sizes
ls -lt               # sorted by modification time (newest first)
ls /var/log          # list a specific path
```

`-la` is the most common combination. The `a` flag shows dotfiles (hidden files starting with `.`), which are easy to miss without it.

### 2. `cd` — Change Directory

```bash
cd /var/log          # absolute path
cd logs              # relative path
cd ..                # go up one level
cd ../..             # go up two levels
cd ~                 # go to home directory
cd -                 # go to previous directory
```

`cd -` is underused — it flips you back to wherever you just were, like undo for navigation.

### 3. `pwd` — Print Working Directory

```bash
pwd
# /home/alice/projects/myapp
```

Simple but essential when you're deep in a directory tree and need to confirm your location or copy the full path.

## File Management

### 4. `cp` — Copy

```bash
cp file.txt backup.txt          # copy file
cp -r src/ dest/                # copy directory recursively
cp -p file.txt dest/            # preserve timestamps/permissions
```

Always use `-r` for directories. Without it, `cp` will fail with "omitting directory."

### 5. `mv` — Move / Rename

```bash
mv old.txt new.txt              # rename a file
mv file.txt /tmp/               # move to directory
mv *.log /var/archive/          # move multiple files
```

`mv` is how you rename files on Linux — there's no separate "rename" command for single files.

### 6. `rm` — Remove

```bash
rm file.txt                     # delete a file
rm -r old-project/              # delete directory recursively
rm -rf node_modules/            # force delete without prompts
```

**Warning:** `rm` is permanent — no trash bin. Double-check your path before running `rm -rf`. A wrong directory can be catastrophic.

### 7. `mkdir` — Make Directory

```bash
mkdir logs                      # create a directory
mkdir -p src/components/ui      # create nested directories at once
```

`-p` creates all intermediate directories and doesn't error if they already exist. Use it in scripts to be safe.

## Viewing File Contents

### 8. `cat` — Concatenate / View

```bash
cat config.json                 # print entire file
cat file1.txt file2.txt         # concatenate and print both
cat -n script.sh                # show line numbers
```

For large files, `cat` dumps everything at once. Use `less` for paginated viewing.

### 9. `less` — Paginated View

```bash
less /var/log/syslog
```

Controls: `Space` = next page, `b` = back, `/pattern` = search, `n` = next match, `q` = quit.

Use `less` instead of `cat` for anything more than a few screenfulls.

### 10. `grep` — Search File Contents

```bash
grep "error" app.log                    # find lines containing "error"
grep -i "warning" app.log               # case-insensitive
grep -r "TODO" src/                     # recursive search in directory
grep -n "function" script.js            # show line numbers
grep -v "debug" app.log                 # lines NOT containing "debug"
grep -c "404" access.log                # count matching lines
```

`grep -r` is essential for searching codebases. Combine with `-i` for case-insensitive search and `-n` to jump to exact line numbers.

## Text Processing

### 11. `find` — Find Files

```bash
find . -name "*.log"                    # find by filename pattern
find /var -name "*.conf" -type f        # files only (not dirs)
find . -newer reference.txt            # files modified more recently
find . -size +10M                       # files larger than 10MB
find . -name "*.tmp" -delete            # find and delete
```

`find` searches recursively from the given path. The `-type f` flag is important — without it you'll get directory matches too.

### 12. `tail` — View End of File

```bash
tail -n 50 app.log                      # last 50 lines
tail -f /var/log/nginx/access.log       # follow in real-time
tail -f app.log | grep "ERROR"          # follow and filter
```

`tail -f` is your primary tool for monitoring log files as they grow. Combine with `grep` to filter noise.

## System and Processes

### 13. `ps` — Process Status

```bash
ps aux                          # all running processes
ps aux | grep nginx             # find a specific process
ps -ef --sort=-%mem | head -10  # top 10 memory consumers
```

`ps aux` output columns: USER, PID, %CPU, %MEM, COMMAND. The PID (process ID) is what you need for `kill`.

### 14. `kill` — Stop a Process

```bash
kill 1234                       # graceful stop (SIGTERM)
kill -9 1234                    # force kill (SIGKILL)
killall nginx                   # kill all processes named "nginx"
pkill -f "python app.py"        # kill by pattern matching command
```

Always try `kill PID` (SIGTERM) first — it lets the process clean up. Use `kill -9` only when the process won't respond to SIGTERM.

## Permissions

### 15. `chmod` — Change File Permissions

```bash
chmod +x script.sh              # make executable
chmod 644 config.json           # owner read/write, others read-only
chmod 755 deploy.sh             # owner full, others read+execute
chmod -R 755 public/            # recursive
```

**Octal notation:** Each digit represents owner/group/others. Values add up: read=4, write=2, execute=1.
- `755` = owner: 4+2+1=7 (full), group: 4+0+1=5, others: 4+0+1=5
- `644` = owner: 4+2=6, group: 4, others: 4

A script that won't run (`permission denied`) almost always needs `chmod +x`.

## Combining Commands

The real power of the command line is chaining tools together with pipes (`|`) and redirects (`>`).

```bash
# Find all error lines and count them
grep "ERROR" app.log | wc -l

# Monitor a log for errors in real-time
tail -f app.log | grep --line-buffered "ERROR"

# Find large files and sort by size
find . -type f -size +1M | xargs ls -lh | sort -k5 -h

# Save command output to file
ps aux > process-snapshot.txt

# Append to existing file
echo "$(date): deployment started" >> deploy.log
```

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `ls -la` | List all files with details |
| `cd -` | Jump to previous directory |
| `cp -r src/ dest/` | Copy directory |
| `rm -rf dir/` | Force-delete directory |
| `mkdir -p a/b/c` | Create nested dirs |
| `grep -r "term" .` | Search all files |
| `tail -f app.log` | Follow log in real-time |
| `find . -name "*.log"` | Find files by pattern |
| `kill -9 PID` | Force-kill process |
| `chmod +x script.sh` | Make script executable |

These 15 commands form the foundation of everything else you'll do on Linux. Once they're muscle memory, you'll move through the terminal as naturally as a file explorer — and faster.
