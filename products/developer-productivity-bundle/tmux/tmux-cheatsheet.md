# tmux Cheat Sheet

> Quick reference for the DevPlaybook tmux config. Prefix key: `Ctrl+a`

---

## Essential Concepts

| Term | Meaning |
|------|---------|
| **Session** | A collection of windows (survives terminal close) |
| **Window** | Like a tab — full screen workspace |
| **Pane** | Split region within a window |
| **Prefix** | `Ctrl+a` — press before most shortcuts |

---

## Sessions

| Action | Shortcut |
|--------|----------|
| New session | `tmux new -s name` |
| Attach to session | `tmux attach -t name` |
| List sessions | `tmux ls` |
| Detach (keep running) | `Ctrl+a d` |
| Kill session | `tmux kill-session -t name` |
| Switch session | `Ctrl+a $` (rename) / `Ctrl+a s` (list) |

---

## Windows (Tabs)

| Action | Shortcut |
|--------|----------|
| New window | `Ctrl+a c` |
| Next window | `Shift+→` |
| Previous window | `Shift+←` |
| Go to window 1-5 | `Alt+1` through `Alt+5` |
| Rename window | `Ctrl+a ,` |
| Close window | `Ctrl+a X` |
| List windows | `Ctrl+a w` |
| Move window right | `Ctrl+a >` |
| Move window left | `Ctrl+a <` |

---

## Panes (Splits)

| Action | Shortcut |
|--------|----------|
| Split horizontal | `Ctrl+a \|` |
| Split vertical | `Ctrl+a -` |
| Navigate left | `Ctrl+a h` |
| Navigate down | `Ctrl+a j` |
| Navigate up | `Ctrl+a k` |
| Navigate right | `Ctrl+a l` |
| Zoom pane (toggle) | `Ctrl+a z` |
| Close pane | `Ctrl+a x` |
| Resize left | `Ctrl+a H` (hold) |
| Resize down | `Ctrl+a J` (hold) |
| Resize up | `Ctrl+a K` (hold) |
| Resize right | `Ctrl+a L` (hold) |
| Swap panes | `Ctrl+a {` / `Ctrl+a }` |
| Show pane numbers | `Ctrl+a q` |

---

## Copy Mode (Vi-style)

| Action | Shortcut |
|--------|----------|
| Enter copy mode | `Ctrl+a Enter` |
| Exit copy mode | `q` or `Escape` |
| Start selection | `v` |
| Copy selection | `y` |
| Rectangle select | `r` |
| Search up | `/` |
| Search down | `?` |
| Page up | `Ctrl+b` |
| Page down | `Ctrl+f` |
| Scroll up | `k` or `↑` |
| Scroll down | `j` or `↓` |

---

## Miscellaneous

| Action | Shortcut |
|--------|----------|
| Reload config | `Ctrl+a r` |
| Command prompt | `Ctrl+a :` |
| Show key bindings | `Ctrl+a ?` |
| Clock mode | `Ctrl+a t` |

---

## Useful CLI Commands

```bash
# Start new named session
tmux new -s dev

# Attach to existing session
tmux attach -t dev

# List all sessions
tmux ls

# Kill all sessions
tmux kill-server

# Run command in new session
tmux new -s logs -d 'tail -f /var/log/app.log'
```

---

## Common Workflows

### Dev Setup (3 panes)
```
Ctrl+a c        → New window
Ctrl+a |        → Split right (editor / server)
Ctrl+a -        → Split bottom left (terminal)
```

### Log Monitoring
```
tmux new -s monitor -d
Ctrl+a |        → Split
Left pane: tail -f app.log
Right pane: tail -f error.log
Ctrl+a d        → Detach (keeps running)
```

---

*DevPlaybook — Tools for Developers Who Ship*
*devplaybook.cc*
