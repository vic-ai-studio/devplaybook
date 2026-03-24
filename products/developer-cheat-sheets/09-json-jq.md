# JSON & jq Cheat Sheet

---

## JSON Basics

```json
{
  "string": "hello",
  "number": 42,
  "float": 3.14,
  "boolean": true,
  "null": null,
  "array": [1, 2, 3],
  "nested": {
    "key": "value"
  }
}
```

**Rules:**
- Keys must be double-quoted strings
- No trailing commas
- No comments
- Strings use `\"` for escaped quotes
- Numbers: no quotes, no leading zeros (except `0.x`)

---

## jq — Basic Access

```bash
# Identity (pretty-print)
cat data.json | jq '.'

# Get field
jq '.name' data.json

# Nested field
jq '.user.address.city' data.json

# Array element
jq '.[0]' data.json           # first
jq '.[-1]' data.json          # last
jq '.[2:5]' data.json         # slice

# Array of objects
jq '.[].name' data.json       # all names
jq '.users[0].email' data.json

# Remove quotes (raw output)
jq -r '.name' data.json
```

---

## jq — Filtering & Selecting

```bash
# Select where condition is true
jq '.[] | select(.age > 18)' users.json
jq '.[] | select(.status == "active")' users.json
jq '.[] | select(.name | startswith("A"))' users.json

# Select with multiple conditions
jq '.[] | select(.age > 18 and .country == "US")' users.json

# Filter keys
jq 'keys' data.json                   # array of keys
jq 'has("name")' data.json            # check if key exists
jq 'to_entries[] | select(.value != null)' data.json
```

---

## jq — Transformation

```bash
# Create new object
jq '{id: .id, fullName: .name}' user.json

# Map array
jq '[.[] | {id: .id, name: .name}]' users.json

# Map values
jq '.price * 1.1' product.json           # calculate
jq '.name | ascii_upcase' data.json      # transform string
jq '.tags | join(", ")' data.json        # array to string

# Add field
jq '. + {"newField": "value"}' data.json

# Delete field
jq 'del(.password)' user.json
jq 'del(.users[].password)' data.json   # delete from all items

# Rename field
jq '{newName: .oldName} + del(.oldName)' data.json
```

---

## jq — Aggregation

```bash
# Length
jq '.users | length' data.json

# Sum
jq '[.[].price] | add' products.json

# Min/Max
jq '[.[].age] | min' users.json
jq '[.[].age] | max' users.json

# Group by
jq 'group_by(.country)' users.json
jq 'group_by(.country) | map({country: .[0].country, count: length})' users.json

# Unique values
jq '[.[].country] | unique' users.json
jq '[.[].country] | unique | length' users.json    # count unique

# Sort
jq 'sort_by(.name)' users.json
jq 'sort_by(.age) | reverse' users.json
```

---

## jq — String Operations

```bash
jq '.name | length' data.json              # string length
jq '.name | ascii_upcase' data.json        # uppercase
jq '.name | ascii_downcase' data.json      # lowercase
jq '.name | ltrimstr("prefix")' data.json  # remove prefix
jq '.name | rtrimstr("suffix")' data.json  # remove suffix
jq '.name | split(" ")' data.json          # split to array
jq '.tags | join(", ")' data.json          # array to string
jq '"Hello \(.name)!"' data.json           # string interpolation
jq '.name | test("^A")' data.json          # regex test
jq '.name | capture("(?P<first>\\w+)")' data.json   # regex capture
```

---

## jq — Multiple Files & Input

```bash
# Multiple files
jq '.name' file1.json file2.json

# JSONL (one JSON object per line)
jq -c '.' data.jsonl                    # process each line
cat data.jsonl | jq -s '.'             # slurp all into array
cat data.jsonl | jq -s 'map(select(.active))' data.jsonl

# Compact output
jq -c '.' data.json                    # compact (no pretty)

# Null input (generate JSON)
jq -n '{"key": "value"}'

# Pipe from other commands
curl -s https://api.example.com/users | jq '.[].email'
aws s3api list-buckets | jq '.Buckets[].Name'
```

---

## Python json Module

```python
import json

# Parse JSON string
data = json.loads('{"name": "Alice", "age": 30}')
print(data["name"])          # Alice

# Read JSON file
with open("data.json") as f:
    data = json.load(f)

# Write JSON file
with open("output.json", "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Serialize to string
json_str = json.dumps(data, indent=2, default=str)  # default=str handles dates

# Pretty print
print(json.dumps(data, indent=2, sort_keys=True))
```

---

## JavaScript JSON

```javascript
// Parse
const data = JSON.parse(jsonString);

// Serialize
const jsonStr = JSON.stringify(data);
const pretty = JSON.stringify(data, null, 2);   // 2-space indent

// Deep clone (simple alternative)
const clone = JSON.parse(JSON.stringify(obj));  // not for dates/functions

// Fetch JSON from API
const res = await fetch('/api/data');
const data = await res.json();

// Handle BigInt
JSON.stringify({ id: BigInt(123) }, (k, v) =>
  typeof v === 'bigint' ? v.toString() : v
);
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
