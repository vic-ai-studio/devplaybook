---
title: "SSH Key Generator Guide: Generate RSA and Ed25519 Keys for Secure Access"
description: "Learn how to generate SSH key pairs for GitHub, servers, and CI/CD pipelines. Comparison of RSA vs Ed25519, key sizes, passphrase best practices, and troubleshooting."
date: "2026-03-24"
tags: ["ssh", "security", "keys", "github", "devops", "linux", "developer-tools"]
readingTime: "8 min read"
---

# SSH Key Generator Guide: Generate RSA and Ed25519 Keys for Secure Access

SSH keys are the standard way to authenticate with remote servers, GitHub, and CI/CD systems — without passwords. This guide covers how to generate them correctly, choose the right key type, and set them up securely.

**[Generate RSA Keys Online →](/tools/rsa-key-generator)**

## SSH Key Pair Basics

SSH authentication uses asymmetric cryptography:
- **Private key** — stays on your machine. Never share it.
- **Public key** — shared with servers, GitHub, and services you want to access.

When you connect, the server challenges you with a random message encrypted with your public key. Only your private key can decrypt it — proving your identity without sending a password.

## Key Types: RSA vs Ed25519 vs ECDSA

| Type | Recommended Size | Speed | Security | Compatibility |
|------|-----------------|-------|----------|---------------|
| **Ed25519** | Fixed (256-bit) | Fastest | Excellent | Modern systems (2014+) |
| **RSA** | 4096-bit | Slower | Good | Maximum compatibility |
| **ECDSA** | 521-bit | Fast | Good | Most modern systems |

**Use Ed25519** if you're setting up new keys today — it's faster, shorter, and has better security properties than RSA.

**Use RSA** (4096-bit) if you need to connect to older systems that don't support Ed25519.

## Generate SSH Keys on Linux/macOS

### Ed25519 (recommended)

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

Output:
```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/user/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase): [choose a strong passphrase]
Enter same passphrase again:
Your identification has been saved in /home/user/.ssh/id_ed25519
Your public key has been saved in /home/user/.ssh/id_ed25519.pub
```

### RSA 4096-bit

```bash
ssh-keygen -t rsa -b 4096 -C "your@email.com"
```

### Named keys (multiple identities)

```bash
# For work GitHub account
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_work -C "work@company.com"

# For personal server
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_vps -C "personal-vps"
```

## Generate SSH Keys on Windows

### Using Git Bash or WSL

Same commands as Linux:
```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

### Using PowerShell (Windows 10+)

```powershell
# OpenSSH is built in on Windows 10 1809+
ssh-keygen -t ed25519 -C "your@email.com"
# Keys saved to C:\Users\YourName\.ssh\
```

## View Your Public Key

```bash
# Ed25519
cat ~/.ssh/id_ed25519.pub

# RSA
cat ~/.ssh/id_rsa.pub

# Output looks like:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your@email.com
```

The entire single line starting with `ssh-ed25519` or `ssh-rsa` is your public key. This is what you paste into GitHub, server `authorized_keys`, or CI/CD settings.

## Add Public Key to GitHub

1. Copy your public key:
```bash
cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard  # Linux
```

2. GitHub → Settings → SSH and GPG keys → New SSH key
3. Paste the public key, give it a name (e.g., "MacBook Pro 2026")
4. Test the connection:
```bash
ssh -T git@github.com
# Hi username! You've successfully authenticated.
```

## Add Public Key to a Server

```bash
# Append your public key to the server's authorized_keys
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server-ip

# Or manually:
cat ~/.ssh/id_ed25519.pub | ssh user@server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## SSH Config File: Managing Multiple Keys

Create `~/.ssh/config` to set per-host options:

```
# Personal GitHub
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519

# Work GitHub (separate account)
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work

# Production server
Host prod
  HostName 203.0.113.10
  User deploy
  IdentityFile ~/.ssh/id_ed25519_vps
  Port 2222
```

Usage with config:
```bash
# Clone work repo using work identity
git clone git@github-work:company/repo.git

# Connect to prod using alias
ssh prod
```

## SSH Key Security Best Practices

**Always use a passphrase.** A passphrase encrypts your private key on disk. Even if someone steals your key file, they can't use it without the passphrase.

```bash
# Add passphrase to existing key
ssh-keygen -p -f ~/.ssh/id_ed25519
```

**Use `ssh-agent` to avoid typing the passphrase repeatedly:**

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
# Enter passphrase once — agent remembers it for the session
```

**File permissions matter:**
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/config
```

**Rotate keys regularly.** Treat SSH keys like passwords: rotate annually or when someone who had access leaves.

**Separate keys for separate purposes.** Don't use the same key for your personal GitHub, your work server, and your CI/CD pipeline.

## SSH Keys in CI/CD

For GitHub Actions, CircleCI, and other CI systems:

```yaml
# GitHub Actions example
# Store private key as a secret: SSH_PRIVATE_KEY
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H your-server.com >> ~/.ssh/known_hosts

      - name: Deploy
        run: ssh deploy@your-server.com 'cd /app && git pull && npm run build'
```

**Generate a dedicated deployment key** — not your personal key:
```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "ci-deploy"
# -N "" creates a key with no passphrase (required for automated scripts)
cat deploy_key.pub  # Add to server's authorized_keys
cat deploy_key      # Store as CI secret
```

## Troubleshooting

**Permission denied (publickey):**
```bash
# Debug connection
ssh -v git@github.com

# Check which key is being offered
ssh-add -l

# Make sure the key is loaded
ssh-add ~/.ssh/id_ed25519
```

**Wrong key being used:**
```bash
# Force a specific key
ssh -i ~/.ssh/id_ed25519_work git@github.com
```

**Server not accepting key:**
```bash
# Check authorized_keys on server
cat ~/.ssh/authorized_keys  # Make sure your public key is in here
ls -la ~/.ssh/  # Check permissions
```

## Conclusion

Ed25519 is the recommended key type for all new SSH keys today. Generate it with `ssh-keygen -t ed25519`, always use a passphrase, and add it to `ssh-agent` for convenience. Use `~/.ssh/config` to manage multiple keys across different servers and accounts.

**[Generate RSA Key Pairs Online →](/tools/rsa-key-generator)**
