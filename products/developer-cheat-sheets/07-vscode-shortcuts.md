# VS Code Shortcuts Cheat Sheet

*Windows/Linux shown. Mac: replace Ctrl → Cmd, Alt → Option*

---

## Command Palette & Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command Palette (run any command) |
| `Ctrl+P` | Quick Open (go to file) |
| `Ctrl+Shift+E` | Explorer sidebar |
| `Ctrl+Shift+F` | Search across files |
| `Ctrl+Shift+G` | Source Control |
| `Ctrl+Shift+X` | Extensions |
| `Ctrl+Shift+J` | Toggle Panel (terminal/output) |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+\`` | Toggle integrated terminal |
| `Ctrl+Shift+\`` | New terminal |

---

## File & Tab Management

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+T` | Reopen closed tab |
| `Ctrl+Tab` | Cycle through open tabs |
| `Ctrl+1 / 2 / 3` | Focus editor group 1/2/3 |
| `Ctrl+\` | Split editor |
| `Ctrl+K Z` | Zen mode (distraction-free) |

---

## Editing — Basic

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+X` | Cut line (no selection needed) |
| `Ctrl+C` | Copy line (no selection needed) |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Select next occurrence of selection |
| `Alt+↑ / ↓` | Move line up / down |
| `Shift+Alt+↑ / ↓` | Duplicate line up / down |
| `Ctrl+Shift+K` | Delete line |
| `Ctrl+Enter` | Insert line below |
| `Ctrl+Shift+Enter` | Insert line above |
| `Tab` | Indent / expand snippet |
| `Shift+Tab` | Outdent |

---

## Editing — Advanced

| Shortcut | Action |
|----------|--------|
| `Ctrl+/` | Toggle line comment |
| `Shift+Alt+A` | Toggle block comment |
| `Alt+Click` | Add cursor at click position |
| `Ctrl+Alt+↑ / ↓` | Add cursor above / below |
| `Ctrl+Shift+L` | Select all occurrences of selection |
| `Ctrl+F2` | Select all occurrences of word |
| `Shift+Alt+I` | Add cursor at end of each selected line |
| `Ctrl+U` | Undo last cursor operation |
| `Ctrl+Shift+[` | Fold (collapse) block |
| `Ctrl+Shift+]` | Unfold (expand) block |
| `Ctrl+K Ctrl+0` | Fold all |
| `Ctrl+K Ctrl+J` | Unfold all |

---

## Search & Replace

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Find in file |
| `Ctrl+H` | Find and Replace in file |
| `Ctrl+Shift+F` | Find in all files |
| `Ctrl+Shift+H` | Replace in all files |
| `F3` | Find next |
| `Shift+F3` | Find previous |
| `Alt+Enter` | Select all find matches |

---

## Code Intelligence

| Shortcut | Action |
|----------|--------|
| `F12` | Go to definition |
| `Alt+F12` | Peek definition (inline) |
| `Shift+F12` | Find all references |
| `F2` | Rename symbol |
| `Ctrl+.` | Quick fix / code actions |
| `Ctrl+Space` | Trigger autocomplete |
| `Ctrl+Shift+Space` | Trigger parameter hints |
| `Shift+Alt+F` | Format document |
| `Ctrl+K Ctrl+F` | Format selection |
| `F8` | Go to next error/warning |
| `Shift+F8` | Go to previous error/warning |
| `Ctrl+Shift+M` | Open Problems panel |

---

## Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+G` | Go to line number |
| `Ctrl+Shift+O` | Go to symbol in file |
| `Ctrl+T` | Go to symbol in workspace |
| `Alt+←` | Go back |
| `Alt+→` | Go forward |
| `Ctrl+Home` | Go to beginning of file |
| `Ctrl+End` | Go to end of file |
| `Ctrl+L` | Select entire line |

---

## Terminal

| Shortcut | Action |
|----------|--------|
| `Ctrl+\`` | Toggle terminal |
| `Ctrl+Shift+\`` | New terminal |
| `Ctrl+Shift+5` | Split terminal |
| `Ctrl+C` | Kill running process |
| `Ctrl+K` | Clear terminal (in terminal) |

---

## Git (Source Control)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Open Source Control panel |
| `Ctrl+Enter` | Commit staged changes (in message box) |
| `Ctrl+Shift+P → Git: Push` | Push to remote |
| `Ctrl+Shift+P → Git: Pull` | Pull from remote |

---

## Useful Settings to Enable

```json
// settings.json
{
  "editor.formatOnSave": true,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "editor.suggestSelection": "first",
  "terminal.integrated.defaultProfile.windows": "Git Bash",
  "workbench.colorTheme": "One Dark Pro"
}
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
