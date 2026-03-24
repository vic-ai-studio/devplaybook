# Bash Scripting Cheat Sheet

---

## Script Header (Always Use)

```bash
#!/usr/bin/env bash
set -euo pipefail          # exit on error, undefined vars, pipe failures
IFS=$'\n\t'                # safer word splitting

# set -e  exit immediately on error
# set -u  treat undefined variables as errors
# set -o pipefail  catch errors in pipelines
```

---

## Variables

```bash
name="Alice"               # assign (no spaces around =)
echo "$name"               # use (always quote!)
echo "${name}"             # use with braces
unset name                 # delete variable

# Default values
${var:-default}            # use default if var is unset/empty
${var:=default}            # set and use default if unset/empty
${var:?error message}      # error and exit if unset/empty

# String operations
${#name}                   # length
${name:0:3}                # substring (start:length)
${name//old/new}           # replace all
${name/#prefix/}           # remove prefix
${name/%suffix/}           # remove suffix
${name^^}                  # uppercase
${name,,}                  # lowercase
```

---

## Arrays

```bash
arr=("a" "b" "c")          # declare array
arr+=("d")                 # append
echo "${arr[0]}"           # first element
echo "${arr[@]}"           # all elements
echo "${#arr[@]}"          # length
echo "${arr[@]:1:2}"       # slice (start:count)

# Associative array (bash 4+)
declare -A map
map["key"]="value"
echo "${map["key"]}"
echo "${!map[@]}"          # all keys
echo "${map[@]}"           # all values
```

---

## Conditionals

```bash
# if/elif/else
if [[ "$var" == "value" ]]; then
  echo "match"
elif [[ "$var" == "other" ]]; then
  echo "other"
else
  echo "no match"
fi

# Test operators
[[ "$a" == "$b" ]]         # string equal
[[ "$a" != "$b" ]]         # string not equal
[[ "$a" < "$b" ]]          # string less than
[[ -z "$a" ]]              # empty string
[[ -n "$a" ]]              # non-empty string
[[ $a -eq $b ]]            # integer equal
[[ $a -lt $b ]]            # integer less than
[[ $a -gt $b ]]            # integer greater than

# File tests
[[ -f "$path" ]]           # is a file
[[ -d "$path" ]]           # is a directory
[[ -e "$path" ]]           # exists
[[ -r "$path" ]]           # is readable
[[ -x "$path" ]]           # is executable

# Boolean
[[ "$a" && "$b" ]]         # AND
[[ "$a" || "$b" ]]         # OR
[[ ! "$a" ]]               # NOT
```

---

## Loops

```bash
# For loop
for i in 1 2 3; do
  echo "$i"
done

# C-style for
for ((i=0; i<10; i++)); do
  echo "$i"
done

# Loop over array
for item in "${arr[@]}"; do
  echo "$item"
done

# Loop over files
for file in *.txt; do
  echo "$file"
done

# While loop
while [[ $count -lt 5 ]]; do
  echo "$count"
  ((count++))
done

# Read file line by line
while IFS= read -r line; do
  echo "$line"
done < input.txt

# Loop with break/continue
for i in {1..10}; do
  [[ $i -eq 5 ]] && continue   # skip 5
  [[ $i -eq 8 ]] && break      # stop at 8
  echo "$i"
done
```

---

## Functions

```bash
function greet() {
  local name="$1"       # local variable
  local message="${2:-Hello}"  # with default
  echo "$message, $name!"
}

greet "Alice"
greet "Bob" "Hi"

# Return values
get_count() {
  echo 42              # return via stdout
}
count=$(get_count)     # capture with $()

# Return exit code
is_even() {
  [[ $(($1 % 2)) -eq 0 ]]  # returns 0 (true) or 1 (false)
}
is_even 4 && echo "even"
```

---

## Input & Output

```bash
# Read user input
read -p "Enter name: " name
read -s -p "Password: " password  # silent (for passwords)

# Positional arguments
$0    # script name
$1    # first argument
$@    # all arguments (as array)
$#    # argument count
$?    # exit code of last command

# Argument parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) name="$2"; shift 2;;
    --verbose) verbose=true; shift;;
    *) echo "Unknown: $1"; exit 1;;
  esac
done
```

---

## Error Handling

```bash
# Check command success
if ! command_that_might_fail; then
  echo "Command failed" >&2
  exit 1
fi

# Trap for cleanup
cleanup() {
  echo "Cleaning up..."
  rm -f "$tmpfile"
}
trap cleanup EXIT          # always run on exit
trap cleanup ERR           # run on error

# Temporary file (auto-cleaned)
tmpfile=$(mktemp)
trap "rm -f $tmpfile" EXIT

# Log errors to stderr
echo "Error: something went wrong" >&2
```

---

## Common Patterns

```bash
# Check required tool
command -v jq &>/dev/null || { echo "jq required"; exit 1; }

# Check if running as root
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Confirmation prompt
read -p "Continue? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# Retry with backoff
for i in 1 2 3; do
  command && break || sleep $((i * 2))
done
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
