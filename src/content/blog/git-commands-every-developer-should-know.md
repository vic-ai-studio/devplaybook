---
title: "Git Commands Every Developer Should Know: Complete Reference"
description: "Master essential Git commands with this complete reference guide. From basic commits to advanced branching, rebasing, and recovery — everything developers need to know."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["git", "version-control", "developer-tools", "command-line", "workflow"]
readingTime: "12 min read"
---

Git is the backbone of modern software development. Whether you are working solo on a side project or collaborating with a team of fifty engineers, knowing the right git commands at the right time separates developers who struggle from developers who ship confidently. This guide covers the essential git commands every developer should have in their toolkit — from first-time setup to advanced history manipulation — with real-world context for each one.

If you ever find yourself combining flags and options you can barely remember, check out our [Git Command Builder](/tools/git-command-builder) to build complex git commands visually without touching the docs.

---

## Setup & Configuration

Before you write your first commit, Git needs to know who you are. These configuration git commands apply globally or per-repository and affect how your commits are identified.

```bash
# Set your name and email (used in every commit)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Set your default branch name to 'main'
git config --global init.defaultBranch main

# Set your preferred editor (VSCode example)
git config --global core.editor "code --wait"

# Enable colored output in the terminal
git config --global color.ui auto

# View all current configuration values
git config --list

# View a single config value
git config user.email
```

### Useful Global Settings

```bash
# Store credentials so you don't re-enter them
git config --global credential.helper store

# Set line ending behavior (critical for cross-platform teams)
# On Windows:
git config --global core.autocrlf true
# On macOS/Linux:
git config --global core.autocrlf input

# Set a global .gitignore file
git config --global core.excludesfile ~/.gitignore_global
```

A well-configured Git environment reduces friction significantly. Teams that skip this step end up with commit histories full of "Unknown User" entries and messy line-ending diffs.

---

## Core Workflow: Init, Add, Commit, Status, Log

These are the git commands you will use every single day. Knowing their flags and options in depth pays off immediately.

### Initializing and Cloning

```bash
# Initialize a new repository in the current directory
git init

# Initialize with a specific branch name
git init -b main

# Clone a remote repository
git clone https://github.com/user/repo.git

# Clone into a specific folder name
git clone https://github.com/user/repo.git my-project

# Clone only the latest snapshot (faster for large repos)
git clone --depth 1 https://github.com/user/repo.git
```

### Staging Changes

```bash
# Stage a single file
git add filename.js

# Stage all changes in the current directory
git add .

# Stage changes interactively (choose hunks)
git add -p

# Stage a specific directory
git add src/

# Remove a file from staging without discarding changes
git restore --staged filename.js
```

The `git add -p` command is underused by beginners. It lets you stage specific chunks of a file rather than everything at once — essential when a file has multiple unrelated changes and you want clean, atomic commits.

### Committing

```bash
# Commit with an inline message
git commit -m "feat: add user authentication"

# Stage all tracked files and commit in one step
git commit -am "fix: correct null check in parser"

# Open your configured editor for a longer message
git commit

# Amend the most recent commit (message or staged changes)
git commit --amend

# Amend without changing the commit message
git commit --amend --no-edit

# Create an empty commit (useful for triggering CI)
git commit --allow-empty -m "chore: trigger pipeline"
```

Good commit messages follow a structure: a short subject line (under 72 characters), a blank line, and then a body explaining *why* the change was made. The subject line conventionally uses an imperative mood — "fix bug" not "fixed bug."

### Checking Status and History

```bash
# Show working tree status
git status

# Short format status
git status -s

# Show commit history
git log

# Compact one-line log
git log --oneline

# Log with branch graph
git log --oneline --graph --all --decorate

# Show changes in each commit
git log -p

# Show last N commits
git log -5

# Search commits by message
git log --grep="authentication"

# Show commits by a specific author
git log --author="Jane"

# Show what changed in a specific commit
git show abc1234
```

The `git log --oneline --graph --all --decorate` command gives you a visual ASCII map of all branches. Bookmark it. Many developers alias it to something like `git lg`.

---

## Branching & Merging

Branching is where Git truly shines. These git commands let you isolate work, experiment freely, and integrate changes cleanly.

```bash
# List all local branches
git branch

# List all branches including remote-tracking
git branch -a

# Create a new branch
git branch feature/login

# Switch to an existing branch
git checkout feature/login
# or the modern equivalent:
git switch feature/login

# Create and switch in one step
git checkout -b feature/login
# or:
git switch -c feature/login

# Rename a branch
git branch -m old-name new-name

# Delete a merged branch
git branch -d feature/login

# Force delete an unmerged branch
git branch -D feature/login
```

### Merging

```bash
# Merge a branch into the current branch
git merge feature/login

# Merge without fast-forward (preserves branch history)
git merge --no-ff feature/login

# Squash all commits from a branch into one staged change
git merge --squash feature/login

# Abort an in-progress merge
git merge --abort
```

Fast-forward merges are cleaner but lose the visual record that a branch existed. `--no-ff` is preferred on teams that want to see feature boundaries in the log.

### Resolving Conflicts

When a merge conflict occurs, Git marks the file with conflict markers. Open the file, resolve the markers manually, then:

```bash
# After resolving conflicts:
git add resolved-file.js
git commit
```

---

## Remote Repositories

Working with remotes is central to any collaborative workflow. These git commands handle syncing between your local copy and the server.

```bash
# Show configured remotes
git remote -v

# Add a remote
git remote add origin https://github.com/user/repo.git

# Change a remote URL
git remote set-url origin https://github.com/user/new-repo.git

# Remove a remote
git remote remove origin

# Fetch all changes from remote (no merge)
git fetch origin

# Fetch from all remotes
git fetch --all

# Pull (fetch + merge)
git pull origin main

# Pull with rebase instead of merge
git pull --rebase origin main

# Push a branch to remote
git push origin feature/login

# Push and set upstream tracking
git push -u origin feature/login

# Push all branches
git push --all origin

# Delete a remote branch
git push origin --delete feature/login

# Push tags
git push origin --tags
```

The `git pull --rebase` pattern keeps your local history linear and avoids noisy merge commits when syncing with the main branch. Many teams configure this as the default pull behavior.

If you are working with the GitHub API for automation — such as triggering deployments or checking PR status — our [API Request Builder](/tools/api-request-builder) makes it easy to construct and test GitHub REST API calls without writing curl from scratch.

---

## Undoing Changes

One of Git's most powerful features is the ability to undo almost anything. These git commands cover the full spectrum of rollback scenarios.

```bash
# Discard unstaged changes in a file
git restore filename.js
# (older syntax)
git checkout -- filename.js

# Discard all unstaged changes
git restore .

# Unstage a file (keep the changes in working directory)
git restore --staged filename.js

# Revert a commit by creating a new inverse commit
git revert abc1234

# Revert without auto-committing
git revert --no-commit abc1234

# Move HEAD back N commits (keep changes staged)
git reset --soft HEAD~1

# Move HEAD back N commits (keep changes unstaged)
git reset --mixed HEAD~1

# Move HEAD back N commits (discard changes entirely)
git reset --hard HEAD~1

# Reset to match remote exactly (destructive)
git reset --hard origin/main
```

The distinction between `--soft`, `--mixed`, and `--hard` is critical. Use `--soft` when you want to redo a commit. Use `--mixed` when you want to re-stage selectively. Use `--hard` only when you truly want to throw away work — and make sure you have not pushed the commit yet if collaborating.

### Recovering Deleted Commits

```bash
# Show a log of all HEAD movements (including deleted commits)
git reflog

# Restore a commit that was "lost" after a reset
git checkout abc1234
# or create a branch from it:
git branch recovery-branch abc1234
```

`git reflog` has saved countless developers from "I just lost hours of work" panic. It keeps a timestamped log of every position HEAD has pointed to, even after resets and branch deletions.

---

## Stashing

Stashing lets you set aside dirty working state and come back to it later — perfect for context switching mid-task.

```bash
# Stash all tracked changes
git stash

# Stash with a descriptive name
git stash push -m "WIP: refactor auth middleware"

# Include untracked files in the stash
git stash push -u

# List all stashes
git stash list

# Apply the most recent stash (keep it in the list)
git stash apply

# Apply a specific stash
git stash apply stash@{2}

# Apply and remove the most recent stash
git stash pop

# Remove a specific stash without applying
git stash drop stash@{1}

# Remove all stashes
git stash clear

# Show what is in a stash
git stash show -p stash@{0}
```

A practical scenario: you are halfway through a feature when your manager asks you to hotfix a critical bug. `git stash push -u -m "WIP: feature X"`, switch to the main branch, fix the bug, push — then `git stash pop` to resume exactly where you left off.

---

## Rebasing

Rebasing rewrites commit history by replaying commits on top of another base. It produces a cleaner, linear history compared to merging.

```bash
# Rebase current branch onto main
git rebase main

# Rebase interactively (last 4 commits)
git rebase -i HEAD~4

# Continue after resolving a rebase conflict
git rebase --continue

# Skip a commit during rebase
git rebase --skip

# Abort and return to pre-rebase state
git rebase --abort

# Rebase onto a specific commit
git rebase --onto new-base old-base feature-branch
```

### Interactive Rebase Commands

When you run `git rebase -i`, you get an editor with each commit listed. You can use these commands per line:

- `pick` — keep the commit as-is
- `reword` — keep the commit but edit its message
- `edit` — pause to amend the commit
- `squash` — combine with the previous commit, merging messages
- `fixup` — combine with the previous commit, discarding this message
- `drop` — remove the commit entirely

Interactive rebase is ideal for cleaning up a messy feature branch before submitting a pull request. Squash your "WIP" and "fix typo" commits into meaningful units before your teammates review them.

**Important:** Never rebase commits that have already been pushed to a shared branch. Rewriting public history forces everyone else to reconcile their copies.

---

## Advanced Commands

### Tagging

```bash
# Create a lightweight tag
git tag v1.0.0

# Create an annotated tag with a message
git tag -a v1.0.0 -m "Release version 1.0.0"

# Tag a specific commit
git tag -a v1.0.0 abc1234 -m "Retroactive tag"

# List all tags
git tag

# Delete a local tag
git tag -d v1.0.0

# Delete a remote tag
git push origin --delete v1.0.0
```

### Cherry-Picking

```bash
# Apply a specific commit to the current branch
git cherry-pick abc1234

# Cherry-pick a range of commits
git cherry-pick abc1234^..def5678

# Cherry-pick without committing
git cherry-pick --no-commit abc1234
```

Cherry-picking is useful when a critical bug fix lands on a feature branch and you need to port it to main without merging the entire feature.

### Bisect (Finding Bugs by Binary Search)

```bash
# Start a bisect session
git bisect start

# Mark the current commit as bad
git bisect bad

# Mark a known-good commit
git bisect good v2.1.0

# Git checks out a midpoint — test it, then mark:
git bisect good   # or: git bisect bad

# End the bisect session
git bisect reset
```

`git bisect` automates a binary search through your commit history to pinpoint exactly which commit introduced a bug. On a repository with 1000 commits, it finds the culprit in about 10 steps.

### Submodules

```bash
# Add a submodule
git submodule add https://github.com/user/lib.git vendor/lib

# Initialize submodules after cloning
git submodule update --init --recursive

# Update all submodules to their latest remote commit
git submodule update --remote
```

### Sparse Checkout (For Monorepos)

```bash
# Enable sparse checkout
git sparse-checkout init --cone

# Check out only specific directories
git sparse-checkout set src/frontend src/shared

# Disable sparse checkout (restore full tree)
git sparse-checkout disable
```

---

## Git Aliases & Productivity Tips

Aliases let you create shorthand for the git commands you use most. They live in your `~/.gitconfig` file under `[alias]`.

```bash
# Set up aliases via command line
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.undo "reset --soft HEAD~1"
git config --global alias.unstage "restore --staged"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.wip "commit -am 'WIP'"
```

Once set, you can type `git lg` instead of the full log command, or `git undo` to soft-reset your last commit.

### .gitignore Best Practices

```bash
# Check why a file is being ignored
git check-ignore -v filename.log

# Force-add an ignored file
git add -f important.log

# Remove a tracked file and start ignoring it
git rm --cached filename.log
echo "filename.log" >> .gitignore
git commit -m "chore: stop tracking filename.log"
```

### Useful One-Liners

```bash
# Show a summary of changes since a tag
git log v1.0.0..HEAD --oneline

# Count commits by author
git shortlog -sn

# Show files changed in the last commit
git diff --name-only HEAD~1

# Find which branch contains a commit
git branch --contains abc1234

# Show the diff of staged changes
git diff --staged

# Apply a patch file
git apply patch.diff

# Generate a patch from commits
git format-patch HEAD~3
```

### Automating Git with Cron

For teams that want to automate tasks like nightly backups, scheduled fetches, or automated tagging, combining Git with cron jobs is a powerful approach. Use our [Cron Generator](/tools/cron-generator) to build and validate cron expressions for your Git automation scripts without memorizing the syntax.

For example, a cron job that fetches from remote every night at 2 AM:

```bash
# In crontab -e:
0 2 * * * cd /path/to/repo && git fetch --all --prune >> /var/log/git-fetch.log 2>&1
```

---

## Quick Reference: The Git Commands You Need Most

| Scenario | Command |
|---|---|
| Start tracking a project | `git init` |
| Get a copy of a repo | `git clone <url>` |
| Stage all changes | `git add .` |
| Commit staged changes | `git commit -m "message"` |
| Push to remote | `git push origin main` |
| Pull latest changes | `git pull --rebase origin main` |
| Create and switch branch | `git switch -c feature/x` |
| Merge a branch | `git merge feature/x` |
| Stash dirty work | `git stash push -u` |
| Undo last commit (keep changes) | `git reset --soft HEAD~1` |
| Discard all local changes | `git restore .` |
| Find a regression | `git bisect start` |
| View history visually | `git log --oneline --graph --all` |
| Recover lost commits | `git reflog` |

---

## Building Confidence with Git

The developers who look like Git wizards are not memorizing every flag — they have built intuition through practice and know where to look when they need something specific. Start with the core workflow git commands: `init`, `add`, `commit`, `push`, `pull`, `branch`, `merge`. Use them every day until they are muscle memory.

From there, learn `stash` and `rebase -i` for cleaning up your own work. Then graduate to `cherry-pick`, `bisect`, and `reflog` for the situations that actually stress people out. Each tool in Git's arsenal exists because a real team faced a real problem and needed a structured solution.

The key insight most developers miss: Git is not just a backup system. It is a communication tool. Your commit history tells the story of your project to every developer who comes after you — including your future self at 2 AM debugging a regression. Write that story with intention.

---

## Start Building Better Git Workflows Today

Whether you are just starting out or looking to sharpen your command-line habits, the best way to internalize these git commands is to use them in context. Pair this reference guide with the interactive tools at DevPlaybook to accelerate your workflow:

- **[Git Command Builder](/tools/git-command-builder)** — Construct precise git commands visually, with flag explanations and preview output
- **[Cron Generator](/tools/cron-generator)** — Schedule your Git automation tasks with correctly formatted cron expressions
- **[API Request Builder](/tools/api-request-builder)** — Interact with the GitHub REST API to automate repository management, PR checks, and deployments

No account required. No setup. Try it free at [devplaybook.cc](https://devplaybook.cc) and keep this guide bookmarked as your complete Git reference.

---

*Last updated: March 2026. All git commands verified against Git 2.43+.*
