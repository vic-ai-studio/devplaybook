# Git Cheat Sheet

---

## Setup

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true          # rebase on pull (recommended)
```

---

## Daily Workflow

```bash
git status                   # what changed?
git diff                     # unstaged changes
git diff --staged            # staged changes
git add <file>               # stage specific file
git add -p                   # stage interactively (chunk by chunk)
git commit -m "message"      # commit with message
git push                     # push to remote
git pull                     # fetch + merge/rebase
```

---

## Branching

```bash
git branch                       # list branches
git branch -a                    # include remote branches
git checkout -b feature/name     # create + switch to branch
git switch main                  # switch branch (modern syntax)
git merge feature/name           # merge into current branch
git merge --no-ff feature/name   # merge with commit (keeps history)
git branch -d feature/name       # delete branch (safe)
git branch -D feature/name       # force delete
git push origin --delete name    # delete remote branch
```

---

## Remote

```bash
git remote -v                              # list remotes
git remote add origin <url>               # add remote
git fetch origin                          # fetch all remote changes
git push -u origin feature/name          # push + set upstream
git pull origin main --rebase            # pull with rebase
```

---

## Stash

```bash
git stash                         # stash changes
git stash push -m "description"   # stash with name
git stash list                    # list stashes
git stash pop                     # apply + remove latest
git stash apply stash@{2}         # apply specific stash
git stash drop stash@{0}          # remove stash
```

---

## History & Log

```bash
git log --oneline -20              # compact history
git log --graph --oneline --all    # visual branch history
git log -p <file>                  # history of a file with diffs
git blame <file>                   # who changed each line
git show <commit>                  # show a commit's changes
git diff main..feature/name        # diff between branches
```

---

## Fixing Mistakes

```bash
git restore <file>                    # discard unstaged changes
git restore --staged <file>           # unstage a file
git commit --amend                    # edit last commit message
git reset HEAD~1                      # undo last commit (keep changes)
git reset --hard HEAD~1               # undo last commit (discard changes) ⚠️
git revert <commit>                   # safe undo (creates new commit)
git cherry-pick <commit>              # apply a commit to current branch
```

---

## Rebase

```bash
git rebase main                    # rebase current branch onto main
git rebase -i HEAD~3               # interactive rebase last 3 commits
# In interactive rebase:
#   pick  = keep commit
#   squash = merge into previous
#   reword = edit commit message
#   drop  = remove commit
git rebase --continue              # after resolving conflict
git rebase --abort                 # cancel rebase
```

---

## Tags

```bash
git tag                           # list tags
git tag v1.0.0                    # create lightweight tag
git tag -a v1.0.0 -m "Release"   # annotated tag
git push origin v1.0.0           # push specific tag
git push origin --tags            # push all tags
```

---

## Useful Aliases (add to ~/.gitconfig)

```ini
[alias]
    st = status
    co = checkout
    br = branch
    lg = log --oneline --graph --all
    undo = reset HEAD~1
    unstage = restore --staged
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
