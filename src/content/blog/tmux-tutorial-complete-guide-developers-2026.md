---
title: "Tmux Tutorial: The Complete Developer Workflow Guide (2026)"
description: "Learn tmux from scratch — sessions, windows, panes, scripts, and a complete developer workflow. Covers tmux 3.x with configuration examples, copy-mode navigation, and pair programming setups."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["tmux", "terminal", "productivity", "linux", "developer-tools", "workflow", "cli", "pair-programming"]
readingTime: "14 min read"
ogImage: "/og-blog.svg"
---

If you SSH into servers, run long processes, or work with multiple terminals at once, you've felt the pain of losing your workflow when a connection drops. Tmux solves that — and once you use it daily, you'll wonder how you ever worked without it.

This guide gets you from zero to productive in under 30 minutes. Everything here works on tmux 3.x — the current standard on Ubuntu 22.04+, macOS, and most Linux distributions.

---

## What Is Tmux?

Tmux stands for **Terminal Multiplexer**. It lets you:

- Run multiple terminal sessions in one window
- Detach sessions and reattach them later (your work survives SSH disconnects)
- Split one terminal into multiple panes (side by side, top/bottom)
- Attach multiple clients to the same session (pair programming!)
- Share sessions with other users over network

The alternatives — `screen`, iTerm2 tabs, multiple terminal windows — all have limitations tmux doesn't. Screen is older and less configurable. GUI tabs don't survive disconnects. Tmux combines all the benefits into one tool.

---

## Core Concepts: Sessions, Windows, Panes

Tmux organizes everything in a three-level hierarchy:

| Level | What it is | Analog |
|-------|-----------|--------|
| **Session** | A running environment with state | A VS Code window |
| **Window** | A single screen (tab) inside a session | A VS Code tab |
| **Pane** | A split view inside a window | A split editor pane |

You create a session. Inside it, you open windows (like tabs). Inside each window, you split into panes.

**Prefix key:** Every tmux command starts with `Ctrl+b` (the "prefix"), followed by a second key. By convention, this guide shows `Prefix` to mean `Ctrl+b`.

---

## Installation

### macOS

```bash
brew install tmux
```

### Ubuntu / Debian

```bash
sudo apt update && sudo apt install tmux
```

### CentOS / RHEL / Fedora

```bash
sudo dnf install tmux
```

### Verify

```bash
tmux -V
# tmux 3.x  (3.3a, 3.4, etc. — all compatible with this guide)
```

---

## Your First Tmux Session

### Start a named session

```bash
tmux new -s myproject
```

You're now inside tmux. The status bar at the bottom shows the session name (`myproject`) and current window.

### Detach (leave session running)

```
Prefix d
```

You're back to your regular shell. The tmux session is still running in the background.

### Reattach to a running session

```bash
tmux attach -t myproject
# or shorthand:
tmux a -t myproject
```

### List all sessions

```bash
tmux ls
```

Output looks like:

```
myproject: 2 windows (created 5 hours ago)
server-maintenance: 1 window (created 2 days ago)
```

### Kill a session

```bash
tmux kill-session -t myproject
```

That's the basic session lifecycle: create → detach → reattach. Your terminal work now survives SSH drops, laptop closes, and system restarts (as long as the tmux server is running on the machine).

---

## Windows (Tabs)

Inside a session, windows work like browser tabs.

| Command | Action |
|---------|--------|
| `Prefix c` | Create new window |
| `Prefix ,` | Rename current window |
| `Prefix 1` | Switch to window 1 |
| `Prefix 2` | Switch to window 2 |
| `Prefix 0` | Switch to window 0 |
| `Prefix n` | Next window |
| `Prefix p` | Previous window |
| `Prefix l` | Last active window |
| `Prefix w` | List all windows (interactive) |
| `Prefix &` | Close current window |

---

## Panes (Splits)

This is where tmux becomes genuinely powerful for development.

### Split horizontally (top/bottom)

```
Prefix "
```

### Split vertically (left/right)

```
Prefix %
```

### Navigate between panes

```
Prefix ←   # move to pane on the left
Prefix →   # move to pane on the right
Prefix ↑   # move to pane above
Prefix ↓   # move to pane below
```

These arrow keys only work immediately after the prefix — not as standalone vim-style keys. For vim-style pane navigation anywhere, see the configuration section below.

### Resize panes

```
Prefix Alt+←   # resize left (hold Alt)
Prefix Alt+→
Prefix Alt+↑
Prefix Alt+↓
```

Or use `Prefix :` to enter command mode and type:

```
resize-pane -L 20
resize-pane -R 20
resize-pane -D 10
resize-pane -U 10
```

### Tile all panes automatically

```
Prefix Alt+2   # even horizontal split
Prefix Alt+1   # even vertical split
```

### Close a pane

```
Prefix x
```

Or just type `exit` in the pane.

---

## Copy Mode (Scrolling & Text Selection)

Tmux has a built-in scrollback buffer you can search, scroll, and copy from.

### Enter copy mode

```
Prefix [
```

Now use arrow keys or these commands to navigate:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Scroll up/down line by line |
| `Space` | Start selection |
| `Enter` | Copy selection |
| `q` | Quit copy mode |
| `/` | Search forward |
| `?` | Search backward |
| `g` | Go to top of buffer |
| `G` | Go to bottom of buffer |
| `PageUp` / `PageDown` | Page scroll |

### Copy to tmux buffer + paste

1. `Prefix [` → enter copy mode
2. Navigate to text, press `Space` to start selection
3. Move to end of selection, press `Enter`
4. `Prefix ]` → paste

### Copy to system clipboard

Add this to your `~/.tmux.conf` (see config section):

```bash
# Copy selection to system clipboard (requires xclip or pbcopy)
bind -T copy-mode-vi Enter send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -i"
```

With this, `Enter` in copy mode sends selected text directly to your system clipboard.

---

## The Tmux Command Line

Everything accessible with keyboard shortcuts can also be typed at the command line.

### Enter command mode

```
Prefix :
```

The status bar turns yellow and accepts tmux commands.

**Useful commands:**

```
# Split window into pane running htop
split-window -h "htop"

# Send command to all panes in current window
set-window-option synchronize-panes on
# Now any command runs in all panes simultaneously!
# Toggle off:
set-window-option synchronize-panes off

# Rename the current session
rename-session my-session

# Rename current window
rename-window editor

# Set option for current window
set-window-option window-style "bg=colour234"
set-window-option pane-border-style "bg=black"
```

---

## Practical Developer Workflows

### Workflow 1: The Four-Pane Dev Setup

This is the setup most developers end up using daily:

```
┌─────────────────┬─────────────────┐
│                 │                 │
│    Editor       │   Terminal 1    │
│   (vim/nano)    │  (npm run dev)  │
│                 │                 │
├─────────────────┼─────────────────┤
│                 │                 │
│   Terminal 2    │   Git / Logs    │
│ (server logs)   │  (git status)   │
│                 │                 │
└─────────────────┴─────────────────┘
```

Create it from scratch:

```bash
# Start session
tmux new -s dev -d

# Open editor in window 1, split for server in pane 1
tmux send-keys -t dev:1.0 "vim ." Enter
tmux split-window -v -t dev:1 -p 30
tmux send-keys -t dev:1.1 "npm run dev" Enter

# Open terminal 2 for git/logs
tmux new-window -t dev -n git
tmux split-window -h -t dev:2
tmux send-keys -t dev:2.0 "git status" Enter
tmux send-keys -t dev:2.1 "tail -f logs/server.log" Enter

# Attach
tmux attach -t dev
```

Or save as a script (see the script section below).

### Workflow 2: Pair Programming Over SSH

Tmux lets you share a live terminal session with a remote collaborator.

**On the host (person sharing):**

```bash
tmux new -s pair-session
# Grant socket access to collaborator
chmod 755 /tmp/tmux-1000/default
# (Your collaborator needs read+write access to the tmux socket)
```

**On the collaborator's machine:**

```bash
ssh user@host
tmux -S /tmp/tmux-1000/default attach
```

Both people now see and interact with the same terminal in real time. Either can type.

### Workflow 3: Persistent Server Session

Leave a long-running process on a remote server that survives your connection:

```bash
ssh server
tmux new -s deploy
# Run your long process
python manage.py migrate
# or: npm run build
# or: tail -f /var/log/app.log

# Press Prefix d to detach
# Close laptop, go home

# Next day, reattach
ssh server
tmux attach -t deploy
```

Your process is still running. The session never died.

### Workflow 4: Sync Panes for Running Commands Across Services

In `~/.tmux.conf`, enable synchronized panes:

```bash
# Then in a window:
# Prefix : → set-window-option synchronize-panes on
```

Now every command you type runs in ALL panes simultaneously. Useful for:
- Checking the same log across multiple servers
- Running the same script with different environment variables
- Comparing output from two services side by side

---

## Configuration (`~/.tmux.conf`)

The tmux config file lives at `~/.tmux.conf`. Changes apply when you restart tmux, or immediately with:

```bash
tmux source-file ~/.tmux.conf
```

### A Complete Developer Config

```bash
# ── General ──────────────────────────────────────────────
set -g default-terminal "tmux-256color"
set -as terminal-overrides ",xterm*:Tc:sitm=\E[3m"

# Faster key repeat
set -g repeat-time 300

# Start window numbering at 1 (not 0)
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows automatically when one is closed
set-option -g renumber-windows on

# ── Prefix (remap Ctrl+b to Ctrl+a) ───────────────────────
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# ── Navigation (vim-style pane switching) ──────────────────
bind -r h select-pane -L
bind -r j select-pane -D
bind -r k select-pane -U
bind -r l select-pane -R

# ── Splits (open in same directory) ───────────────────────
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# ── Copy Mode (vim-style) ─────────────────────────────────
setw -g mode-keys vi
bind -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-selection-and-cancel

# Copy to system clipboard (macOS)
bind -T copy-mode-vi Enter send-keys -X copy-selection-and-cancel
bind -T copy-mode-vi y send-keys -X copy-selection-and-cancel

# ── Mouse support ─────────────────────────────────────────
set -g mouse on

# ── Status bar ────────────────────────────────────────────
set -g status-interval 5
set -g status-style "bg=#1e1e2e,fg=#cdd6f4"
set -g status-left "#[fg=#cdd6f4,bg=#1e1e2e,bold] #S  "
set -g status-right "#[fg=#cdd6f4] %Y-%m-%d  %H:%M "
setw -g window-status-format " #I:#W "
setw -g window-status-current-format " #I:#W "

# ── Better pane borders ────────────────────────────────────
set -g pane-border-style "fg=#45475a"
set -g pane-active-border-style "fg=#89b4fa"

# ── Faster command mode ────────────────────────────────────
bind : command-prompt
```

---

## Scripting Tmux (Automate Your Setup)

Save your perfect layout as a reusable script:

### `~/bin/tmux-dev.sh`

```bash
#!/bin/bash
SESSION="project-dev"

# Create or attach to session
tmux new-session -d -s "$SESSION"

# Window 1: Editor + server
tmux send-keys -t "$SESSION:1" "cd ~/projects/api && vim ." Enter
tmux split-window -v -t "$SESSION:1" -p 30
tmux send-keys -t "$SESSION:1.1" "cd ~/projects/api && npm run dev" Enter

# Window 2: Background jobs
tmux new-window -t "$SESSION:2" -n "jobs"
tmux send-keys -t "$SESSION:2" "cd ~/projects/api && redis-server" Enter
tmux split-window -h -t "$SESSION:2"
tmux send-keys -t "$SESSION:2.1" "cd ~/projects/api && python manage.py qcluster" Enter

# Window 3: Logs
tmux new-window -t "$SESSION:3" -n "logs"
tmux send-keys -t "$SESSION:3" "tail -f ~/projects/api/logs/all.log" Enter

# Attach
tmux attach -t "$SESSION"
```

Make it executable:

```bash
chmod +x ~/bin/tmux-dev.sh
```

Run it any time you start working: `tmux-dev.sh`

### Restore Session After Reboot

Sessions don't survive a machine reboot. But you can restore your layout quickly:

```bash
# Save session layout as a script
tmux list-windows -t myproject
tmux list-panes -t myproject

# Or use tmux-resurrect plugin (see below)
```

---

## Useful Plugins (TPM — Tmux Plugin Manager)

The best tmux plugins worth installing:

### TPM Setup

```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Add to `~/.tmux.conf`:

```bash
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-resurrect'      # save/restore sessions
set -g @plugin 'tmux-plugins/tmux-continuum'       # auto-save every 15 min

# Initialize TPM (keep at bottom of .tmux.conf)
run '~/.tmux/plugins/tpm/tpm'
```

Then `Prefix I` to install plugins.

### tmux-resurrect

This is the plugin you didn't know you needed. It saves your exact tmux session state (all windows, panes, running programs, current directories) and restores it after a reboot or tmux restart.

```bash
# Save session
Prefix Ctrl+s

# Restore session
Prefix Ctrl+t
```

### tmux-continuum

Works with resurrect. Every 15 minutes (configurable), it automatically saves your tmux environment. After a reboot, your session is exactly as you left it.

```bash
set -g @continuum-restore 'on'
set -g @continuum-save-interval '15'
```

---

## Keyboard Shortcuts Cheat Sheet

### Sessions

| Shortcut | Action |
|----------|--------|
| `Prefix d` | Detach from session |
| `Prefix $` | Rename session |
| `Prefix s` | List and switch sessions |

### Windows (Tabs)

| Shortcut | Action |
|----------|--------|
| `Prefix c` | New window |
| `Prefix ,` | Rename window |
| `Prefix &` | Close window |
| `Prefix 1–9` | Switch to window N |
| `Prefix n` | Next window |
| `Prefix p` | Previous window |
| `Prefix w` | Interactive window list |

### Panes

| Shortcut | Action |
|----------|--------|
| `Prefix "` | Split horizontally |
| `Prefix %` | Split vertically |
| `Prefix x` | Close pane |
| `Prefix z` | Zoom pane (toggle full screen) |
| `Prefix Space` | Cycle through pane layouts |
| `Prefix o` | Cycle through panes |

### Copy Mode

| Shortcut | Action |
|----------|--------|
| `Prefix [` | Enter copy mode |
| `↑↓←→` | Scroll |
| `v` | Start selection (vi mode) |
| `Enter` | Copy selection |
| `Prefix ]` | Paste |
| `q` | Quit copy mode |

---

## Tmux vs Screen vs Terminal Tabs

| Feature | tmux | screen | Terminal Tabs |
|---------|------|--------|---------------|
| Survives disconnects | ✅ | ✅ | ❌ |
| Remote session sharing | ✅ | ✅ | ❌ |
| Pane splitting | ✅ | ✅ | ❌ (mostly) |
| Configuration | Rich | Limited | N/A |
| Actively maintained | ✅ (3.x) | ⚠️ (older) | ✅ |
| GUI independence | ✅ | ✅ | ❌ |
| Plugin ecosystem | ✅ TPM | Limited | ❌ |
| Mouse support | ✅ | ⚠️ | ✅ |

---

## Common Issues

**`Tmux: need UTF-8 locale`**

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

Then `source ~/.bashrc`.

**`error creating socket`**

The tmux server may already be running another instance. Either kill it:

```bash
tmux kill-server
```

Or attach to the existing server:

```bash
tmux ls   # find existing sessions
tmux a
```

**`prefix key not working in SSH`**

SSH sessions can eat tmux's control characters. Use `Prefix ?` to verify tmux is receiving your prefix key. If not, make sure your SSH client sends keepalives:

```bash
# In ~/.ssh/config
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**Panes reset on resize**

In `~/.tmux.conf`:

```bash
set -g history-limit 50000
```

This gives you a large scrollback buffer even after pane resizes.

---

## Frequently Asked Questions

**Q: Does tmux slow down my terminal?**
No meaningful impact. Tmux adds ~2-5MB of memory overhead per session and negligible CPU. The performance benefit of not losing work far outweighs it.

**Q: Can I use tmux with VS Code's terminal?**
Yes. VS Code's integrated terminal runs inside tmux just fine. Configure VS Code to use tmux as the default shell in settings, or just open a tmux pane inside VS Code's terminal.

**Q: How do I copy text from tmux to my system clipboard?**
On macOS, add this to `~/.tmux.conf`:

```bash
bind -T copy-mode-vi Enter send-keys -X copy-selection-and-cancel
bind -T copy-mode-vi y send-keys -X copy-selection-and-cancel
```

On Linux, install `xclip`:

```bash
sudo apt install xclip
```

Then the same config above works with `xclip`.

**Q: How many panes can I open?**
Technically unlimited. Practically, more than 6-8 panes at 1080p becomes cramped. Use separate windows for larger workspaces.

**Q: Can I share a tmux session with someone not on my network?**
Yes — over SSH. See the pair programming workflow above. For internet sharing, consider `tmate` (a tmux fork with built-in sharing): `brew install tmate`.

---

## Next Steps

- Install tmux and run through the basic commands above today
- Set up your `~/.tmux.conf` with the config in this article
- Install TPM and the resurrect plugin
- Save your first layout as a script
- Try the pair programming workflow with a colleague

Once you have your dev workflow scripted, starting work becomes a single command. That's the real payoff.

---

**Related Tools:**
- [Vim & Neovim Productivity Tips](/blog/vim-neovim-productivity-tips-developers) — pair tmux with a powerful editor
- [Best Terminal Emulators (2025)](/blog/best-terminal-emulators-2025) — hardware-accelerated terminals that make tmux even faster
- [Git Workflow Best Practices](/blog/git-workflow-best-practices-2025) — your git workflow, supercharged inside tmux
