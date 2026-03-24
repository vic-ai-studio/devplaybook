# =============================================================================
# DevPlaybook Git Aliases — 50+ Power Shortcuts
# Version: 1.0 | devplaybook.cc
# INSTALL: echo "source ~/path/to/git-aliases.sh" >> ~/.zshrc
# =============================================================================

# --- Status & Info ---
alias gs='git status -sb'                          # Short status with branch
alias gb='git branch -vv'                          # Branches with tracking
alias gba='git branch -a'                          # All branches including remote
alias gl='git log --oneline -20'                   # Last 20 commits, compact
alias gll='git log --graph --oneline --decorate'   # Visual log with branches
alias gd='git diff'                                # Unstaged changes
alias gds='git diff --staged'                      # Staged changes
alias gshow='git show --stat'                      # Show last commit details

# --- Staging ---
alias ga='git add'
alias gaa='git add -A'                             # Stage ALL changes
alias gap='git add -p'                             # Interactive patch staging
alias gun='git restore --staged'                   # Unstage file(s)
alias gunall='git restore --staged .'              # Unstage everything

# --- Committing ---
alias gc='git commit -m'                           # Quick commit: gc "message"
alias gca='git commit --amend'                     # Amend last commit
alias gcn='git commit --amend --no-edit'           # Amend without changing message
alias gfix='git commit --fixup'                    # Create fixup commit

# --- Branching ---
alias gco='git checkout'
alias gcob='git checkout -b'                       # Create and switch: gcob feature/x
alias gsw='git switch'
alias gswc='git switch -c'                         # Create and switch (new style)
alias gbD='git branch -D'                          # Force delete branch
alias gbd='git branch -d'                          # Safe delete branch
alias grename='git branch -m'                      # Rename: grename old new

# --- Remote ---
alias gf='git fetch --all --prune'                 # Fetch all + prune deleted
alias gpl='git pull'
alias gplr='git pull --rebase'                     # Pull with rebase (cleaner)
alias gps='git push'
alias gpsu='git push -u origin HEAD'               # Push and set upstream
alias gpsf='git push --force-with-lease'           # Safe force push

# --- Merging & Rebasing ---
alias gm='git merge'
alias gmnff='git merge --no-ff'                    # Always create merge commit
alias grb='git rebase'
alias grbi='git rebase -i'                         # Interactive rebase: grbi HEAD~3
alias grba='git rebase --abort'
alias grbc='git rebase --continue'

# --- Stash ---
alias gst='git stash'
alias gstp='git stash pop'
alias gstl='git stash list'
alias gstd='git stash drop'
alias gsts='git stash show -p'                     # Show stash diff

# --- Reset & Undo ---
alias gundo='git reset HEAD~1'                     # Undo last commit (keep changes)
alias gnuke='git reset --hard HEAD'                # Discard ALL local changes
alias gclean='git clean -fd'                       # Remove untracked files/dirs

# --- Search & Diff ---
alias ggrep='git grep -n'                          # Search in tracked files
alias gbisect='git bisect'                         # Binary search for bugs
alias gblame='git blame -w'                        # Blame ignoring whitespace

# --- Advanced ---
alias gwip='git add -A && git commit -m "WIP: work in progress"'    # Quick WIP
alias gunwip='git log -n 1 | grep -q -c "WIP:" && git reset HEAD~1' # Undo WIP
alias gcp='git cherry-pick'                        # Cherry-pick commit
alias gcpa='git cherry-pick --abort'
alias gtag='git tag -a'                            # Annotated tag: gtag v1.0 -m "msg"

# --- Logging functions ---
git_authors() { git shortlog -sn --all --no-merges; }    # Commit count by author
git_recent() { git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) %(committerdate:relative)' | head -10; }  # Recent branches
git_size() { git count-objects -vH; }              # Repo size

# =============================================================================
# QUICK REFERENCE CARD
# gs  = status    ga  = add       gc  = commit
# gd  = diff      gf  = fetch     gpl = pull
# gps = push      gco = checkout  gcob = new branch
# gst = stash     gstp = stash pop
# gundo = undo commit (keeps changes)
# gnuke = DISCARD ALL changes (dangerous!)
# =============================================================================
