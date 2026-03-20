---
title: "Git Commands Every Developer Should Know"
description: "Master the top 20 essential Git commands with real examples. From init to bisect, this guide covers everything you need daily."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["git", "version-control", "developer-tools", "command-line"]
readingTime: "8 min read"
---

Git is the universal language of software collaboration. Whether you are pushing your first commit or untangling a messy history, knowing the right command saves time and avoids disasters. This guide covers the top 20 essential Git commands every developer should have memorized, with practical examples and real-world use-cases.

## Setting Up and Getting Code

### `git init`

Creates a new local Git repository in the current directory.

```bash
git init my-project
cd my-project
```

Use this when starting a brand new project from scratch. It creates a hidden `.git/` folder that tracks all changes going forward.

### `git clone`

Copies an existing remote repository to your local machine.

```bash
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-custom-folder
```

Cloning automatically sets up the `origin` remote and checks out the default branch.

## Staging and Committing

### `git add`

Stages changes so they are included in the next commit.

```bash
git add index.html          # stage a single file
git add src/                # stage a whole directory
git add -p                  # interactively stage chunks (very useful)
```

The `-p` flag lets you review and stage individual hunks, giving you fine-grained control over what goes into each commit.

### `git commit`

Records staged changes permanently in the repository history.

```bash
git commit -m "feat: add login form validation"
git commit --amend          # edit the most recent commit message or add forgotten files
```

Write commit messages in the imperative mood ("add", "fix", "remove") and keep the first line under 72 characters.

### `git push`

Uploads local commits to a remote repository.

```bash
git push origin main
git push -u origin feature/dark-mode    # set upstream and push
git push --force-with-lease             # safer alternative to --force
```

Always prefer `--force-with-lease` over `--force` — it refuses the push if someone else has pushed since your last fetch.

### `git pull`

Fetches remote changes and merges them into your current branch.

```bash
git pull origin main
git pull --rebase origin main    # rebase instead of merge
```

Using `--rebase` keeps history linear and avoids unnecessary merge commits.

## Branching and Merging

### `git branch`

Lists, creates, renames, or deletes branches.

```bash
git branch                        # list local branches
git branch feature/checkout       # create a branch
git branch -d feature/checkout    # delete merged branch
git branch -D feature/checkout    # force delete
git branch -m old-name new-name   # rename
```

### `git checkout` / `git switch`

Switches between branches or restores files.

```bash
git checkout feature/checkout
git checkout -b feature/new-thing    # create and switch in one step
# Modern equivalent:
git switch main
git switch -c feature/new-thing
```

`git switch` is clearer and less error-prone for branch operations; `git checkout` still handles file restoration.

### `git merge`

Integrates changes from one branch into the current branch.

```bash
git checkout main
git merge feature/checkout
git merge --no-ff feature/checkout    # always create a merge commit
git merge --squash feature/checkout   # squash all commits into one staged change
```

Use `--no-ff` in team workflows to preserve the fact that a feature branch existed.

## Inspecting and Comparing

### `git status`

Shows which files are staged, unstaged, or untracked.

```bash
git status
git status -s    # short format
```

Run this constantly. It is the cheapest way to orient yourself before any operation.

### `git diff`

Shows what has changed but not yet staged.

```bash
git diff                    # unstaged changes
git diff --staged           # staged changes (what will be committed)
git diff main feature/x     # compare two branches
git diff HEAD~3 HEAD        # compare with 3 commits ago
```

### `git log`

Displays the commit history.

```bash
git log
git log --oneline --graph --all    # compact visual graph
git log --author="Alice"           # filter by author
git log -p src/app.js              # history for a specific file
```

The `--oneline --graph --all` combination is the most useful daily alias.

## Undoing Changes

### `git stash`

Temporarily shelves changes so you can switch context without committing.

```bash
git stash
git stash push -m "WIP: auth refactor"    # named stash
git stash list
git stash pop                              # apply and remove most recent stash
git stash apply stash@{2}                 # apply without removing
git stash drop stash@{0}
```

Stash before pulling in a hotfix, then pop to resume your work.

### `git reset`

Moves the branch pointer and optionally changes staging/working tree.

```bash
git reset HEAD~1              # undo last commit, keep changes staged
git reset --mixed HEAD~1      # undo last commit, unstage changes (default)
git reset --hard HEAD~1       # undo last commit, discard all changes
```

`--hard` permanently discards changes. Use with caution on shared branches.

### `git revert`

Creates a new commit that undoes a previous commit — safe for shared history.

```bash
git revert abc1234            # revert a specific commit by hash
git revert HEAD               # revert the last commit
```

Always prefer `revert` over `reset` on commits that have already been pushed.

## Advanced Commands

### `git rebase`

Replays commits on top of another base, producing a linear history.

```bash
git checkout feature/x
git rebase main               # rebase feature onto main
git rebase -i HEAD~4          # interactive: squash, reorder, edit commits
```

Interactive rebase (`-i`) is invaluable for cleaning up messy work-in-progress commits before opening a pull request.

### `git cherry-pick`

Applies a specific commit from another branch onto the current branch.

```bash
git cherry-pick abc1234
git cherry-pick abc1234..def5678    # range of commits
```

Useful for backporting a bug fix to a release branch without merging the entire feature branch.

### `git bisect`

Uses binary search to find which commit introduced a bug.

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good v2.1.0            # last known good commit
# Git checks out the middle commit — test it, then:
git bisect good                   # or: git bisect bad
# Repeat until Git identifies the culprit commit
git bisect reset                  # return to original HEAD when done
```

Bisect can narrow down thousands of commits to the exact bad one in minutes.

## Quick Reference

| Command | Purpose |
|---|---|
| `git init` | Start a new repo |
| `git clone <url>` | Copy a remote repo |
| `git add -p` | Interactively stage changes |
| `git commit --amend` | Fix last commit |
| `git push --force-with-lease` | Safe force push |
| `git pull --rebase` | Pull without merge commits |
| `git log --oneline --graph` | Visual history |
| `git stash pop` | Restore shelved changes |
| `git revert <hash>` | Safe undo on shared branches |
| `git bisect` | Binary-search for bugs |

## Practical Tips

**Set up aliases for daily commands.** Add these to your `~/.gitconfig`:

```ini
[alias]
  lg = log --oneline --graph --all --decorate
  st = status -s
  co = checkout
  br = branch
```

**Write meaningful commit messages.** Future-you will thank present-you. Use the format: `type: short description` where type is `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`.

**Commit early, commit often.** Small, focused commits are easier to review, revert, and cherry-pick than large monolithic ones.

Mastering these 20 commands covers the vast majority of daily Git work. Keep this list handy, practice the interactive flags, and your version control workflows will become fast and confident.
