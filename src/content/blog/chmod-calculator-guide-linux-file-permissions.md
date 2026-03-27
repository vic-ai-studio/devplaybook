---
title: "Chmod Calculator: Understand Linux File Permissions Without Memorizing Octal"
description: "Use a chmod calculator to set Linux file permissions correctly. Convert between symbolic and octal notation, understand rwx bits, and avoid common permission mistakes."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["linux", "permissions", "devops", "shell", "developer-tools"]
readingTime: "7 min read"
---

# Chmod Calculator: Understand Linux File Permissions Without Memorizing Octal

File permissions control who can read, write, and execute files on Linux. Getting them wrong causes everything from security vulnerabilities to deployment failures. A chmod calculator converts between symbolic notation (`rwxr-xr-x`) and octal (`755`) instantly.

## How Linux Permissions Work

Every file has three permission sets:
- **Owner** (user) — the person who owns the file
- **Group** — users in the file's group
- **Others** — everyone else

Each set has three bits:
- **r** (read) = 4
- **w** (write) = 2
- **x** (execute) = 1

The octal value is the sum of the bits for each category.

## The Chmod Calculator

The [DevPlaybook Chmod Calculator](/tools/chmod-calculator) lets you click checkboxes for each permission and see the resulting octal code and symbolic notation. Enter `755` and see what each group can do. Toggle permissions visually to understand the output.

## Common Permission Values

| Octal | Symbolic | Use Case |
|-------|----------|---------|
| 777 | rwxrwxrwx | Avoid — everyone can do everything |
| 755 | rwxr-xr-x | Directories, executables |
| 644 | rw-r--r-- | Regular files, config files |
| 600 | rw------- | SSH keys, secrets |
| 750 | rwxr-x--- | Scripts visible to group |
| 640 | rw-r----- | Config readable by group |
| 400 | r-------- | Read-only critical files |

## Reading Symbolic Notation

`ls -la` output:

```
-rwxr-xr-x  1 alice dev  12345 Mar 24 09:00 app
drwxr-xr-x  2 alice dev   4096 Mar 24 09:00 config
-rw-r--r--  1 alice dev    512 Mar 24 09:00 README.md
-rw-------  1 alice alice  399 Mar 24 09:00 id_rsa
```

First character: `-` = file, `d` = directory, `l` = symlink.

Positions 2-10 are three groups of rwx: owner, group, others.

`rwxr-xr-x`:
- Owner: rwx (7) — read, write, execute
- Group: r-x (5) — read, execute
- Others: r-x (5) — read, execute

## Setting Permissions with chmod

```bash
# Octal notation
chmod 755 script.sh
chmod 644 config.json
chmod 600 ~/.ssh/id_rsa

# Symbolic notation
chmod u+x script.sh        # Add execute for owner
chmod g-w config.json      # Remove write for group
chmod o=r README.md        # Set others to read-only
chmod a+r public.html      # Add read for all (all = u+g+o)
chmod u=rwx,g=rx,o=rx app  # Set full permissions explicitly

# Recursive
chmod -R 755 /var/www/html
```

## The Execute Bit and Directories

For **files**, the execute bit means the file can run as a program.

For **directories**, the execute bit means you can enter the directory (cd) and list contents. A directory with `r--` (444) lets you see the filenames but not access them. With `--x` (111), you can access files by name but not list them. With `r-x` (555), you can list and access.

```bash
# Common mistake: chmod -R 644 on a directory tree
# This removes execute from directories, making them inaccessible
# Fix: use different permissions for files vs directories
find /var/www -type d -exec chmod 755 {} \;
find /var/www -type f -exec chmod 644 {} \;
```

## Special Permission Bits

Beyond the standard rwx bits, there are three special bits:

### Setuid (SUID) — 4xxx

When set on an executable, it runs as the file owner, not the caller:

```bash
chmod 4755 /usr/bin/passwd
# -rwsr-xr-x — 's' in owner's execute position
```

`passwd` uses SUID to modify `/etc/shadow` (owned by root) even when run by regular users.

### Setgid (SGID) — 2xxx

On directories, new files inherit the directory's group:

```bash
chmod 2775 /shared/project
# drwxrwsr-x — 's' in group's execute position
```

Useful for shared project directories where all files should belong to the project group.

### Sticky Bit — 1xxx

On directories, only the file owner can delete their files (even if others have write access):

```bash
chmod 1777 /tmp
# drwxrwxrwt — 't' in others' execute position
```

`/tmp` uses the sticky bit so users can't delete each other's temp files.

## Security Best Practices

### SSH Key Permissions

SSH is strict about key permissions. If they're too permissive, SSH refuses to use the key:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa       # Private key: owner read/write only
chmod 644 ~/.ssh/id_rsa.pub   # Public key: readable
chmod 600 ~/.ssh/authorized_keys
chmod 644 ~/.ssh/known_hosts
```

### Web Server Files

```bash
# Static files
chmod 644 /var/www/html/*.html
chmod 644 /var/www/html/*.css

# Directories
chmod 755 /var/www/html

# Config files with secrets
chmod 600 /etc/nginx/ssl/private.key
chmod 640 .env  # Owner rw, group r, others none
```

### Executable Scripts

```bash
chmod 755 deploy.sh    # Readable and executable by all
chmod 700 backup.sh    # Private — only owner can run
chmod 750 admin.sh     # Owner and group can execute
```

## Umask: Default Permission Mask

`umask` defines what permissions are **removed** by default when creating new files:

```bash
umask 022   # Files get 644, directories get 755 (subtract from 666/777)
umask 027   # Files get 640, directories get 750
```

Check current umask: `umask`
Set temporarily: `umask 022`
Set permanently: add to `~/.bashrc` or `/etc/profile`

## Changing Ownership with chown

Permissions control what users can do. `chown` controls who the owner is:

```bash
chown alice file.txt              # Change owner
chown alice:dev file.txt         # Change owner and group
chown :dev file.txt              # Change group only (same as chgrp)
chown -R alice:dev /var/www      # Recursive

# Change just the group
chgrp dev /var/www/html
```

## Troubleshooting Permission Errors

**"Permission denied" running a script:**
```bash
ls -la script.sh    # Check if execute bit is set
chmod +x script.sh  # Add it
```

**"Permission denied" writing to a file:**
```bash
ls -la file.txt     # Check owner and permissions
stat file.txt       # More detail including effective permissions
```

**Can't enter a directory:**
```bash
ls -la /parent/dir  # Check directory permissions
# Directory needs execute bit to cd into it
chmod +x /parent/dir
```

**Web server can't read files:**
```bash
# Check nginx/apache user
ps aux | grep nginx   # Shows www-data or nginx user
# Make sure files are readable by that user
chmod o+r /var/www/html -R
# Or add www-data to the group that owns the files
usermod -aG alice www-data
```

## ACLs for Fine-Grained Control

When standard rwx isn't granular enough, use Access Control Lists:

```bash
# Grant read access to a specific user
setfacl -m u:bob:r-- /shared/report.pdf

# Grant write access to a specific group
setfacl -m g:contractors:rw- /project/

# View ACLs
getfacl /shared/report.pdf

# Remove ACL entry
setfacl -x u:bob /shared/report.pdf
```

ACLs are available on most modern Linux filesystems (ext4, xfs) and give you user-specific permissions beyond the owner/group/others model.

## Summary

File permissions are a fundamental Linux concept that every developer needs. The chmod calculator converts between octal and symbolic notation instantly. Key values to remember: 755 for directories and executables, 644 for regular files, 600 for private keys and secrets. Always check permissions when scripts fail with "Permission denied" or when web servers can't serve files.
