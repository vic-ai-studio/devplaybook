---
title: "Git Commands Cheat Sheet 2026: Every Command You'll Actually Use"
description: "A practical Git commands reference for 2026 — from daily workflow basics to branching strategies, rebasing, stashing, and fixing mistakes. With real examples."
date: "2026-03-25"
author: "DevPlaybook Team"
tags: ["git", "version-control", "developer-tools", "cheatsheet", "2026"]
readingTime: "14 min read"
---

Git has been the de facto version control system for over fifteen years, and yet most developers only ever use about 20% of its commands — usually the same handful of `add`, `commit`, and `push` on repeat. The other 80% is where the real power lives: rebasing history before a code review, stashing a half-finished idea while you hotfix production, cherry-picking a single commit from a colleague's branch, or using `reflog` to resurrect work you thought was gone forever.

This cheat sheet is built for daily use. Every command here is something you'll actually reach for — not academic edge cases, but the real Git surface area that professional developers work with across feature branches, code reviews, CI pipelines, and release workflows.

**The Git mental model in one sentence:** Git stores snapshots of your project, not diffs. Each commit is a complete picture of your entire tree at that point, linked by a chain of parent references. Branches are just lightweight pointers to commits. Once you internalize that, commands like `reset`, `rebase`, and `cherry-pick` go from mysterious to logical.

Let's get into it.

---

## Setup & Configuration

Before you write a single commit, get your config right. These settings follow you across every repository on your machine.

```bash
# Set your identity (required for commits)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Set your default editor (VS Code, vim, nano — pick your poison)
git config --global core.editor "code --wait"

# Set default branch name for new repos
git config --global init.defaultBranch main

# Enable color output
git config --global color.ui auto

# Cache credentials for 1 hour (useful for HTTPS remotes)
git config --global credential.helper 'cache --timeout=3600'

# Show config for the current repo
git config --list --local

# Show global config
git config --list --global

# Open the global .gitconfig in your editor
git config --global --edit
```

### Useful `.gitconfig` Defaults

A few settings that make Git dramatically less annoying:

```bash
# Automatically rebase on pull instead of merge
git config --global pull.rebase true

# Push only the current branch (safer than pushing all)
git config --global push.default current

# Enable rerere — remember how you resolved a conflict and replay it
git config --global rerere.enabled true

# Better diff algorithm (detects moved code correctly)
git config --global diff.algorithm histogram
```

---

## Daily Workflow Commands

These are the commands you'll run dozens of times a day.

```bash
# Check the state of your working tree
git status
git status -s          # Short/compact output

# Stage files for commit
git add filename.txt         # Stage a specific file
git add .                    # Stage everything in current directory
git add -p                   # Interactively stage hunks (review each change)

# Commit staged changes
git commit -m "feat: add user authentication"
git commit --amend           # Modify the last commit (message or content)
git commit --amend --no-edit # Amend last commit keeping the same message

# Push changes to remote
git push                     # Push current branch to its upstream
git push origin main         # Push to a specific branch on origin
git push -u origin feature/my-branch  # Push and set upstream tracking

# Pull changes from remote
git pull                     # Fetch + merge (or rebase if configured)
git pull --rebase            # Fetch + rebase (cleaner history)
git pull origin main         # Pull from a specific remote branch

# Fetch without merging
git fetch                    # Fetch all remotes
git fetch origin             # Fetch from origin only
git fetch --prune            # Fetch and remove deleted remote branches locally
```

### Viewing Status Efficiently

```bash
# Show what's different between working tree and last commit
git diff                     # Unstaged changes
git diff --staged            # Staged changes (what will go in next commit)
git diff HEAD                # All changes since last commit
git diff main..feature/auth  # Diff between two branches
```

---

## Branching & Merging

Branches in Git are cheap. Use them freely.

```bash
# List branches
git branch                   # Local branches
git branch -r                # Remote branches
git branch -a                # All branches

# Create and switch
git branch feature/login     # Create branch (don't switch)
git switch feature/login     # Switch to branch (modern syntax)
git switch -c feature/login  # Create and switch in one step
git checkout -b feature/login # Old syntax, same result

# Rename a branch
git branch -m old-name new-name
git branch -m new-name       # Rename the current branch

# Delete branches
git branch -d feature/done   # Safe delete (only if merged)
git branch -D feature/done   # Force delete (even if unmerged)
git push origin --delete feature/done  # Delete remote branch

# Merge
git merge feature/login      # Merge into current branch
git merge --no-ff feature/login  # Always create a merge commit
git merge --squash feature/login # Squash all commits into one staged change

# Abort a merge in progress
git merge --abort
```

### Resolving Merge Conflicts

When a merge conflict occurs, Git marks the file with conflict markers. After resolving:

```bash
# After editing the conflicted file to resolve it:
git add resolved-file.txt
git commit                   # Git fills in the merge commit message

# Or use a merge tool
git mergetool                # Opens your configured diff/merge tool
```

---

## Rebasing

Rebase is how you keep a clean, linear history. The golden rule: never rebase commits that have already been pushed to a shared branch.

```bash
# Basic rebase: replay your branch commits on top of main
git rebase main

# Abort a rebase in progress
git rebase --abort

# Continue after resolving conflicts during rebase
git rebase --continue

# Interactive rebase: rewrite the last N commits
git rebase -i HEAD~3         # Rewrite last 3 commits

# Rebase onto a specific commit
git rebase --onto main feature/base feature/top
```

### Interactive Rebase Actions

When you run `git rebase -i HEAD~5`, Git opens an editor with lines like:

```
pick a1b2c3 Add login page
pick d4e5f6 Fix typo in login
pick 7g8h9i Add tests for login
pick j0k1l2 WIP: still broken
pick m3n4o5 Fix broken thing
```

You can change `pick` to any of these actions:

```
pick    — keep the commit as-is
reword  — keep commit, edit the message
edit    — pause rebase here for manual changes
squash  — melt into the previous commit (combines messages)
fixup   — melt into previous commit (discard this commit's message)
drop    — delete this commit entirely
```

Practical example — squashing 3 WIP commits into one clean commit:

```
pick a1b2c3 Add login page
fixup d4e5f6 Fix typo in login
fixup j0k1l2 Fix broken thing
pick 7g8h9i Add tests for login
```

---

## Stashing

Stash is your escape hatch when you need to switch context without committing half-finished work.

```bash
# Stash current changes (tracked files only)
git stash

# Stash with a descriptive message
git stash push -m "WIP: half-finished auth refactor"

# Stash including untracked files
git stash push -u

# Stash including untracked AND ignored files
git stash push -a

# List all stashes
git stash list
# Output example:
# stash@{0}: WIP: half-finished auth refactor
# stash@{1}: On main: quick experiment

# Apply the most recent stash (keep it in stash list)
git stash apply

# Apply and remove from stash list
git stash pop

# Apply a specific stash by index
git stash apply stash@{2}

# Show what's in a stash without applying
git stash show -p stash@{0}

# Delete a specific stash
git stash drop stash@{1}

# Delete all stashes
git stash clear

# Create a branch from a stash (useful if stash no longer applies cleanly)
git stash branch feature/recovered-work stash@{0}
```

---

## History & Inspection

Understanding what happened and when is half the job.

```bash
# Basic log
git log
git log --oneline            # Compact one-line format
git log --oneline --graph    # ASCII branch graph
git log --oneline --graph --all  # Include all branches

# Filter log output
git log --author="Alice"
git log --since="2 weeks ago"
git log --until="2026-01-01"
git log --grep="fix:"         # Search commit messages
git log -S "function login"   # Find commits that added/removed this string (pickaxe)
git log -- path/to/file.js   # Show commits that touched a specific file

# Formatted log
git log --pretty=format:"%h %ad | %s%d [%an]" --date=short

# Inspect a specific commit
git show abc1234             # Show commit details and diff
git show HEAD                # Show the latest commit
git show HEAD~2              # Show 2 commits back

# Show who changed each line in a file
git blame path/to/file.js
git blame -L 10,20 file.js  # Blame only lines 10-20

# Compare files between commits/branches
git diff HEAD~1 HEAD -- file.js   # What changed in this file last commit
git diff main..feature/auth       # All changes between two branches

# The lifesaver: reflog
git reflog                   # See EVERY HEAD movement, even after resets
git reflog show feature/auth # Reflog for a specific branch
```

---

## Undoing Mistakes

Every developer deletes code they need, commits to the wrong branch, or pushes something they shouldn't. Here's how to recover.

```bash
# Unstage a file (keep changes in working tree)
git restore --staged filename.txt    # Modern syntax
git reset HEAD filename.txt          # Old syntax, same result

# Discard changes in working tree (DESTRUCTIVE — cannot undo)
git restore filename.txt
git checkout -- filename.txt         # Old syntax

# Undo the last commit, keep changes staged
git reset --soft HEAD~1

# Undo the last commit, keep changes unstaged
git reset --mixed HEAD~1    # Default behavior of git reset HEAD~1

# Undo the last commit, DISCARD all changes (DESTRUCTIVE)
git reset --hard HEAD~1

# Safely undo a commit by creating a new "reverse" commit
git revert HEAD              # Revert last commit
git revert abc1234           # Revert a specific commit
git revert HEAD~3..HEAD      # Revert a range of commits

# Remove untracked files and directories
git clean -n                 # Dry run — show what would be removed
git clean -f                 # Remove untracked files
git clean -fd                # Remove untracked files and directories
git clean -fdx               # Also remove ignored files

# Cherry-pick: apply a specific commit from another branch
git cherry-pick abc1234           # Apply one commit
git cherry-pick abc1234..def5678  # Apply a range of commits
git cherry-pick --no-commit abc1234  # Apply changes without committing

# Recover from a bad reset using reflog
git reflog                   # Find the SHA before the bad reset
git reset --hard HEAD@{3}    # Jump back to that state
```

---

## Remote Operations

Working with remotes goes well beyond `git push` and `git pull`.

```bash
# View remotes
git remote -v                # Show remote URLs
git remote show origin       # Detailed info about a remote

# Add and remove remotes
git remote add upstream https://github.com/original/repo.git
git remote remove upstream
git remote rename origin old-origin

# Fetch vs pull
git fetch origin             # Download changes, don't apply
git fetch --all              # Fetch from all remotes
git pull --rebase origin main  # Rebase local on top of remote

# Push options
git push origin main
git push --force-with-lease  # Safer force push (fails if remote has new commits)
git push --force             # Dangerous — overwrites remote history
git push origin --delete feature/old-branch  # Delete remote branch
git push --tags              # Push all local tags to remote

# Track a remote branch
git branch --set-upstream-to=origin/main main
git branch -u origin/feature/auth  # Short form

# See tracking relationships
git branch -vv
```

---

## Tags & Releases

Tags mark specific points in history — typically release versions.

```bash
# List tags
git tag
git tag -l "v1.*"            # Filter by pattern

# Create a lightweight tag (just a pointer)
git tag v1.0.0

# Create an annotated tag (has a message, tagger, date — use this for releases)
git tag -a v1.0.0 -m "Release version 1.0.0"
git tag -a v1.0.0 abc1234 -m "Tag a specific commit"

# Show tag details
git show v1.0.0

# Push tags to remote
git push origin v1.0.0       # Push a single tag
git push origin --tags       # Push all tags

# Delete a tag
git tag -d v0.9.0             # Delete local tag
git push origin --delete v0.9.0  # Delete remote tag

# Check out code at a tag (creates detached HEAD)
git checkout v1.0.0

# Create a branch from a tag
git checkout -b hotfix/v1.0.1 v1.0.0
```

---

## Git Aliases: A Starter `.gitconfig`

Aliases save hundreds of keystrokes per day. Add these to your `~/.gitconfig` under `[alias]`:

```ini
[alias]
  # Shortcuts
  st = status -s
  co = checkout
  sw = switch
  br = branch
  ci = commit
  cp = cherry-pick

  # Log views
  lg = log --oneline --graph --decorate --all
  last = log -1 HEAD --stat
  hist = log --pretty=format:'%h %ad | %s%d [%an]' --graph --date=short

  # Undo helpers
  unstage = restore --staged
  undo = reset --soft HEAD~1
  wipe = reset --hard HEAD

  # Stash shortcuts
  save = stash push -u -m
  pop = stash pop

  # Show aliases
  aliases = config --get-regexp alias

  # Find which branch contains a commit
  contains = branch --contains

  # Show files changed in last commit
  changed = diff --name-only HEAD~1 HEAD

  # Quick push to origin with current branch
  pub = push -u origin HEAD
```

Usage examples:

```bash
git lg                        # Beautiful branch graph
git save "WIP login form"     # Stash with message
git undo                      # Soft reset last commit
git pub                       # Push current branch to origin
```

---

## Git Workflows: GitFlow vs Trunk-Based Development

Knowing the commands is only half the picture. How you organize branches matters just as much.

### GitFlow

GitFlow uses two permanent branches (`main` and `develop`) plus three types of temporary branches:

- **feature/*** — branched from `develop`, merged back to `develop`
- **release/*** — branched from `develop` when preparing a release, merged to both `main` and `develop`
- **hotfix/*** — branched from `main`, merged to both `main` and `develop`

```bash
# Start a feature
git switch develop
git switch -c feature/user-profiles

# Finish a feature
git switch develop
git merge --no-ff feature/user-profiles
git branch -d feature/user-profiles

# Start a release
git switch -c release/1.2.0 develop

# Finish the release
git switch main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"
git switch develop
git merge --no-ff release/1.2.0
git branch -d release/1.2.0
```

GitFlow works well for products with scheduled releases and parallel version support (e.g., maintaining v1.x while developing v2.x).

### Trunk-Based Development

Trunk-based development (TBD) is the workflow used by high-velocity teams at companies like Google and Meta. All developers commit to a single branch (`main`) frequently — at least once per day. Long-lived feature branches are avoided.

```bash
# Keep your local main up to date constantly
git pull --rebase origin main

# Short-lived feature branch (max 1-2 days)
git switch -c feature/quick-fix
# ... work ...
git push -u origin HEAD
# Open a PR, get it reviewed, merge it fast

# Use feature flags to ship incomplete features safely
# The code goes in, but is disabled until the flag is enabled
```

TBD requires strong CI/CD, feature flags, and a culture of small commits. The payoff is fewer merge conflicts, faster deploys, and a simpler mental model.

**Which should you use?** TBD for most modern SaaS products with continuous deployment. GitFlow for open-source projects, mobile apps, or any product where you ship versioned releases and need to maintain multiple versions simultaneously.

---

## Quick Reference Table

The most-reached-for commands at a glance:

| Task | Command |
|------|---------|
| Initialize a repo | `git init` |
| Clone a repo | `git clone <url>` |
| Check status | `git status -s` |
| Stage all changes | `git add .` |
| Stage interactively | `git add -p` |
| Commit | `git commit -m "message"` |
| Amend last commit | `git commit --amend` |
| Push current branch | `git push` |
| Pull with rebase | `git pull --rebase` |
| Create + switch branch | `git switch -c feature/name` |
| Delete branch | `git branch -d branch-name` |
| Merge branch | `git merge feature/name` |
| Rebase onto main | `git rebase main` |
| Interactive rebase | `git rebase -i HEAD~3` |
| Stash changes | `git stash push -m "message"` |
| Restore stash | `git stash pop` |
| View log graph | `git log --oneline --graph --all` |
| Show file blame | `git blame file.js` |
| Undo last commit | `git reset --soft HEAD~1` |
| Discard file changes | `git restore filename` |
| Safe revert commit | `git revert HEAD` |
| Cherry-pick commit | `git cherry-pick abc1234` |
| List remotes | `git remote -v` |
| Force push (safe) | `git push --force-with-lease` |
| Create annotated tag | `git tag -a v1.0.0 -m "Release"` |
| Push tags | `git push origin --tags` |
| View all movements | `git reflog` |
| Remove untracked files | `git clean -fd` |

---

## Final Notes

A few principles that will make you dramatically better with Git:

**Commit small and often.** Small commits are easier to review, easier to revert, and easier to cherry-pick. If your commit message needs "and" to describe what it does, split it.

**Write useful commit messages.** The subject line should complete the sentence "If applied, this commit will..." — "Add user authentication", not "stuff" or "fix". Use the body for the "why", not the "what" (the diff shows the what).

**Never force push to shared branches.** `git push --force` rewrites history on the remote. On personal branches, it's fine. On `main` or any branch others are working from, it's a team incident waiting to happen. Use `--force-with-lease` at minimum.

**Reflog is your safety net.** Almost nothing in Git is truly permanent as long as the objects still exist in your local repo. If you think you lost work, `git reflog` first.

**Learn `git add -p`**. Staging changes interactively hunk by hunk is one of those habits that separates senior developers from everyone else. It forces you to review your own changes before committing and lets you make precise, logical commits even from messy working sessions.

---

For more developer tools, calculators, and interactive references — including a Git commit message linter, regex playground, and JSON formatter — visit **[devplaybook.cc](https://devplaybook.cc)**. The tools are free, run in your browser, and are built for the workflows described in guides exactly like this one.
