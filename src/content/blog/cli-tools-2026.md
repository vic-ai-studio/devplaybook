---
title: "CLI Tools in 2026: Essential Command Line Utilities for Modern Developers"
slug: cli-tools-2026
date: "2026-02-19"
author: DevPlaybook Team
category: Developer Experience
tags:
  - CLI
  - Command Line
  - Developer Tools
  - Productivity
  - Terminal
excerpt: "A curated guide to the best CLI tools for developers in 2026. From modern shells to productivity boosters, discover the command line utilities that expert developers rely on."
description: "Explore the essential CLI tools that modern developers use in 2026. Covers modern shells, package managers, Git clients, Docker tools, Kubernetes CLIs, and productivity utilities."
coverImage: "/images/blog/cli-tools-2026.jpg"
coverImageAlt: "Terminal window showing colorful CLI output with multiple panes"
status: "published"
featured: false
readingTime: 12
---

# CLI Tools in 2026: Essential Command Line Utilities for Modern Developers

The command line interface remains the most powerful and flexible tool in a developer's arsenal. While graphical tools come and go, the CLI endures because it composes, automates, and scales in ways that GUIs cannot match. In 2026, the CLI ecosystem has never been richer or more capable. This guide covers the essential command line tools that expert developers rely on, organized by category.

## Why CLI Tools Remain Essential

Modern IDEs and graphical tools abstract away much of the command line, but developers who master the CLI gain:

**Composability**: Small tools that do one thing well can be piped together to solve complex problems. `grep`, `awk`, and `sed` have been composing since the 1970s, and nothing has replaced them.

**Automation**: CLI tools are scriptable. A workflow that requires five clicks in a GUI can be automated with a shell script, run unattended, and repeated exactly.

**Remote access**: SSH plus CLI tools enables working on remote servers, containers, and cloud VMs that have no graphical interface.

**Resource efficiency**: CLIs use a fraction of the memory and CPU of their GUI equivalents. On constrained hardware or remote servers, this matters enormously.

**Debugging power**: When something breaks, the CLI often provides the most direct path to understanding what went wrong.

## Modern Shells

The shell is the foundation of CLI productivity. Most developers use the default shell without considering alternatives, but switching shells can meaningfully improve daily workflow.

### Zsh and Oh My Zsh

**Zsh** (Z shell) extends Bash with better auto-completion, globbing, and plugin extensibility. **Oh My Zsh** is a community-driven framework for managing Zsh configuration with hundreds of plugins and themes.

**Why use Oh My Zsh?**

- Automatic Git branch display in prompt
- Auto-correction of mistyped commands
- Hundreds of plugins for common tools (docker, kubectl, npm, etc.)
- Easy theme customization

**Installation:**

```bash
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

**Key plugins:**

```bash
# In ~/.zshrc
plugins=(
  git
  docker
  kubectl
  helm
  python
  node
  npm
  yarn
  pip
  brew
  macos
  z
  fzf
  you-should-use
)
```

### Fish Shell

**Fish** (Friendly Interactive Shell) prioritizes out-of-the-box usability over Bash compatibility. Features include:

- **Autosuggestions**: Fish suggests completions based on history as you type
- **Syntax highlighting**: Commands are highlighted in real-time; red for non-existent commands
- **Web-based configuration**: `fish_config` opens a browser UI for theme and function configuration
- **Simplified scripting**: Fish scripts are cleaner than Bash, at the cost of POSIX incompatibility

**Who should use Fish?** Developers who prefer configuration-over-code for shell customization and don't need strict POSIX compatibility. Fish is particularly good for interactive use; Bash remains standard for scripts that must be portable.

### Nushell

**Nushell** (Nu) reimagines the shell as structured data processor. Instead of text, commands pass structured tables, lists, and records. This enables powerful query-like operations:

```bash
# Traditional shell: grep for errors in log
cat server.log | grep ERROR

# Nushell: structured data manipulation
open server.log
  | lines
  | each { |line| if ($line | str contains "ERROR") { $line } }
  | table
```

**Who should use Nushell?** Data-oriented developers who appreciate the query model and work with structured data formats. Nushell is particularly strong when processing JSON, CSV, or log files.

### Selecting a Shell

| Shell | Best For | POSIX Compatible |
|-------|----------|-----------------|
| Bash | Universal scripts, maximum compatibility | Yes |
| Zsh + Oh My Zsh | Interactive use with Git-heavy workflows | Mostly |
| Fish | Beginners, interactive use, modern UX | No |
| Nushell | Data processing, modern shell experience | No |

## Package Management

### Homebrew (macOS/Linux)

Homebrew is the de facto package manager for macOS and has expanded to Linux. It installs tools that Apple's Xcode developer tools don't include.

**Essential commands:**

```bash
# Install a package
brew install gh

# Update brew and upgrade packages
brew update && brew upgrade

# List installed packages
brew list

# Search for packages
brew search postgresql

# Uninstall a package
brew uninstall old-package

# Clean up old versions
brew cleanup
```

**Installing development tools:**

```bash
brew install git go python node kubectl helm terraform ansible
brew install docker docker-compose minikube
brew install postgresql mysql redis mongodb-community
brew install jq yq ripgrep fd bat exa
```

### apt and dpkg (Debian/Ubuntu)

For Ubuntu and Debian-based Linux distributions:

```bash
# Update package lists
sudo apt update

# Install a package
sudo apt install nginx

# Upgrade all packages
sudo apt upgrade

# Search for packages
apt search python3-dev

# Remove a package
sudo apt remove nginx
```

### winget and Chocolatey (Windows)

Windows developers have several package manager options:

**winget** (Windows Package Manager) is Microsoft's official tool:

```powershell
winget install Git.Git
winget install Microsoft.PowerShell
winget search python
```

**Chocolatey** is a mature alternative with a larger package repository:

```powershell
choco install git -y
choco install docker-desktop -y
choco install vscode -y
```

## Git CLI

While GUI Git clients exist, the Git CLI remains indispensable for serious work.

### Essential Git Configuration

```bash
# Basic identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Better diffs
git config --global diff.tool vimdiff
git config --global difftool.prompt false

# Aliases for common operations
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.last "log -1 HEAD"

# Default branch naming
git config --global init.defaultBranch main

# Rebasing default for pulled branches
git config --global pull.rebase true
```

### LazyGit

**LazyGit** is a terminal UI for Git that sits between the raw CLI and full GUI clients. It provides visual staging, diffing, and conflict resolution without leaving the terminal.

**Features:**

- Visual commit staging with stage/unstage hunks and lines
- Interactive rebase editing
- Visual stash management
- Conflict resolution helpers
- Branch management and deletion

**Installation:**

```bash
brew install lazygit  # macOS
sudo apt install lazygit  # Ubuntu
```

### GitHub CLI

The **GitHub CLI** brings GitHub operations to the terminal:

```bash
# Install
brew install gh

# Authenticate
gh auth login

# Create a PR
gh pr create --title "Add new feature" --body "Description"

# Review a PR
gh pr checkout 123
gh pr view 123
gh pr merge 123

# Run workflows
gh workflow run ci.yml

# Manage issues
gh issue list
gh issue create --title "Bug found" --body "Description"

# Release management
gh release create v1.0.0 --notes "Release notes"
```

### Advanced Git Commands

```bash
# Interactive staging
git add -p  # Stage specific hunks

# Find the commit that broke something
git bisect start
git bisect bad
git bisect good v1.0.0
git bisect run npm test

# Cleanup merged branches
git branch --merged main | grep -v "main" | xargs git branch -d

# Stash with message
git stash push -m "WIP: new feature part 2"

# Work on two branches simultaneously
git worktree add ../feature-2 feature-branch

# Submodule management
git submodule update --init --recursive
```

## Docker and Container Tools

### Docker CLI Essentials

```bash
# Build an image
docker build -t myapp:1.0 .

# Run a container
docker run -d -p 8000:8000 --name myapp myapp:1.0

# See running containers
docker ps

# See all containers
docker ps -a

# Execute commands in running container
docker exec -it myapp bash

# View logs
docker logs -f myapp

# Clean up unused resources
docker system prune -a
```

###lazydocker

**lazydocker** provides a terminal UI for Docker, useful for visualizing container states, logs, and resource usage without leaving the terminal.

```bash
brew install lazydocker
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale a service
docker-compose up -d --scale worker=3

# Stop and remove
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Portainer

For teams wanting a GUI for Docker management, **Portainer** provides a web-based interface:

```bash
docker run -d -p 9000:9000 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer
```

## Kubernetes CLI

### kubectl Essentials

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes

# Namespaces
kubectl get namespaces
kubectl create namespace myapp
kubectl config set-context --current --namespace=myapp

# Deployments
kubectl get deployments
kubectl describe deployment myapp
kubectl rollout restart deployment/myapp

# Pods
kubectl get pods
kubectl logs -f deployment/myapp
kubectl exec -it myapp-pod-xyz -- /bin/bash

# Services
kubectl get services
kubectl expose deployment myapp --port=8000 --type=LoadBalancer

# Apply configuration
kubectl apply -f deployment.yaml

# Delete
kubectl delete -f deployment.yaml
```

### kubectl Plugins

**krew** is the plugin manager for kubectl:

```bash
# Install krew
brew install krew

# Install plugins
kubectl krew install ctx
kubectl krew install ijp
kubectl krew install neat
kubectl krew install resource-capacity

# Switch contexts
kubectl ctx

# Switch namespaces
kubectl ns

# Clean up output
kubectl get all | kubectl neat
```

### Lens and k9s

**Lens** (now Mirantis Lens) and **k9s** provide terminal-based Kubernetes dashboards:

- **Lens**: GUI-based Kubernetes IDE with excellent visualization
- **k9s**: Terminal UI for Kubernetes cluster management

```bash
# Install Lens
brew install --cask lens

# Install k9s
brew install k9s
```

## Text Processing Tools

Modern alternatives to classic Unix text processing tools:

### ripgrep (rg)

**ripgrep** is a faster, more intuitive alternative to `grep`:

```bash
# Recursive search
rg "function hello" .

# Case-insensitive
rg -i "error" .

# Show line numbers
rg -n "TODO" .

# Only filenames
rg -l "class User" .

# Extended regex
rg -e "error|fail" -e "warning" .

# Hidden files
rg -uuu "secret" .
```

### fd

**fd** is a faster, more user-friendly alternative to `find`:

```bash
# Find files by name
fd "*.py"

# Find directories
fd -t d "test"

# Find and delete
fd -e "tmp" -x rm

# Case-insensitive
fd -i "readme"

# Show hidden files
fd -H "config"
```

### bat

**bat** is a cat clone with syntax highlighting and Git integration:

```bash
# View file
bat README.md

# Show line numbers
bat -n script.sh

# Show all files including git changes
bat --diff

# Search within file with highlighting
bat app.py | rg "def"
```

### exa

**exa** is a modern alternative to `ls`:

```bash
# Long format with icons
exa -l --icons

# Tree view
exa --tree --level=2

# Git status
exa -l --git

# Sort by size
exa -lS

# Show extended attributes
exa -@l
```

### jq

**jq** is essential for JSON processing:

```bash
# Pretty print
cat data.json | jq .

# Extract field
cat data.json | jq '.name'

# Array operations
cat data.json | jq '.users[] | .name'

# Filter
cat data.json | jq '.[] | select(.age > 21)'

# Transform
cat data.json | jq '{names: [.users[]."name"]}'
```

### yq

**yq** extends jq's ease to YAML:

```bash
# Read YAML
cat config.yaml | yq '.server.port'

# Update YAML
yq -i '.server.port = 3000' config.yaml

# Convert YAML to JSON
cat config.yaml | yq -o json
```

## Fuzzy Finders

### fzf (Fuzzy Finder)

**fzf** is a general-purpose fuzzy finder that integrates with everything:

```bash
# Fuzzy find files
fzf

# Fuzzy find processes
ps aux | fzf

# Fuzzy find Git branches
git branch | fzf

# Fuzzy find recent commands
history | fzf

# Ctrl+R: fuzzy search command history
```

With shell integration (add to `.zshrc`):

```bash
eval "$(fzf --zsh)"
```

### fzf + ripgrep

Combine fzf and ripgrep for powerful code searching:

```bash
# Search code and select with fzf
rg --files | fzf | xargs vim
```

## Productivity Enhancers

### tldr Pages

**tldr** provides simplified man pages with practical examples:

```bash
tldr tar
tldr docker build
tldr kubectl apply
```

### httpie

**HTTPie** is a human-friendly HTTP client:

```bash
# GET request
http GET api.example.com/users

# POST with JSON
http POST api.example.com/users name="John" email="john@example.com"

# Form data
http -f POST example.com/form field1=value1 field2=value2

# Headers
http GET example.com Authorization:"Bearer token"
```

### glances

**glances** provides a cross-platform system monitoring tool:

```bash
brew install glances
glances
```

### htop

**htop** is an improved process viewer:

```bash
htop
```

### ncdu

**ncdu** provides disk usage analysis with navigation:

```bash
ncdu ~
```

## Terminal Multiplexers

### tmux

**tmux** enables multiple terminal sessions in one window:

```bash
# Start a new session
tmux new -s mysession

# Detach (Ctrl+B then D)
# Reattach
tmux attach -t mysession

# Split panes (Ctrl+B then | or -)
# Vertical split
# Horizontal split

# List sessions
tmux ls

# Kill session
tmux kill-session -t mysession
```

### zellij

**zellij** is a modern terminal multiplexer written in Rust:

```bash
brew install zellij
zellij
```

## Scripting Essentials

### Shellcheck

**shellcheck** analyzes shell scripts for errors:

```bash
brew install shellcheck
shellcheck myscript.sh
```

### fswatch

**fswatch** monitors file changes:

```bash
brew install fswatch

# Run command on file change
fswatch -0 file.txt | xargs -0 -n1 ./process.sh
```

## SSH and Remote Work

### SSH Config

Optimize SSH with configuration file `~/.ssh/config`:

```
Host prod
    HostName prod.example.com
    User admin
    Port 22
    IdentityFile ~/.ssh/prod_key
    ForwardAgent yes

Host *
    AddKeysToAgent yes
    UseKeychain yes
    ServerAliveInterval 60
```

### mosh

**mosh** (mobile shell) provides better remote session resilience:

```bash
brew install mosh
mosh prod -- "tmux attach"
```

## Putting It Together

The CLI tools you use daily shape your productivity. Invest time in:

1. **Learning one new tool per week**: Even 30 minutes exploring a new CLI tool expands your capabilities
2. **Creating shell aliases**: Automate repetitive commands with custom aliases
3. **Writing shell scripts**: Tasks you do repeatedly are candidates for automation
4. **Customizing your prompt**: A good prompt (like Oh My Zsh with Git integration) provides context without effort

The best CLI setup is one that feels like an extension of your thinking. When you can express a complex operation in seconds because your tools compose well, you've built something more valuable than any GUI.

## Conclusion

The CLI ecosystem in 2026 offers more capability than ever. Modern tools like ripgrep, fd, and bat outperform their classic counterparts while adding features. Shells like Fish and Nushell offer compelling alternatives to Bash. Container and Kubernetes tooling has matured to handle production workloads. And the composability that made Unix powerful 50 years ago remains the foundation of everything.

Pick the tools that match your workflow, invest time in learning them deeply, and automate everything you do repeatedly. The command line rewards investment with compounding returns.
