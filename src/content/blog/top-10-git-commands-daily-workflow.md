---
title: "Top 10 Git Commands Every Developer Uses Daily"
description: "The 10 Git commands you'll type every single workday — with practical examples, flags you'll actually use, real-world scenarios, and common mistakes to avoid."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["git", "version-control", "developer-tools", "productivity"]
readingTime: "7 min read"
---

You don't need to know every Git command — you need to know the right ones cold. Here are the 10 Git commands that show up in nearly every developer's day, with the flags and patterns that make them actually useful.

## 1. `git status`

The command you run more than any other.

```bash
git status
git status -s   # short format — one line per file
```

`-s` gives you a compact view: `M` for modified, `A` for added, `?` for untracked. Once you're comfortable reading it, you'll use it over the verbose default.

**Tip:** Run `git status` before any `git add` or `git commit`. It saves you from staging files you didn't mean to.

## 2. `git add`

Stages changes for your next commit.

```bash
git add file.txt          # stage a specific file
git add src/              # stage everything in a directory
git add -p                # interactive: stage chunks, not whole files
```

`git add -p` (patch mode) is the most underused flag here. It lets you review and selectively stage individual hunks within a file — essential when you've made two unrelated changes and want to commit them separately.

## 3. `git commit`

Records staged changes as a snapshot.

```bash
git commit -m "feat: add user authentication"
git commit --amend        # modify the last commit (message or files)
git commit -am "fix: typo in readme"  # stage tracked files + commit
```

`-am` is a shortcut but it only stages *tracked* files — new files still need `git add`. Use `--amend` only on commits you haven't pushed yet.

## 4. `git push`

Sends your local commits to the remote repository.

```bash
git push
git push origin main
git push -u origin feature/auth   # set upstream tracking
git push --force-with-lease       # safer force push
```

`--force-with-lease` checks that no one else has pushed since you last fetched. It's the safe version of `--force` — use it when you've amended or rebased and need to update a branch.

## 5. `git pull`

Fetches and merges remote changes into your current branch.

```bash
git pull
git pull --rebase         # rebase instead of merge
git pull origin main      # pull from a specific branch
```

`git pull --rebase` keeps your history linear by replaying your commits on top of the fetched changes rather than creating a merge commit. Many teams require it.

## 6. `git branch`

Manages branches — listing, creating, and deleting them.

```bash
git branch                      # list local branches
git branch -a                   # list all branches (including remote)
git branch feature/new-ui       # create a branch
git branch -d feature/merged    # delete a merged branch
git branch -D feature/abandoned # force delete
```

`-a` is useful for seeing what's available on the remote. `-d` vs `-D`: lowercase is safe (won't delete if unmerged), uppercase forces it.

## 7. `git checkout` / `git switch`

Switches branches or restores files.

```bash
git checkout feature/auth       # switch to existing branch
git checkout -b feature/login   # create and switch in one step
git switch main                 # modern syntax for switching
git switch -c feature/signup    # create and switch (modern)
```

`git switch` was introduced to separate "switch branches" from "restore files" — it's clearer. Both work; `switch` is preferred in newer workflows.

## 8. `git log`

Shows commit history.

```bash
git log
git log --oneline               # compact view
git log --oneline --graph       # visual branch tree
git log --oneline -10           # last 10 commits
git log --author="Alice"        # filter by author
git log -- src/api/             # commits affecting a path
```

`--oneline --graph` is the most useful combination for understanding how branches diverged and merged. Add `--all` to see every branch.

## 9. `git diff`

Shows what changed between states.

```bash
git diff                        # unstaged changes
git diff --staged               # staged changes (what you're about to commit)
git diff main..feature/auth     # between two branches
git diff HEAD~3                 # vs 3 commits ago
```

The most common mistake: running `git diff` and seeing nothing because changes are already staged. Use `--staged` to see what's in the commit queue.

## 10. `git stash`

Temporarily shelves work so you can switch context.

```bash
git stash                       # stash current changes
git stash pop                   # reapply and remove from stash
git stash list                  # see all stashes
git stash apply stash@{2}       # apply a specific stash
git stash drop stash@{0}        # delete a stash entry
```

Classic scenario: you're mid-feature when a critical bug needs fixing on `main`. Stash your work, switch branches, fix the bug, come back and `pop`.

## The Daily Sequence

Most days follow this rhythm:

```bash
git pull --rebase               # start fresh
git switch -c feature/thing     # new branch
# ... work ...
git add -p                      # selective staging
git commit -m "feat: thing"     # commit
git push -u origin feature/thing  # push
```

Understanding these 10 commands deeply — their flags, their failure modes, and when to reach for each — covers 95% of what you'll do with Git day-to-day. The other 200+ commands exist for edge cases. Master these first.

---

## Real-World Scenario

A developer is three hours into implementing a new search feature when their team lead pings them: a regression was reported in production — the user login flow is broken, and it's blocking a client demo in two hours. The developer's feature branch has uncommitted changes across four files.

The instinct is to panic, but `git stash` handles this cleanly. They run `git stash`, switch to `main` with `git switch main`, pull the latest with `git pull --rebase`, and create a hotfix branch with `git switch -c hotfix/login-regression`. They track down the bug — a missing null check introduced in a recent merge — fix it, stage only the relevant file with `git add src/auth/login.ts`, review exactly what they're committing with `git diff --staged`, commit it, and push with `git push -u origin hotfix/login-regression`. PR created, reviewed, merged in under 30 minutes.

Then they return to their feature branch: `git switch feature/search`, run `git stash pop`, and their work-in-progress is exactly where they left it. The key insight here is that these commands are not isolated — they form a workflow. `stash` → `switch` → `pull --rebase` → `add -p` → `diff --staged` → `commit` → `push` is a sequence every developer should be able to execute without thinking. When you need to move fast, the commands that slow you down are the ones you had to look up.

A second scenario: a developer needs to understand why a specific API endpoint started returning 500 errors after last week's deployment. They run `git log --oneline -- src/api/payments.ts` to see only the commits that touched that file. Three commits show up. They run `git diff HEAD~2 HEAD -- src/api/payments.ts` to see exactly what changed across those two commits. The bug is visible in the diff immediately — an error handler was removed during a refactor. Without knowing `git log -- <path>` and `git diff <ref>..<ref>`, this debugging session would have taken much longer.

---

## Quick Tips

1. **Add `--staged` to `git diff` before every commit.** It shows exactly what will go into the commit — no surprises, no accidentally committed debug logs or API keys. Make it a habit before running `git commit`.

2. **Use `git add -p` to keep commits focused.** If you fixed a bug and refactored a function in the same file, patch mode lets you stage and commit them separately. Reviewers will thank you, and reverting becomes surgical instead of all-or-nothing.

3. **Replace `git pull` with `git pull --rebase` in team environments.** Merge commits from vanilla `git pull` clutter history and make `git log --graph` unreadable. Most teams prefer a linear history — rebasing achieves this automatically.

4. **Use `git log -- <path>` to investigate file history.** When tracking down when a specific file changed behavior, filtering log output to a single file or directory is dramatically faster than scanning full repo history.

5. **Never use `--force` on a shared branch — use `--force-with-lease`.** `--force` overwrites remote history regardless of what others have pushed. `--force-with-lease` fails if someone else pushed since your last fetch, preventing you from accidentally destroying their work.
