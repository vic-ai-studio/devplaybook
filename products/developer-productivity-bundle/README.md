# Developer Productivity Bundle

> Supercharge your terminal, editor, and workflows with battle-tested config files used by senior engineers.

**Price: $29** | **Version: 1.0** | **Last Updated: March 2026**

---

## What's Inside

| File | Description |
|------|-------------|
| `dotfiles/.zshrc` | Optimized Zsh config with aliases, functions, and performance tuning |
| `dotfiles/git-aliases.sh` | 50+ Git aliases for faster version control |
| `vscode/settings.json` | VS Code settings for maximum coding efficiency |
| `tmux/.tmux.conf` | tmux config with sensible defaults and prefix remapping |
| `tmux/tmux-cheatsheet.md` | Quick reference for all tmux shortcuts |
| `makefiles/Makefile.node` | Universal Makefile for Node.js projects |
| `makefiles/Makefile.python` | Universal Makefile for Python projects |
| `makefiles/Makefile.docker` | Universal Makefile for Docker projects |

---

## Quick Install

### Zsh Config

```bash
# Backup your existing .zshrc first
cp ~/.zshrc ~/.zshrc.backup

# Copy the new config
cp dotfiles/.zshrc ~/.zshrc

# Reload
source ~/.zshrc
```

### Git Aliases

```bash
# Add to your shell profile
echo "source ~/path/to/git-aliases.sh" >> ~/.zshrc
source ~/.zshrc
```

### VS Code Settings

```bash
# macOS
cp vscode/settings.json ~/Library/Application\ Support/Code/User/settings.json

# Linux
cp vscode/settings.json ~/.config/Code/User/settings.json

# Windows
cp vscode/settings.json %APPDATA%\Code\User\settings.json
```

### tmux

```bash
cp tmux/.tmux.conf ~/.tmux.conf
tmux source-file ~/.tmux.conf
```

### Makefiles

```bash
# Copy to your project root
cp makefiles/Makefile.node ./Makefile  # for Node projects
# Then run: make help
```

---

## File Structure

```
developer-productivity-bundle/
├── README.md               ← You are here
├── dotfiles/
│   ├── .zshrc              ← Optimized Zsh config
│   └── git-aliases.sh      ← 50+ Git aliases
├── vscode/
│   └── settings.json       ← VS Code efficiency settings
├── tmux/
│   ├── .tmux.conf          ← tmux configuration
│   └── tmux-cheatsheet.md  ← Shortcuts reference
└── makefiles/
    ├── Makefile.node       ← Node.js universal Makefile
    ├── Makefile.python     ← Python universal Makefile
    └── Makefile.docker     ← Docker universal Makefile
```

---

## What You'll Gain

- **Save 30+ min/day** with Git aliases that replace long commands with 2-3 letter shortcuts
- **Zero config fatigue** — sensible defaults that work across macOS, Linux, and WSL
- **Consistent environment** across all your machines
- **One-command workflows** with Make targets for common dev tasks

---

*DevPlaybook — Tools for Developers Who Ship*
*devplaybook.cc*
