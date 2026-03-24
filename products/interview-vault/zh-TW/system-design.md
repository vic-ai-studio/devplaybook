# 系統設計面試題

**50 道題目**，涵蓋可擴展性、分散式系統、資料庫設計、架構模式與實際系統設計問題。

---

## 核心概念（15 題）

### 1. 如何應對系統設計面試？ `[中級]`

**解答：**
使用 SNAKE 框架：
1. **Scope（範疇）**：釐清需求（5 分鐘）：功能性 + 非功能性需求、規模估算、限制條件
2. **Numbers（數字）**：估算：使用者數、每秒請求數（QPS）、資料大小、頻寬
3. **Architecture（架構）**：高層設計：主要元件、資料流
4. **Key components（關鍵元件）**：深入探討：資料模型、API、最關鍵部分的演算法
5. **Edge cases（邊界情況）**：故障、瓶頸、改進方向

**關鍵行為：** 大聲思考、設計前先問需求、不要一上來就直接給解法。面試官評估的是你的思考過程，而不只是最終設計。

---

### 2. 什麼是負載均衡？常見的演算法有哪些？ `[中級]`

**解答：**
負載均衡器將流量分散到多台伺服器。

**演算法：**
- **輪詢（Round Robin）**：依序分配請求，假設伺服器能力相等
- **加權輪詢（Weighted Round Robin）**：容量更大的伺服器獲得更多請求
- **最少連線（Least Connections）**：新請求分配給連線數最少的伺服器，適合請求時長不均等情況
- **IP Hash**：客戶端 IP 決定目標伺服器，確保同一客戶端命中同一伺服器（Session 親和性）
- **最短回應時間（Least Response Time）**：路由到最快的伺服器，需監控
- **隨機（Random）**：隨機選擇，對同質伺服器有效

**L4 vs L7：** L4（TCP）速度更快但無法檢查內容；L7（HTTP）可根據 URL、標頭、Cookie 路由。

---

### 3. 什麼是 CAP 定理？ `[中級]`

**解答：**
在發生網路分區的分散式系統中，只能同時保證三者中的兩者：

- **一致性（Consistency）**：所有節點在同一時間看到相同資料（每次讀取都返回最新寫入）
- **可用性（Availability）**：每個請求都收到回應（資料可能不是最新的）
- **分區容錯（Partition Tolerance）**：網路分區時系統繼續運作

**實際情況：** 網路分區確實會發生，必須選擇 CP 或 AP：
- **CP：** 若資料可能不一致則回傳錯誤（銀行、庫存系統）。例子：HBase、Zookeeper
- **AP：** 回傳可能過時的資料而非錯誤（社群動態、DNS）。例子：Cassandra、DynamoDB（預設）

---

### 4. 什麼是一致性雜湊（Consistent Hashing）？ `[高級]`

**解答：**
一致性雜湊解決分散式系統中節點增減時的資料重新分配問題。

**傳統取模 Hash 的問題：**
- 3 台伺服器：`hash(key) % 3`
- 新增第 4 台：`hash(key) % 4` → 幾乎所有 key 都需重新映射

**一致性雜湊做法：**
- 將伺服器和資料映射到虛擬環上（0 到 2³²-1）
- 資料存到順時針方向最近的伺服器
- 新增/移除節點時只需重新映射相鄰資料

**虛擬節點：** 每台物理伺服器映射多個虛擬位置，避免熱點，實現更均勻的分佈。

---

### 5. 什麼是資料庫正規化 vs 反正規化？ `[中級]`

**解答：**
**正規化：** 消除冗餘，分解成多個表（JOIN 查詢）
- 優點：資料一致性、較小儲存空間
- 缺點：複雜 JOIN 降低查詢效能

**反正規化：** 刻意引入冗餘，將資料預先 JOIN 好
- 優點：讀取速度快（減少 JOIN）
- 缺點：寫入時需要更新多處，有資料不一致風險

**選擇原則：**
- OLTP（交易型）：偏向正規化
- OLAP（分析型）：偏向反正規化（星型 Schema、寬表）
- 混合：根據讀寫比例決定

---

### 6. 說明垂直擴展（Scaling Up）和水平擴展（Scaling Out）的差別。 `[初級]`

**解答：**
| | 垂直擴展（Scaling Up） | 水平擴展（Scaling Out） |
|---|---|---|
| 做法 | 升級單機 CPU/RAM/磁碟 | 增加更多伺服器節點 |
| 限制 | 有硬體上限 | 理論上無限 |
| 複雜度 | 低（不改架構） | 高（需要分散式設計） |
| 成本 | 高（高端硬體很貴） | 可用商用硬體 |
| 高可用 | 仍是單點故障 | 天生容錯 |

**實際做法：** 先垂直擴展（簡單），碰到天花板後才水平擴展。

---

### 7. 什麼是 CDN？它如何改善效能？ `[初級]`

**解答：**
CDN（Content Delivery Network）是分散在全球的伺服器網路，在靠近使用者的邊緣節點快取內容。

**工作原理：**
1. 使用者請求資源 → DNS 解析到最近的 CDN 邊緣節點
2. 邊緣節點命中快取 → 直接回應（延遲低）
3. 邊緣節點未命中 → 向 Origin 伺服器請求，快取後回應

**適合 CDN 的內容：** 圖片、影片、JS/CSS 靜態資源、HTML（SSG）、API 回應。

**CDN 服務：** Cloudflare、AWS CloudFront、Fastly。

---

### 8. 什麼是微服務架構？優缺點是什麼？ `[中級]`

**解答：**
微服務將大型應用拆分成小型、獨立部署的服務，每個服務負責單一業務能力。

**優點：**
- 獨立部署和擴展（僅擴展需要的服務）
- 技術異質性（每個服務可用不同語言/框架）
- 故障隔離（一個服務掛掉不影響整體）
- 小型專注團隊

**缺點：**
- 分散式系統複雜性（網路延遲、分散式事務）
- 服務間通訊開銷
- 運維複雜（需要 Service Discovery、API Gateway）
- 分散式追蹤和除錯困難

**何時選用：** 系統已成熟且瓶頸明確；團隊夠大可分組；單體架構無法滿足需求時。

---

### 9. 什麼是 API Gateway？ `[中級]`

**解答：**
API Gateway 是微服務架構的入口點，集中處理橫切關注點：

- **路由**：將請求路由到對應的後端服務
- **認證/授權**：集中驗證 JWT、API Key
- **速率限制**：防止濫用
- **SSL 終止**：HTTPS 在 Gateway 解密
- **日誌/追蹤**：集中收集所有請求日誌
- **請求轉換**：修改請求/回應格式
- **負載均衡**：分散流量

**常見工具：** AWS API Gateway、Kong、Nginx、Traefik。

---

### 10. 什麼是服務發現（Service Discovery）？ `[高級]`

**解答：**
在微服務環境中，服務實例動態上線/下線，服務發現讓服務自動找到彼此的位置。

**兩種模式：**

**客戶端發現：** 服務直接查詢服務登錄（Registry），自行選擇目標實例
- 優點：客戶端可實作客製化負載均衡
- 缺點：每個客戶端都需要整合 Registry

**服務器端發現：** 請求通過負載均衡器，由它查詢 Registry
- 優點：客戶端無需知道 Registry
- 缺點：多一個跳轉

**工具：** Consul、etcd、Kubernetes DNS、AWS Cloud Map。

---

### 11. 什麼是事件驅動架構？ `[中級]`

**解答：**
事件驅動架構（EDA）中，服務透過發布/訂閱事件進行通訊，而非直接呼叫。

**核心元件：**
- **Event Producer**：發出事件（如「訂單已建立」）
- **Event Broker**：傳遞事件（Kafka、RabbitMQ）
- **Event Consumer**：訂閱並處理事件（如「寄送確認信」「更新庫存」）

**優點：** 鬆耦合（生產者不知道消費者）；容易新增消費者（不改生產者）；天生非同步。
**缺點：** 最終一致性；除錯複雜；事件順序問題。

---

### 12. 什麼是 CQRS（Command Query Responsibility Segregation）？ `[高級]`

**解答：**
CQRS 將讀（Query）和寫（Command）分成獨立的模型。

```
寫路徑：Command → Command Handler → Write Model（DB）→ 發出事件
讀路徑：Query → Query Handler → Read Model（優化的讀取視圖）
```

**優點：**
- 讀寫可獨立最佳化（讀側用反正規化 View，寫側用正規化）
- 可獨立擴展讀取和寫入

**缺點：** 複雜性高；讀取可能有短暫延遲（最終一致性）。

**配合使用：** 通常與 Event Sourcing（事件溯源）一起使用。

---

### 13. 什麼是 Circuit Breaker 模式？ `[高級]`

**解答：**
Circuit Breaker（斷路器）防止一個下游服務故障導致上游服務雪崩。

**三個狀態：**
1. **閉合（Closed）**：正常通過所有請求，記錄失敗率
2. **開路（Open）**：失敗率超過閾值，直接回傳錯誤（不等待超時），給下游時間恢復
3. **半開（Half-Open）**：超過重置時間後，放行一小部分請求測試下游是否恢復；成功則回閉合，失敗則重回開路

**Node.js 實作：** `opossum` 套件

---

### 14. 什麼是分散式追蹤（Distributed Tracing）？ `[高級]`

**解答：**
分散式追蹤跨服務追蹤一個請求的完整路徑，找出延遲瓶頸和錯誤來源。

**核心概念：**
- **Trace**：一個請求的完整旅程（含所有跨服務呼叫）
- **Span**：Trace 中的一個操作單位（帶開始/結束時間）
- **Trace ID**：貫穿所有服務的唯一識別符
- **Baggage**：跨服務傳遞的上下文資訊

**標準：** OpenTelemetry（廠商中立的標準）
**工具：** Jaeger、Zipkin、Datadog APM、AWS X-Ray

---

### 15. 什麼是 SLA、SLO、SLI？ `[中級]`

**解答：**
- **SLI（Service Level Indicator）**：衡量服務品質的具體指標（如錯誤率 = 失敗請求 / 總請求）
- **SLO（Service Level Objective）**：SLI 的目標值（如錯誤率 < 0.1%；P99 延遲 < 500ms）
- **SLA（Service Level Agreement）**：對客戶的法律/商業承諾（如「99.9% 可用性，否則賠償」）

**關係：** SLA ≥ SLO（SLO 通常比 SLA 嚴格，留有緩衝）。

**錯誤預算（Error Budget）：** `1 - SLO`。如果 SLO 是 99.9%，每月可以有 43.8 分鐘的停機。用完則暫停新功能發布，專注可靠性。

---

## 資料庫設計（10 題）

### 16. 如何設計 URL 短網址系統（如 bit.ly）？ `[中級]`

**解答：**
**需求估算：**
- 100M 個短網址 / 月
- 讀/寫比 = 100:1（高讀取）
- 短網址長度：6 字元（Base62 → 56B 組合）

**系統架構：**
```
Client → Load Balancer → URL Service → Cache（Redis）→ DB（PostgreSQL）
```

**核心邏輯（短網址生成）：**
1. **雜湊法**：MD5(originalUrl) 取前 6 字元（需處理碰撞）
2. **自增 ID + Base62 編碼**：簡單可靠，無碰撞
3. **預先生成**：預產生短碼池，使用時取出

**資料庫 Schema：**
```sql
CREATE TABLE urls (
  short_code VARCHAR(10) PRIMARY KEY,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  click_count INT DEFAULT 0
);
```

**快取策略：** Redis 快取熱門短碼；回應 301（永久）或 302（可追蹤點擊數）重新導向。

---

### 17. 如何設計 Twitter 的 Timeline 系統？ `[高級]`

**解答：**
**兩種策略：**

**Push（寫時扇出）：** 發推時，直接寫入所有追蹤者的 Timeline 快取
- 優點：讀取快（O(1)）
- 缺點：大 V 有百萬追蹤者時寫入量爆炸

**Pull（讀時扇出）：** 讀取 Timeline 時，即時聚合追蹤對象的推文
- 優點：寫入簡單
- 缺點：熱點讀取慢

**Twitter 實際做法（混合）：**
- 一般使用者：Push（預先生成 Timeline）
- 大 V（> 10萬追蹤者）：Pull（讀時混入）
- 快取用 Redis，Timeline 為預排序的推文 ID 列表

---

### 18. 如何設計類似 YouTube 的影片上傳系統？ `[高級]`

**解答：**
**系統流程：**
1. **斷點續傳上傳**：前端分塊上傳到 Object Storage（S3）
2. **事件觸發**：上傳完成後 S3 觸發 Message Queue 事件
3. **轉碼服務**：Consumer 取出任務，用 FFmpeg 轉換成 360p/720p/1080p
4. **CDN 分發**：轉碼完成後推送到 CDN 邊緣節點
5. **中繼資料儲存**：PostgreSQL 儲存影片資訊；Elasticsearch 儲存搜尋索引

**關鍵挑戰：**
- 轉碼非常耗 CPU → 水平擴展 Worker 節點
- 自適應串流（HLS/DASH）→ 按頻寬動態調整品質

---

### 19. 如何設計限速（Rate Limiter）系統？ `[中級]`

**解答：**
**Token Bucket 演算法：**
```
每個使用者有一個桶（容量 = burst size）
固定速率往桶裡加 Token
每次請求消耗一個 Token
桶空了 → 429 Too Many Requests
```

**分散式實作（Redis）：**
```lua
-- Lua 腳本（原子操作）
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then redis.call('EXPIRE', key, window) end
if current > limit then return 0 end
return 1
```

**部署位置：** API Gateway 層（集中）或每個服務本地（分散，加總可能超量）。

---

### 20. 如何設計搜尋自動完成功能？ `[中級]`

**解答：**
**方案一：前綴樹（Trie）**
- 記憶體中的樹狀結構
- 時間複雜度：O(前綴長度)
- 問題：記憶體消耗大，難以水平擴展

**方案二：Elasticsearch**
- Edge NGram 分詞器 → 支援前綴匹配
- 天生分散式、可水平擴展
- 支援 Fuzzy Match（容錯拼寫）

**快取策略：**
- 熱門搜尋詞直接快取（涵蓋 80% 的查詢）
- 快取 TTL = 10 分鐘（趨勢搜尋需時效性）

**前端最佳化：** Debounce（300ms）減少請求數。

---

### 21. 如何設計分散式緩存系統？ `[高級]`

**解答：**
**問題：**
- 一致性：快取失效時多個請求同時打到 DB（快取擊穿）
- 分散式：多節點快取如何協調？

**架構選擇：**
1. **Redis Standalone**：單點，適合中小規模
2. **Redis Sentinel**：主從 + 自動 Failover
3. **Redis Cluster**：自動分片，16384 個 hash slot，適合大規模

**快取一致性策略：**
- Write-invalidate（最常見）：寫入 DB 後刪除快取
- Write-update：寫入 DB 後更新快取（有競態條件風險）
- 延遲雙刪：先刪快取 → 更新 DB → 等一段時間後再刪一次（防骯髒讀）

---

### 22. 如何設計聊天系統？ `[高級]`

**解答：**
**即時通訊技術：**
- **WebSocket**：雙向全雙工連線（最佳，推薦）
- **Long Polling**：客戶端輪詢（降級方案）
- **SSE**：單向推送（不適合聊天）

**架構：**
```
Client ←WebSocket→ Chat Server → Message Queue（Kafka）
                                 ↓
                           Message DB（Cassandra/MongoDB）
                           Notification Service
```

**訊息儲存：**
- 用 Cassandra：按 `(channel_id, timestamp)` 分片，讀取效能佳
- 歷史訊息分頁：cursor-based pagination

**線上狀態（Presence）：** Redis 設 TTL，客戶端定期發 Heartbeat；或 WebSocket 斷開時更新。

---

### 23. 如何設計通知系統（Notification System）？ `[中級]`

**解答：**
**通知類型：** Push（App）、Email、SMS、In-App

**架構：**
```
事件觸發 → Message Queue → Notification Service → Provider
                                                  ├── FCM/APNs（Push）
                                                  ├── SendGrid/SES（Email）
                                                  └── Twilio（SMS）
```

**關鍵設計點：**
- **可靠性**：用 Message Queue 確保不丟失，支援重試
- **去重**：相同通知不重複發送（冪等鍵）
- **使用者偏好**：資料庫儲存各渠道的訂閱設定
- **退訂處理**：尊重 Unsubscribe，維護黑名單

---

### 24. 如何設計電商的庫存系統（防超賣）？ `[高級]`

**解答：**
**問題：** 高並發購買同一商品，不能超賣。

**方案一：資料庫 UPDATE + 條件判斷**
```sql
UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = ? AND quantity > 0;
-- 影響 0 行 = 庫存不足
```
利用資料庫原子操作，PostgreSQL 行鎖確保一致性。

**方案二：Redis 原子操作**
```lua
-- Lua 腳本（原子）
local stock = redis.call('GET', KEYS[1])
if tonumber(stock) > 0 then
  redis.call('DECR', KEYS[1])
  return 1  -- 成功
end
return 0  -- 失敗
```

**高並發場景：** 預熱庫存到 Redis → Redis 扣減 → 非同步同步到 DB（要做兜底校驗）。

---

### 25. 如何設計 Uber 的地理位置匹配系統？ `[高級]`

**解答：**
**核心需求：** 找到乘客附近的所有司機（如 5 公里內）

**地理索引技術：**
- **Geohash**：將經緯度編碼為字串（前綴相同 = 鄰近）
- **Quadtree**：遞迴四等分地圖，動態適應密度
- **PostGIS / MongoDB 地理索引**：內建地理查詢

**Redis GEO 方案（最常見）：**
```bash
GEOADD drivers 121.5 25.0 "driver:123"
GEORADIUS drivers 121.5 25.0 5 km COUNT 10 ASC
```
司機每隔 4~5 秒更新位置到 Redis。

**一致性：** 司機位置允許最終一致性（稍舊的位置也可接受）。

---

## 架構模式（10 題）

### 26. 什麼是 Saga 模式？如何處理分散式事務？ `[高級]`

**解答：**
跨微服務的事務無法使用傳統 2PC（兩階段提交），Saga 用一系列本地事務和補償事務替代。

**編舞（Choreography）：** 每個服務完成後發布事件，下一個服務監聽並執行
- 優點：去中心化，鬆耦合
- 缺點：難以追蹤完整流程

**指揮（Orchestration）：** Saga Orchestrator 集中協調每個步驟
- 優點：流程清晰，易監控
- 缺點：Orchestrator 成為中心化元件

**補償事務範例：**
```
下訂單 → 扣庫存 → 扣餘額 → 成功
       ↓失敗    ↓失敗
補償：  無需     恢復庫存
補償：  無需     無需      退款
```

---

### 27. 什麼是 Event Sourcing（事件溯源）？ `[高級]`

**解答：**
傳統方式儲存「最新狀態」；Event Sourcing 儲存「導致狀態的所有事件序列」。

**範例：** 銀行帳戶
- 傳統：`balance = 1000`
- Event Sourcing：`[Deposited(500), Deposited(700), Withdrawn(200)]` → 重播得 `balance = 1000`

**優點：**
- 完整審計日誌
- 可重播事件以除錯或建新的讀取模型
- 天生支援 CQRS

**缺點：**
- 讀取當前狀態需重播事件（用 Snapshot 優化）
- 事件 Schema 演化複雜
- 儲存空間較大

---

### 28. 什麼是 BFF（Backend for Frontend）模式？ `[中級]`

**解答：**
BFF 為每個前端（Web、iOS、Android）建立專屬的後端 API 層，而非共用同一個 API。

**問題背景：** 手機 App 只需要輕量資料；Web 需要豐富資料 → 共用 API 難以同時滿足。

**BFF 做法：**
```
iOS App → iOS BFF → 內部微服務
Android  → Android BFF → 內部微服務
Web App → Web BFF → 內部微服務
```

**優點：** 每個前端有最適合自己的 API；前端和後端可獨立迭代。
**缺點：** 程式碼重複；需要維護多個 BFF。

---

### 29. 如何設計冪等性 API？ `[中級]`

**解答：**
冪等鍵（Idempotency Key）確保相同請求只執行一次。

**流程：**
1. 客戶端在請求標頭帶 `Idempotency-Key: uuid-v4`
2. 伺服器查看 Redis/DB 是否已處理過此 Key
3. 已處理 → 直接回傳之前的結果（不再執行）
4. 未處理 → 執行並儲存 Key 和結果（TTL = 24h）

```javascript
app.post('/payments', async (req, res) => {
  const key = req.headers['idempotency-key'];
  const cached = await redis.get(`idempotent:${key}`);
  if (cached) return res.json(JSON.parse(cached));

  const result = await processPayment(req.body);
  await redis.setex(`idempotent:${key}`, 86400, JSON.stringify(result));
  res.json(result);
});
```

---

### 30. 什麼是藍綠部署（Blue-Green Deployment）？ `[中級]`

**解答：**
藍綠部署維護兩個完全相同的生產環境（藍 = 當前，綠 = 新版本）。

**流程：**
1. 新版本部署到「綠」環境（生產流量仍在「藍」）
2. 對「綠」執行驗收測試
3. 切換負載均衡器，將流量從「藍」切到「綠」
4. 「藍」保留一段時間作為回滾選項

**優點：** 零停機部署；快速回滾（切回負載均衡器即可）。
**缺點：** 需要雙倍資源；資料庫 Schema 變更複雜（兩個版本需同時相容）。

---

### 31. 什麼是 Canary 部署？ `[中級]`

**解答：**
Canary 部署先將新版本推送給一小部分使用者（1-5%），確認無問題後逐步擴大。

**流程：**
```
1% 流量 → 新版本  (監控指標)
   ↓ 無問題
10% 流量 → 新版本
   ↓ 無問題
100% 流量 → 新版本
```

**關鍵指標：** 錯誤率、P99 延遲、業務指標（轉換率、購買率）。

**工具：** Kubernetes + Argo Rollouts、AWS CodeDeploy、Feature Flags（LaunchDarkly）。

---

### 32. 什麼是 Strangler Fig 模式？ `[高級]`

**解答：**
Strangler Fig 是從單體（Monolith）逐步遷移到微服務的模式，而非大爆炸式重寫。

**流程：**
1. 新功能直接做成微服務（不再加到單體）
2. 在舊功能前面加一個 Proxy/Facade
3. 逐步將單體的功能遷移到微服務（由外而內）
4. 最終單體被「絞殺」（不再需要）

**名稱來源：** 絞殺榕樹（Strangler Fig）環繞宿主樹生長，最終宿主枯死。

---

### 33. 如何處理微服務之間的通訊？ `[中級]`

**解答：**
**同步通訊：**
- HTTP/REST：簡單，普遍，有耦合
- gRPC：更快（Protocol Buffers），強型別，適合內部服務

**非同步通訊：**
- Message Queue（Kafka、RabbitMQ）：解耦，可緩衝，適合事件驅動

**選擇原則：**
- 需要立即回應（如查詢使用者資料）→ 同步
- 觸發一個操作不需等結果（如發送通知）→ 非同步
- 一對多（廣播事件）→ Pub/Sub

---

### 34. 什麼是 Bulkhead 模式？ `[高級]`

**解答：**
Bulkhead（艙壁）模式隔離系統的不同部分，防止一個元件的故障拖垮整個系統。

**概念類比：** 船的艙壁——一個艙進水，其他艙不受影響。

**實作方式：**
- **執行緒池隔離**：不同服務用不同執行緒池，某服務耗盡不影響其他
- **信號量隔離**：限制同時使用某資源的最大並發數
- **獨立部署**：關鍵服務獨立部署，不共用資源（記憶體、CPU）

**Netflix Hystrix / Resilience4j** 提供開箱即用的 Bulkhead 實作。

---

### 35. 如何設計高可用的資料庫架構？ `[高級]`

**解答：**
**Master-Replica（主從複製）：**
```
Primary（讀寫）
  ├── Replica 1（唯讀）
  ├── Replica 2（唯讀）
  └── Replica 3（備援，可提升為 Primary）
```

**Failover 機制：**
- 哨兵（Sentinel）自動偵測 Primary 是否存活，自動選舉新 Primary
- 應用層：重試連線，連接到新 Primary

**RTO（Recovery Time Objective）與 RPO（Recovery Point Objective）：**
- RTO：系統恢復服務的最大可接受時間
- RPO：可接受的最大資料遺失量

**Multi-Region 架構：** 主 Region 故障時，切換到備用 Region（需考慮跨 Region 延遲和資料同步）。

---

## 實戰設計（15 題）

### 36. 設計一個 Key-Value 儲存系統（如 Redis）。 `[高級]`

**解答：**
**核心操作：** GET、SET、DEL、EXPIRE

**儲存層：**
- 記憶體中用雜湊表（Hash Map）儲存 key → value
- 過期處理：Lazy（每次存取才檢查）+ Periodic（背景定時清除）

**持久化：**
- **RDB（Snapshot）**：定時將記憶體 Dump 到磁碟，啟動時重載
- **AOF（Append-Only File）**：每次寫操作追加日誌，重播可還原狀態

**複製：** Master 接受寫入，Replica 同步複製；Replica 可服務讀請求。

**叢集：** 一致性雜湊分片，16384 個 Hash Slot 分配給各節點。

---

### 37. 設計一個分散式任務排程系統（如 Cron）。 `[高級]`

**解答：**
**需求：** 定時觸發任務；任務只執行一次（即使多個 Worker）；失敗重試。

**架構：**
```
Scheduler（Master）
  ├── 解析 Cron Expression，計算下次執行時間
  ├── 到期任務推入 Message Queue
  └── 高可用：Leader Election（Redis SETNX 或 Zookeeper）

Worker Pool
  ├── 從 Queue 消費任務
  ├── 執行完畢後 ACK
  └── 失敗則重入 Queue（限最大重試次數）
```

**避免重複執行：** 分散式鎖（Redis SETNX）確保同一時刻只有一個 Worker 執行某任務。

**狀態追蹤：** 資料庫記錄每次執行的結果（成功/失敗/重試次數）。

---

### 38. 設計一個即時排行榜系統。 `[中級]`

**解答：**
**Redis Sorted Set（最佳方案）：**
```bash
# 更新分數
ZADD leaderboard:global 1500 "player:123"
ZINCRBY leaderboard:global 50 "player:123"  # 加 50 分

# 取前 10 名
ZREVRANGE leaderboard:global 0 9 WITHSCORES

# 查詢某玩家排名（0-based）
ZREVRANK leaderboard:global "player:123"
```

**多維度排行榜（日榜/週榜/月榜）：**
- `leaderboard:daily:20260324`（TTL = 1 天）
- `leaderboard:weekly:2026-W13`（TTL = 1 週）

**分片策略：** 如果玩家數超過千萬，按分數範圍分片（Top 10K 存 Redis，其餘存 DB）。

---

### 39. 設計一個電商的商品搜尋功能。 `[中級]`

**解答：**
**基本搜尋流程：**
```
使用者輸入 → API Gateway → Search Service → Elasticsearch
```

**Elasticsearch 設計：**
- **索引 Mapping**：商品名稱（fulltext）、分類（keyword）、價格（range）、評分（number）
- **Multi-field 搜尋**：同時搜尋標題、描述、品牌
- **Fuzzy 搜尋**：容錯拼寫（`fuzziness: AUTO`）
- **過濾器（Filter）**：價格範圍、分類、評分（不影響相關性分數，可快取）

**資料同步：**
- DB 寫入後，透過 Kafka 事件同步到 ES
- 每日批量重建索引（防止資料漂移）

**搜尋結果最佳化：** 結合文字相關性分數 + 業務因素（銷量、庫存、廣告競價）。

---

### 40. 設計 Google Drive 的檔案儲存系統。 `[高級]`

**解答：**
**上傳流程：**
1. 前端分塊（Chunk）上傳，每塊 5MB
2. 服務端分配 Upload ID，追蹤已上傳的分塊
3. 所有分塊完成後，合併並儲存到 Object Storage（S3）
4. 更新中繼資料（DB）

**去重（Deduplication）：** 計算文件 Hash（SHA-256），相同 Hash 不重複儲存（Content Addressable Storage）。

**資料庫 Schema：**
```
files: id, user_id, name, content_hash, size, mime_type, created_at
chunks: id, file_id, chunk_index, checksum, storage_path
shares: id, file_id, shared_with_user_id, permission, expires_at
```

**同步（Sync）：** 用 Delta Sync（只同步變更部分）；版本控制用 event log。

---

### 41. 設計一個 API 速率限制器（API Rate Limiter）。 `[中級]`

（見 #19 Rate Limiter 系統設計，此處補充 API 層面細節）

**多維度限制：**
- 每個 API Key：100 req/min
- 每個 IP：20 req/min（防濫用）
- 每個端點：部分敏感端點更嚴格

**回應標頭：**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1700000000
Retry-After: 60  （429 時才加）
```

---

### 42. 如何設計支付系統的冪等性？ `[高級]`

**解答：**
支付是最典型需要冪等性的場景——重試不能重複扣款。

**架構：**
```
客戶端 → 生成 Idempotency-Key（UUID）→ 支付 API
                                          ↓
                              查 Redis/DB 此 Key 是否存在
                                 已存在 → 直接回傳原結果
                                 不存在 → 執行支付 → 儲存結果
```

**狀態機：**
```
PENDING → PROCESSING → SUCCESS / FAILED
```
PROCESSING 狀態下的重試：等待或回傳 202 Accepted（非同步查詢結果）。

**對帳（Reconciliation）：** 定時與支付閘道對帳，修正狀態不一致的訂單。

---

### 43. 設計一個高效能的圖片上傳和處理服務。 `[中級]`

**解答：**
**上傳流程（Pre-signed URL）：**
1. 客戶端請求後端取得 S3 Pre-signed URL
2. 客戶端直接上傳到 S3（不經過後端，減輕伺服器壓力）
3. S3 觸發事件 → 圖片處理服務

**處理管道：**
```
S3 → SQS → Image Processor（Lambda / Worker）
                ├── 生成縮圖（100x100, 400x400, 800x800）
                ├── 壓縮（mozjpeg / WebP 轉換）
                ├── 加浮水印（可選）
                └── 儲存到 CDN Origin S3
```

**CDN 分發：** 處理完成後推送到 CDN；URL 格式含尺寸（`/img/uuid_800x800.webp`）。

---

### 44. 設計 Slack 的訊息搜尋功能。 `[高級]`

**解答：**
**挑戰：** 訊息量龐大（每天數億條）；搜尋需支援即時輸入；需要頻道、用戶、時間範圍過濾。

**索引策略：**
- 使用 Elasticsearch
- 索引 Mapping：`message_text`（fulltext）、`channel_id`（keyword）、`user_id`（keyword）、`timestamp`（date）
- 分片策略：按 `channel_id` 路由到同一分片，保證同頻道查詢效率

**搜尋 API：**
```json
{
  "query": {
    "bool": {
      "must": [{ "match": { "text": "deploy failed" }}],
      "filter": [
        { "term": { "channel_id": "C123" }},
        { "range": { "timestamp": { "gte": "2026-01-01" }}}
      ]
    }
  }
}
```

**效能：** 熱門詞條快取；自動完成用 Edge NGram；舊訊息 cold tier 歸檔。

---

### 45. 如何設計 Instagram 的推薦系統？ `[高級]`

**解答：**
**兩階段：候選集生成 → 排序**

**候選集生成（Recall）：** 從數億內容中快速篩選候選集（幾千條）
- 協同過濾：相似用戶喜歡的內容
- 內容相似度：基於用戶歷史互動的相似內容
- 追蹤關係：追蹤對象的最新貼文

**排序（Ranking）：** 機器學習模型對候選集評分
- 特徵：用戶互動歷史、內容特徵、時間衰減、多樣性
- 目標：最大化長期使用者參與度（而非只是點擊率）

**基礎設施：**
- 特徵儲存（Feature Store）：線上（低延遲，Redis）+ 離線（批量計算，Spark）
- 模型服務：TensorFlow Serving / TorchServe

---

### 46. 設計一個 Web Crawler 系統。 `[高級]`

**解答：**
**架構：**
```
Seed URLs → URL Frontier（Priority Queue）
              ↓
         URL Fetcher（Scheduler 限速）
              ↓
         Content Parser（提取連結 + 內容）
              ├── 已爬連結 → URL Frontier
              └── 內容 → 儲存（S3）→ 建立索引（Elasticsearch）
```

**關鍵設計：**
- **去重**：Bloom Filter（記憶體高效）記錄已爬 URL
- **優先佇列**：PageRank / 新鮮度分數決定爬取順序
- **Robots.txt**：尊重 `Disallow` 規則、`Crawl-delay`
- **分散式**：多台 Fetcher Worker，一致性雜湊分配域名（避免重複爬同一域名）
- **限速**：每個域名最多 1 req/sec，防止對目標站造成負擔

---

### 47. 設計一個多租戶 SaaS 系統。 `[高級]`

**解答：**
（見資料庫設計 #35 多租戶策略）

**認證層：**
- 登入時從 Token 取得 `tenant_id`
- Middleware 自動注入 `tenant_id` 到所有查詢

**資源隔離：**
```javascript
// Prisma 中介軟體（強制 tenant 隔離）
prisma.$use(async (params, next) => {
  if (tenantedModels.includes(params.model)) {
    params.args.where = {
      ...params.args.where,
      tenantId: getCurrentTenant(),
    };
  }
  return next(params);
});
```

**計費：** 每租戶追蹤使用量（API 呼叫數、儲存空間、使用者數）；月底產生帳單。

---

### 48. 設計一個實時協作文件系統（如 Google Docs）。 `[高級]`

**解答：**
**核心挑戰：** 多個使用者同時編輯時如何合併衝突？

**技術方案：**
- **Operational Transformation（OT）**：Google Docs 使用，轉換並發操作確保一致性（實作複雜）
- **CRDT（Conflict-Free Replicated Data Types）**：數學保證不衝突（Notion、Linear 使用）

**CRDT 簡介：**
每個字元有唯一 ID 和位置（如 `(0, 10)` 之間），合併時不會衝突。刪除只標記（不真刪），最終一致性。

**WebSocket 即時同步：**
1. 本地變更 → 樂觀應用（即時響應）
2. 同時發送到伺服器
3. 伺服器廣播給其他客戶端
4. 客戶端合併（CRDT 保證一致）

---

### 49. 如何設計 GitHub 的 CI/CD Pipeline 系統？ `[高級]`

**解答：**
**架構：**
```
Git Push → Webhook → Pipeline Trigger Service
                        ↓
                   Job Scheduler（分析 YAML 依賴）
                        ↓
              Job Runner（Container 執行環境）
                   ├── Build
                   ├── Test（並行）
                   └── Deploy
```

**設計考量：**
- **任務隔離**：每個 Job 在獨立容器中執行（Docker / Firecracker MicroVM）
- **資源管理**：Job Queue + Worker Pool，根據負載動態調整 Worker 數量
- **快取**：npm install / build artifacts 快取加速
- **並行**：可並行的 Job 同時執行（如 unit-test、lint、type-check）
- **取消/重試**：使用者可手動取消；失敗 Job 可重試

---

### 50. 如何評估一個系統的可靠性？ `[中級]`

**解答：**
**可用性計算：**
- 99% → 每年停機 87.6 小時
- 99.9%（Three Nines） → 每年 8.76 小時
- 99.99%（Four Nines） → 每年 52.6 分鐘
- 99.999%（Five Nines） → 每年 5.26 分鐘

**MTTR 和 MTBF：**
- **MTBF（Mean Time Between Failures）**：兩次故障間的平均時間（越高越好）
- **MTTR（Mean Time To Recovery）**：恢復時間（越低越好）
- 可用性 = MTBF / (MTBF + MTTR)

**提升可靠性的手段：**
- 冗餘（消除單點故障）
- 斷路器（防止雪崩）
- 健康檢查 + 自動重啟
- 混沌工程（Chaos Engineering）：主動注入故障發現弱點
- Runbook / 事後復盤（Post-mortem）
