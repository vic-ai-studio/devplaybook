---
title: "The Ultimate Git Commands Cheatsheet (2026)"
description: "Master every essential Git command with real-world examples. From basics to advanced branching, stashing, rebasing, and recovery — your complete Git reference for 2026."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["git", "version-control", "cheatsheet", "command-line", "developer-tools"]
readingTime: "12 min read"
---

Git is the backbone of modern software development. Whether you are a solo developer or part of a 500-person engineering team, the same core commands move your code from idea to production. This cheatsheet covers every essential Git command you will reach for daily — organized by category, with real examples you can copy directly into your terminal.

Bookmark this page. You will be back.

> Want an interactive experience? Try our [Git Cheatsheet Interactive Tool](/tools/git-cheatsheet-interactive) and [Git Command Builder](/tools/git-command-builder).

---

## Setup & Configuration

```bash
# Set your identity (required for commits)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Set preferred editor
git config --global core.editor "code --wait"

# View all config
git config --list

# View a specific setting
git config user.email
```

**Pro tip:** Use `--global` for machine-wide settings and omit it for per-repo overrides.

---

## Repository Initialization

```bash
# Create a new repo
git init

# Clone an existing repo
git clone https://github.com/user/repo.git

# Clone to a specific folder
git clone https://github.com/user/repo.git my-folder

# Clone only the latest commit (shallow clone — fast!)
git clone --depth=1 https://github.com/user/repo.git
```

---

## Staging & Committing

```bash
# Check working tree status
git status

# Stage a specific file
git add index.js

# Stage all changes
git add .

# Stage only parts of a file (interactive)
git add -p

# Commit staged changes
git commit -m "feat: add user authentication"

# Stage and commit tracked files in one shot
git commit -am "fix: resolve null pointer in parser"

# Amend last commit (before pushing!)
git commit --amend -m "fix: correct error message"

# Create empty commit (useful for triggering CI)
git commit --allow-empty -m "chore: trigger deploy"
```

### Writing Good Commit Messages

Follow the **Conventional Commits** spec:

```
<type>(<scope>): <description>

feat: new feature
fix: bug fix
docs: documentation only
style: formatting, no logic change
refactor: refactoring, no behavior change
test: adding tests
chore: maintenance
```

---

## Branching

```bash
# List all local branches
git branch

# List all branches (local + remote)
git branch -a

# Create a new branch
git branch feature/login

# Switch to a branch
git checkout feature/login

# Create and switch in one command
git checkout -b feature/login

# Modern syntax (Git 2.23+)
git switch -c feature/login

# Rename current branch
git branch -m new-name

# Delete a merged branch
git branch -d feature/login

# Force delete (unmerged)
git branch -D feature/login

# Delete remote branch
git push origin --delete feature/login
```

---

## Merging & Rebasing

```bash
# Merge a branch into current
git merge feature/login

# Merge without fast-forward (preserves history)
git merge --no-ff feature/login

# Rebase current branch onto main
git rebase main

# Interactive rebase (edit last 3 commits)
git rebase -i HEAD~3

# Abort a rebase in progress
git rebase --abort

# Continue after resolving conflicts
git rebase --continue

# Cherry-pick a specific commit
git cherry-pick a1b2c3d4
```

**Merge vs. Rebase:** Use merge for feature branches to preserve history. Use rebase for a clean, linear commit history on long-running branches.

---

## Remote Operations

```bash
# List remotes
git remote -v

# Add a remote
git remote add origin https://github.com/user/repo.git

# Fetch updates (no merge)
git fetch origin

# Pull (fetch + merge)
git pull origin main

# Pull with rebase (cleaner history)
git pull --rebase origin main

# Push to remote
git push origin feature/login

# Push and set upstream
git push -u origin feature/login

# Force push (use carefully!)
git push --force-with-lease origin feature/login
```

**Always use `--force-with-lease` instead of `-f`.** It protects you from overwriting others' pushes.

---

## Stashing

```bash
# Save current changes to stash
git stash

# Stash with a description
git stash push -m "wip: half-done login form"

# List all stashes
git stash list

# Apply the most recent stash
git stash pop

# Apply a specific stash
git stash apply stash@{2}

# Delete a stash
git stash drop stash@{0}

# Clear all stashes
git stash clear

# Stash including untracked files
git stash -u
```

---

## Viewing History

```bash
# View commit log
git log

# Compact one-line log
git log --oneline

# Log with branch graph
git log --oneline --graph --all

# Show changes in a commit
git show a1b2c3d4

# Show who changed each line
git blame src/auth.js

# Search commits by message
git log --grep="authentication"

# Search commits by code change
git log -S "function login"

# Show commits between dates
git log --after="2026-01-01" --before="2026-03-01"
```

---

## Undoing Changes

```bash
# Discard changes in working directory
git restore index.js

# Unstage a file (keep changes)
git restore --staged index.js

# Revert a commit (creates new commit)
git revert a1b2c3d4

# Reset to a previous commit (keep changes staged)
git reset --soft HEAD~1

# Reset to a previous commit (keep changes unstaged)
git reset --mixed HEAD~1

# Reset and DISCARD all changes (dangerous!)
git reset --hard HEAD~1

# Recover a deleted branch or commit
git reflog
git checkout -b recovered HEAD@{3}
```

**Rule of thumb:** `revert` for shared branches, `reset` for local-only changes.

---

## Tags

```bash
# List tags
git tag

# Create a lightweight tag
git tag v1.0.0

# Create an annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Tag a specific commit
git tag -a v1.0.0 a1b2c3d4 -m "Release"

# Push tags to remote
git push origin --tags

# Delete a local tag
git tag -d v1.0.0

# Delete a remote tag
git push origin --delete v1.0.0
```

---

## Searching & Filtering

```bash
# Search working directory for a string
git grep "TODO"

# Search with line numbers
git grep -n "function render"

# Find commits that introduced a bug (binary search)
git bisect start
git bisect bad                  # current commit is broken
git bisect good v2.0.0          # last known good tag
# Git checks out middle commit — test it, then:
git bisect good                 # or: git bisect bad
# Repeat until the culprit commit is found
git bisect reset
```

---

## Advanced Tricks

```bash
# See what changed between two branches
git diff main..feature/login

# See only filenames that changed
git diff --name-only main..feature/login

# Clean untracked files (dry run first!)
git clean -n
git clean -fd

# Store credentials temporarily
git config --global credential.helper cache

# Apply a patch file
git apply patch.diff

# Create a patch from commits
git format-patch HEAD~3
```

---

## Aliases (Speed Up Your Workflow)

Add these to your `~/.gitconfig`:

```ini
[alias]
  st = status
  co = checkout
  br = branch
  lg = log --oneline --graph --all
  undo = reset --soft HEAD~1
  unstage = restore --staged
  today = log --since=midnight --oneline
```

Now `git lg` shows a beautiful branch graph in one line.

---

## Most Common Workflows

### Start a Feature

```bash
git checkout main && git pull
git checkout -b feature/my-feature
# ... do work ...
git add . && git commit -m "feat: implement feature"
git push -u origin feature/my-feature
```

### Fix a Bug on Production

```bash
git checkout main && git pull
git checkout -b hotfix/critical-bug
# ... fix ...
git commit -am "fix: resolve payment crash"
git checkout main && git merge --no-ff hotfix/critical-bug
git tag -a v1.2.1 -m "Hotfix release"
git push && git push --tags
```

### Recover a Deleted Branch

```bash
git reflog
# Find the SHA of the last commit on the deleted branch
git checkout -b recovered-branch a1b2c3d4
```

---

## Quick Reference Card

| Command | What it does |
|---|---|
| `git status` | Show working tree status |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Commit with message |
| `git push` | Push to remote |
| `git pull` | Fetch + merge |
| `git checkout -b branch` | Create + switch branch |
| `git merge branch` | Merge branch into current |
| `git stash` | Save uncommitted changes |
| `git log --oneline` | Compact history |
| `git reset --soft HEAD~1` | Undo last commit, keep changes |
| `git revert HEAD` | Safely undo a commit |
| `git reflog` | See all recent HEAD positions |

---

Git mastery comes from repetition. Run these commands, break things in a test repo, and recover from them. The confidence you build is worth it.

Want to generate commit messages automatically? Try our [AI Commit Generator](/tools/ai-commit-generator) — it reads your diff and writes the message for you.
