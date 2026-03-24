# Linux CLI Cheat Sheet

---

## File System Navigation

```bash
pwd                          # current directory
ls -la                       # list with permissions + hidden files
ls -lh                       # human-readable sizes
cd -                         # go back to previous directory
tree -L 2                    # directory tree, 2 levels deep
find . -name "*.log"         # find files by name
find . -mtime -1             # files modified in last 24h
find . -size +100M           # files larger than 100MB
```

---

## File Operations

```bash
cp -r source/ dest/          # copy directory recursively
mv file.txt newname.txt      # move/rename
rm -rf dir/                  # remove directory ⚠️
mkdir -p a/b/c               # create nested directories
ln -s /actual/path link      # create symlink
touch file.txt               # create empty file / update timestamp
stat file.txt                # file metadata (size, dates, permissions)
```

---

## File Content

```bash
cat file.txt                           # print file
less file.txt                          # paginated view (q to quit)
head -20 file.txt                      # first 20 lines
tail -20 file.txt                      # last 20 lines
tail -f /var/log/app.log               # follow log in real-time
grep "error" file.txt                  # search in file
grep -r "pattern" ./src/               # recursive search
grep -i "error" file.txt               # case insensitive
grep -n "error" file.txt               # show line numbers
grep -v "debug" file.txt               # exclude matches
wc -l file.txt                         # line count
sort file.txt | uniq -c | sort -rn     # count unique lines, sorted
```

---

## Permissions

```bash
chmod 755 script.sh          # rwxr-xr-x (user:rwx, group:rx, other:rx)
chmod 644 file.txt           # rw-r--r-- (common for files)
chmod +x script.sh           # add execute permission
chmod -R 755 dir/            # recursive
chown user:group file.txt    # change owner and group
chown -R user:group dir/     # recursive

# Permission numbers:
# 4 = read, 2 = write, 1 = execute
# 7 = rwx, 6 = rw-, 5 = r-x, 4 = r--
```

---

## Process Management

```bash
ps aux                                  # all processes
ps aux | grep nginx                     # find process by name
top                                     # live process view (q to quit)
htop                                    # better top (if installed)
kill <PID>                              # graceful kill (SIGTERM)
kill -9 <PID>                           # force kill (SIGKILL) ⚠️
pkill nginx                             # kill by name
jobs                                    # list background jobs
bg %1                                   # resume job in background
fg %1                                   # bring job to foreground
nohup ./script.sh &                     # run immune to logout
```

---

## Networking

```bash
curl -I https://example.com              # HTTP headers only
curl -v https://example.com             # verbose (shows headers + body)
curl -X POST -H "Content-Type: application/json" \
  -d '{"key":"value"}' https://api.example.com

wget -O output.html https://example.com  # download file

netstat -tlnp                            # listening ports
ss -tlnp                                 # modern netstat alternative
lsof -i :8080                           # what's using port 8080
ping -c 4 google.com                    # check connectivity
traceroute google.com                   # trace network path
dig example.com                         # DNS lookup
nslookup example.com                    # DNS lookup (simpler)
```

---

## Disk & System

```bash
df -h                               # disk usage by filesystem
du -sh *                            # size of each item in current dir
du -sh /var/log/                    # size of directory
free -h                             # memory usage
uptime                              # load averages
uname -a                            # OS and kernel info
lscpu                               # CPU info
env                                 # print all environment variables
echo $PATH                          # print PATH
which python3                       # find executable location
```

---

## Text Processing

```bash
# awk: process columnar data
awk '{print $1, $3}' file.txt           # print columns 1 and 3
awk -F: '{print $1}' /etc/passwd        # colon-separated, print first field
awk 'NR>1' file.txt                     # skip first line (header)

# sed: stream editor
sed 's/old/new/g' file.txt              # replace all occurrences
sed -i 's/old/new/g' file.txt           # edit file in place ⚠️
sed '1d' file.txt                       # delete first line
sed -n '5,10p' file.txt                 # print lines 5-10

# Other
cut -d',' -f1,3 file.csv               # cut columns from CSV
tr '[:upper:]' '[:lower:]' < in > out  # to lowercase
xargs                                   # build commands from stdin
```

---

## Redirects & Pipes

```bash
command > file.txt          # redirect stdout (overwrite)
command >> file.txt         # redirect stdout (append)
command 2> errors.txt       # redirect stderr
command 2>&1 | tee log.txt  # stderr + stdout to file and terminal
command1 | command2         # pipe stdout to next command
echo "text" | pbcopy        # copy to clipboard (macOS)
cat file.txt | xclip        # copy to clipboard (Linux)
```

---

## SSH

```bash
ssh user@host                           # connect
ssh -p 2222 user@host                   # custom port
ssh -i ~/.ssh/key.pem user@host         # specify key
ssh -L 5432:localhost:5432 user@host    # port forward (tunnel)
scp file.txt user@host:/path/           # copy to remote
scp user@host:/path/file.txt ./         # copy from remote
rsync -avz ./local/ user@host:/remote/  # sync directory
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
