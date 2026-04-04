---
title: "jq 命令列 JSON 處理完全指南：範例與實戰大全"
description: "jq 是處理 JSON 資料的終極 CLI 工具。本文涵蓋篩選、轉換、陣列操作、條件判斷、格式化輸出，以及與 curl 結合的實戰 API 資料處理範例。"
date: "2026-04-04"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["jq", "json", "cli", "bash", "資料處理", "開發工具"]
readingTime: "13 分鐘"
---

每個開發者都需要處理 JSON，而 `jq` 是在終端機裡處理 JSON 最強大的工具。不需要寫 Python 或 Node.js 腳本，一行指令就能篩選、轉換、格式化任意複雜的 JSON 資料。

---

## 安裝

```bash
# macOS
brew install jq

# Ubuntu / Debian
sudo apt-get install jq

# Windows（scoop）
scoop install jq

# 確認安裝
jq --version
# jq-1.7.1
```

---

## 基本語法

```bash
jq [選項] [filter] [輸入檔案]

# 從 stdin 讀取
echo '{"name":"Alice","age":30}' | jq .

# 從檔案讀取
jq . data.json

# 與 curl 結合
curl -s https://api.example.com/users | jq .
```

`.` 表示「輸出全部並格式化」，是最基本的 filter。

---

## 欄位存取

```bash
# 取得單一欄位
echo '{"name":"Alice","age":30}' | jq '.name'
# "Alice"

# 取得巢狀欄位
echo '{"user":{"profile":{"city":"Taipei"}}}' | jq '.user.profile.city'
# "Taipei"

# 去掉字串引號（-r 選項）
echo '{"name":"Alice"}' | jq -r '.name'
# Alice（沒有引號）
```

---

## 陣列操作

```bash
# 範例資料
USERS='[
  {"id":1,"name":"Alice","role":"admin"},
  {"id":2,"name":"Bob","role":"user"},
  {"id":3,"name":"Carol","role":"admin"}
]'

# 取得陣列長度
echo $USERS | jq 'length'
# 3

# 取得第一個元素
echo $USERS | jq '.[0]'

# 取得指定範圍
echo $USERS | jq '.[0:2]'

# 迭代陣列（每個元素輸出）
echo $USERS | jq '.[]'

# 取得所有 name
echo $USERS | jq '.[].name'
# "Alice"
# "Bob"
# "Carol"
```

---

## 篩選（select）

```bash
# 只取 admin 角色
echo $USERS | jq '[.[] | select(.role == "admin")]'
# [{"id":1,"name":"Alice","role":"admin"},{"id":3,"name":"Carol","role":"admin"}]

# 只取 id > 1 的
echo $USERS | jq '[.[] | select(.id > 1)]'

# 結合多個條件
echo $USERS | jq '[.[] | select(.role == "admin" and .id > 1)]'
```

---

## 資料轉換（map）

```bash
# 只取 name 欄位
echo $USERS | jq '[.[] | .name]'
# 等同於
echo $USERS | jq '[.[].name]'

# 用 map 更簡潔
echo $USERS | jq 'map(.name)'
# ["Alice","Bob","Carol"]

# 重新命名欄位
echo $USERS | jq 'map({userId: .id, userName: .name})'
# [{"userId":1,"userName":"Alice"},...]

# 新增計算欄位
echo $USERS | jq 'map(. + {isAdmin: (.role == "admin")})'
```

---

## 字串操作

```bash
DATA='{"first":"John","last":"Doe","city":"Taipei"}'

# 字串插值
echo $DATA | jq '"Hello, \(.first) \(.last)!"'
# "Hello, John Doe!"

# 字串連接
echo $DATA | jq '.first + " " + .last'
# "John Doe"

# 大小寫轉換
echo '"hello world"' | jq 'ascii_upcase'
# "HELLO WORLD"

# 分割字串
echo '"2026-04-04"' | jq 'split("-")'
# ["2026","04","04"]
```

---

## 數值與聚合

```bash
ORDERS='[
  {"product":"A","price":100,"qty":3},
  {"product":"B","price":250,"qty":1},
  {"product":"C","price":80,"qty":5}
]'

# 計算總金額
echo $ORDERS | jq '[.[] | .price * .qty] | add'
# 950

# 最大值、最小值
echo $ORDERS | jq '[.[].price] | max'
# 250
echo $ORDERS | jq '[.[].price] | min'
# 80

# 平均值
echo $ORDERS | jq '[.[].price] | (add / length)'
# 143.33...

# 排序
echo $ORDERS | jq 'sort_by(.price)'
echo $ORDERS | jq 'sort_by(.price) | reverse'  # 降序
```

---

## 實戰：處理 GitHub API 回應

```bash
# 取得某 repo 最新 10 個 Issue 的標題和狀態
curl -s "https://api.github.com/repos/microsoft/vscode/issues?per_page=10" | \
  jq 'map({number: .number, title: .title, state: .state, labels: [.labels[].name]})'

# 只取開啟中的 Issue 數量
curl -s "https://api.github.com/repos/microsoft/vscode/issues?per_page=100" | \
  jq '[.[] | select(.state == "open")] | length'

# 取得所有 collaborator 的登入名稱
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/your-org/your-repo/collaborators" | \
  jq -r '.[].login'
```

---

## 實戰：處理 AWS CLI 輸出

```bash
# 列出所有 EC2 instance 的 ID 和名稱
aws ec2 describe-instances | \
  jq -r '.Reservations[].Instances[] |
    [.InstanceId, (.Tags // [] | map(select(.Key=="Name")) | .[0].Value // "no-name")] |
    @tsv'

# 找出所有 running 狀態的 instance
aws ec2 describe-instances | \
  jq '.Reservations[].Instances[] | select(.State.Name == "running") | .InstanceId'
```

---

## 輸出格式化

```bash
# 輸出為 CSV（@csv）
echo '[["Name","Age"],["Alice",30],["Bob",25]]' | \
  jq -r '.[] | @csv'
# "Name","Age"
# "Alice",30
# "Bob",25

# 輸出為 TSV（@tsv）
echo $USERS | jq -r '.[] | [.id, .name, .role] | @tsv'
# 1	Alice	admin
# 2	Bob	user
# 3	Carol	admin

# 壓縮輸出（單行）
echo '{"name":"Alice","age":30}' | jq -c .
# {"name":"Alice","age":30}
```

---

## 常用技巧

### 處理 null 值

```bash
# null 的預設值
echo '{"name":null}' | jq '.name // "unknown"'
# "unknown"

# 過濾 null
echo '[1, null, 2, null, 3]' | jq '[.[] | select(. != null)]'
# [1,2,3]
```

### 合併物件

```bash
echo '{"a":1} {"b":2}' | jq -s '.[0] * .[1]'
# {"a":1,"b":2}

# 在 pipe 中合併
echo '{"base":"data"}' | jq '. + {"extra": "added"}'
```

---

## 小結

`jq` 的學習曲線在於它的 filter 語法，但掌握 `.`、`[]`、`select`、`map`、`add` 這五個核心操作，就能處理 80% 的日常 JSON 資料需求。搭配 `curl`，你就有了一個強大的 API 資料探索和轉換工具，不需要打開任何 GUI。
