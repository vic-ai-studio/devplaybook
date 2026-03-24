# 後端面試題目

**55 道題目**，涵蓋 REST APIs、Node.js、資料庫、身份驗證、安全性與快取。

---

## REST APIs 與 HTTP（12 題）

### 1. HTTP 方法有哪些？各自何時使用？ `[初級]`

**解答：**

| 方法 | 用途 | 冪等 | 安全 |
|------|------|------|------|
| GET | 讀取資料 | ✅ | ✅ |
| POST | 建立資料 | ❌ | ❌ |
| PUT | 取代整個資源 | ✅ | ❌ |
| PATCH | 部分更新 | ❌ | ❌ |
| DELETE | 刪除資源 | ✅ | ❌ |
| HEAD | 類似 GET，無回應主體 | ✅ | ✅ |
| OPTIONS | CORS 預檢 | ✅ | ✅ |

**冪等（Idempotent）：** 多次呼叫與一次呼叫效果相同。**安全（Safe）：** 不產生副作用。

---

### 2. HTTP 狀態碼有哪些？舉例說明。 `[初級]`

**解答：**
- **1xx 資訊類：** 100 Continue
- **2xx 成功：** 200 OK、201 Created、204 No Content
- **3xx 重新導向：** 301 Moved Permanently、302 Found、304 Not Modified
- **4xx 用戶端錯誤：** 400 Bad Request、401 Unauthorized、403 Forbidden、404 Not Found、409 Conflict、422 Unprocessable Entity、429 Too Many Requests
- **5xx 伺服器錯誤：** 500 Internal Server Error、502 Bad Gateway、503 Service Unavailable

**常見錯誤：** 用 200 回傳錯誤訊息；混淆 401（未驗證）與 403（無權限）。

---

### 3. REST 是什麼？有哪些限制條件？ `[中級]`

**解答：**
REST（表現層狀態轉換）是一種架構風格，有 6 項限制：
1. **用戶端—伺服器** — 關注點分離
2. **無狀態** — 每個請求包含所有必要資訊；伺服器不保存 session
3. **可快取** — 回應須聲明是否可快取
4. **分層系統** — 用戶端不知道是否直接連到伺服器或代理
5. **統一介面** — 一致的 URL、HTTP 方法、資料格式
6. **隨需程式碼**（選擇性）— 伺服器可傳送可執行程式碼

**延伸問題：** REST 與 RESTful 的差異？→ REST 是規範；RESTful 描述遵循 REST 原則的 API。

---

### 4. 驗證（Authentication）與授權（Authorization）有何不同？ `[初級]`

**解答：**
- **驗證（Authentication）** — 確認**你是誰**（身份）。「你真的是 Alice 嗎？」
- **授權（Authorization）** — 確認**你能做什麼**（權限）。「Alice 有權刪除這筆資料嗎？」

**在 HTTP 中：**
- 401 Unauthorized → 驗證失敗（命名有誤，應為「未驗證」）
- 403 Forbidden → 驗證成功但授權失敗

---

### 5. CORS 如何運作？ `[中級]`

**解答：**
CORS（跨來源資源共用）是瀏覽器的安全機制，限制跨來源 HTTP 請求。

**簡單請求**（GET/POST 搭配簡單標頭）：瀏覽器送出帶有 `Origin` 標頭的請求；伺服器回應 `Access-Control-Allow-Origin`；若來源不符，瀏覽器封鎖回應。

**預檢請求**（PUT/DELETE、自訂標頭、JSON）：瀏覽器先發送 `OPTIONS`；伺服器回應允許的方法與標頭；再發送實際請求。

```
// 伺服器 CORS 回應標頭
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400  // 預檢快取 24 小時
```

**注意：** CORS 僅由瀏覽器強制執行；伺服器對伺服器的呼叫不受 CORS 限制。

---

### 6. 什麼是冪等性？為何在 API 設計中重要？ `[中級]`

**解答：**
若一個操作多次執行與執行一次效果相同，則稱為冪等。

**重要原因：** 網路故障時用戶端可能重試；若伺服器處理同一請求兩次並建立兩筆記錄，就會出問題。

**讓 POST 冪等：** 使用冪等鍵（Idempotency Key）：
```
POST /payments
Idempotency-Key: a1b2c3d4
```
伺服器儲存此鍵，收到重複請求時回傳快取的回應。Stripe 等支付 API 普遍使用此模式。

---

### 7. 什麼是分頁？常見的模式有哪些？ `[中級]`

**解答：**

**偏移分頁（Offset pagination）：**
```
GET /posts?offset=20&limit=10
```
簡單但在高偏移量時效能差（DB 需掃描前面所有資料）；資料變動時可能遺漏項目。

**游標分頁（Cursor pagination）：**
```
GET /posts?cursor=eyJpZCI6MjB9&limit=10
```
使用穩定指標（通常為加密的最後一筆 ID/時間戳）。效能穩定；無法跳至第 N 頁；最適合動態消息。

**鍵集分頁（Keyset pagination）：**
```
GET /posts?after_id=20&limit=10
```
類似游標，使用實際欄位值；需要索引欄位。

---

### 8. 如何對 REST API 進行版本控制？ `[中級]`

**解答：**
- **URL 版本：** `/api/v1/users` — 最直觀，易於路由，但破壞可快取性
- **標頭版本：** `Accept: application/vnd.api+json; version=1` — URL 更乾淨，但較難測試
- **查詢參數：** `/api/users?version=1` — 簡單但使 URL 雜亂
- **內容協商：** `Accept: application/vnd.myapp.user.v2+json`

**最佳實踐：** 公開 API 使用 URL 版本（明確、易於文件化）。只有破壞性變更才需要新版本。支援 N-1 版本。

---

### 9. GraphQL 是什麼？與 REST 有何不同？ `[中級]`

**解答：**
GraphQL 是一種 API 查詢語言，讓用戶端精確指定所需資料：

```graphql
query {
  user(id: "1") {
    name
    posts(limit: 5) {
      title
      createdAt
    }
  }
}
```

| | REST | GraphQL |
|---|---|---|
| 端點 | 多個（每個資源一個） | 單一（`/graphql`） |
| 資料擷取 | 固定結構 | 精確指定 |
| 過度/不足擷取 | 常見問題 | 由設計解決 |
| 快取 | HTTP 快取天然支援 | 需要工具（Apollo） |
| 型別系統 | 無（需靠 OpenAPI） | 內建 Schema |

**使用 GraphQL 時機：** 多個用戶端（Web/Mobile）需要不同資料形狀；欄位需求複雜；聚合多個服務。

---

### 10. 什麼是 N+1 問題？如何解決？ `[中級]`

**解答：**
N+1 問題：取得 1 個父資源清單，再對每個項目執行 N 次查詢。

```javascript
// 問題：N+1
const posts = await Post.findAll();          // 1 次查詢
for (const post of posts) {
  const author = await User.findById(post.authorId);  // N 次查詢
}

// 解法 1：JOIN / include（eager loading）
const posts = await Post.findAll({ include: User });  // 1 次查詢

// 解法 2：DataLoader（批次 + 快取）
const userLoader = new DataLoader(async (ids) => {
  const users = await User.findAll({ where: { id: ids } });
  return ids.map(id => users.find(u => u.id === id));
});
```

**DataLoader** 是 GraphQL 的標準解法，將多個請求合併成一次批次查詢。

---

### 11. 如何實作 API 速率限制？ `[中級]`

**解答：**

**常見演算法：**
- **固定視窗（Fixed Window）：** 每分鐘計數重置。簡單但邊界時可能爆量。
- **滑動視窗（Sliding Window）：** 追蹤過去 N 秒的請求；比固定視窗準確。
- **令牌桶（Token Bucket）：** 以固定速率補充令牌；允許突發流量。
- **漏桶（Leaky Bucket）：** 以固定速率處理請求；平滑輸出。

**Redis 實作：**
```python
def is_rate_limited(user_id, limit=100, window=60):
    key = f"rate:{user_id}"
    count = redis.incr(key)
    if count == 1:
        redis.expire(key, window)
    return count > limit
```

**回應標頭：**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000
Retry-After: 30  # 超過限制時
```

---

### 12. HTTP 快取如何運作？ `[中級]`

**解答：**

**快取控制標頭：**
```
Cache-Control: max-age=3600          # 快取 1 小時
Cache-Control: no-cache              # 每次都驗證
Cache-Control: no-store              # 完全不快取
Cache-Control: public, max-age=86400 # 可被 CDN 快取
Cache-Control: private, max-age=600  # 只能被瀏覽器快取
```

**驗證機制：**
- **ETag：** 伺服器回傳 `ETag: "abc123"`；用戶端下次帶 `If-None-Match: "abc123"`；若未變更回傳 304。
- **Last-Modified：** 伺服器回傳 `Last-Modified` 時間戳；用戶端帶 `If-Modified-Since`。

**快取層級：** 瀏覽器快取 → CDN → 應用程式快取（Redis）→ 資料庫查詢快取。

---

## Node.js（10 題）

### 13. 解釋 Node.js 的事件迴圈（Event Loop）。 `[中級]`

**解答：**
Node.js 使用單執行緒非同步模型；事件迴圈讓非阻塞 I/O 成為可能。

**事件迴圈階段（順序）：**
1. **timers** — 執行 `setTimeout`、`setInterval` 回呼
2. **pending callbacks** — 延遲到下一迴圈的 I/O 回呼
3. **idle, prepare** — 內部使用
4. **poll** — 擷取新 I/O 事件；執行 I/O 回呼
5. **check** — 執行 `setImmediate` 回呼
6. **close callbacks** — 如 `socket.on('close', ...)`

**微任務（Microtasks）** 在每個階段之間執行：Promise `.then` 與 `queueMicrotask`，優先於下一個迴圈階段。

```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
// 輸出順序：sync → promise → timeout → immediate
```

---

### 14. `process.nextTick` 與 `setImmediate` 有何差異？ `[高級]`

**解答：**
- **`process.nextTick`** — 當前操作完成後、事件迴圈繼續前立即執行。優先於所有 I/O 事件。屬於微任務佇列。
- **`setImmediate`** — 在 check 階段（poll 之後）執行。等待當前 I/O 事件結束後才執行。

```javascript
setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
// 輸出：nextTick → promise → setImmediate
```

**使用時機：**
- `process.nextTick`：需要在非同步操作前保證回呼被呼叫（如 emit 事件前）
- `setImmediate`：在 I/O 後執行；避免遞迴 `nextTick` 造成堆疊溢位

---

### 15. 什麼是 Node.js 的串流（Streams）？ `[中級]`

**解答：**
串流讓你能以資料塊（chunk）方式處理資料，而非一次性載入全部到記憶體。

**四種串流類型：**
- **Readable** — 可讀（`fs.createReadStream`）
- **Writable** — 可寫（`fs.createWriteStream`）
- **Duplex** — 可讀可寫（TCP socket）
- **Transform** — 讀寫間轉換資料（`zlib.createGzip`）

```javascript
// 使用 pipe 處理大型檔案
const fs = require('fs');
const zlib = require('zlib');

fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'))
  .on('finish', () => console.log('完成壓縮'));
```

**優點：** 記憶體效率高；可處理大於可用記憶體的檔案；支援背壓（backpressure）。

---

### 16. `require()` 與動態 `import()` 有何差異？ `[中級]`

**解答：**

| | `require()` | `import()` |
|---|---|---|
| 模組系統 | CommonJS | ES Modules |
| 時機 | 同步（執行時載入） | 非同步（回傳 Promise） |
| Tree shaking | ❌ | ✅ |
| 使用位置 | 任何地方 | 任何地方（動態） |

```javascript
// CommonJS
const fs = require('fs');

// ES Module 靜態匯入（檔案頂端）
import fs from 'fs';

// 動態匯入（可依條件載入）
const module = await import('./heavy-module.js');
```

**Node.js 現況：** `package.json` 設定 `"type": "module"` 啟用 ESM；`.cjs` 副檔名強制 CommonJS。

---

### 17. 如何處理 Node.js 的未捕獲錯誤？ `[中級]`

**解答：**

```javascript
// 未捕獲的同步錯誤
process.on('uncaughtException', (err) => {
  console.error('未捕獲例外：', err);
  process.exit(1);  // 記錄後必須退出
});

// 未處理的 Promise 拒絕
process.on('unhandledRejection', (reason) => {
  console.error('未處理的 Promise 拒絕：', reason);
  process.exit(1);
});

// 最佳實踐：async/await + try/catch
async function handler(req, res) {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**注意：** `uncaughtException` 後應關閉程序，因為應用程式狀態不可信。使用 PM2 或 systemd 自動重啟。

---

### 18. Node.js 的 Cluster 模式如何運作？ `[高級]`

**解答：**
Node.js 預設單執行緒；Cluster 可充分利用多核 CPU。

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();  // 建立子程序
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} 已結束，重啟中...`);
    cluster.fork();  // 自動重啟
  });
} else {
  require('./server');  // 每個 worker 執行伺服器
}
```

**替代方案：** PM2 cluster 模式（`pm2 start app.js -i max`）；Node.js 16+ Worker Threads（適合 CPU 密集任務）。

---

### 19. 什麼是中介軟體（Middleware）？如何在 Express 中運作？ `[初級]`

**解答：**
中介軟體是能存取 `req`、`res` 與 `next` 的函式，在請求處理鏈中執行。

```javascript
// 自訂中介軟體
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();  // 必須呼叫，否則請求卡住
};

// 錯誤處理中介軟體（4 個參數）
const errorHandler = (err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
};

app.use(logger);
app.use(express.json());
app.use('/api', router);
app.use(errorHandler);  // 必須在最後
```

**執行順序：** 依照 `app.use()` 的順序依序執行。

---

### 20. 後端專案應如何組織結構？ `[中級]`

**解答：**

```
src/
├── controllers/    # 處理 HTTP 請求/回應
├── services/       # 業務邏輯（可測試、無框架依賴）
├── repositories/   # 資料存取層（DB 查詢）
├── models/         # 資料模型/Schema
├── middleware/     # 認證、日誌、錯誤處理
├── routes/         # 路由定義
├── utils/          # 共用工具函式
├── config/         # 設定（DB、環境變數）
└── app.js          # 應用程式入口
```

**原則：**
- 控制器精簡（只處理 HTTP）；業務邏輯在服務層
- 依賴反轉（DI）讓服務可測試
- 大型專案可按功能/領域分組（而非按類型分組）

---

### 21. 如何在 Node.js 中實現優雅關閉（Graceful Shutdown）？ `[高級]`

**解答：**

```javascript
const server = app.listen(3000);

const shutdown = async (signal) => {
  console.log(`收到 ${signal}，開始優雅關閉...`);
  server.close(async () => {
    try {
      await db.pool.end();
      await redisClient.quit();
      await messageQueue.close();
      console.log('所有連線已關閉');
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 30000);  // 超時強制退出
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

### 22. 什麼是依賴注入（Dependency Injection）？為何重要？ `[高級]`

**解答：**
依賴注入是將相依物件從外部傳入，而非在類別內部建立。

```javascript
// 沒有 DI（難以測試）
class UserService {
  constructor() {
    this.db = new Database();  // 緊耦合
  }
}

// 有 DI（鬆耦合、可測試）
class UserService {
  constructor(db, emailService) {
    this.db = db;
    this.emailService = emailService;
  }
}

// 生產環境
const service = new UserService(new PostgresDB(), new SendGridEmail());
// 測試環境
const service = new UserService(mockDB, mockEmail);
```

**好處：** 可測試性、可替換實作、清晰的相依關係。常用容器：InversifyJS、tsyringe、NestJS 內建 IoC。

---

## 資料庫（15 題）

### 23. SQL 與 NoSQL 的差異？何時使用哪一種？ `[初級]`

**解答：**

| 特性 | SQL（關聯式） | NoSQL |
|------|------------|-------|
| 結構 | 固定 Schema | 彈性 Schema |
| 一致性 | 強一致性（ACID） | 最終一致性（可設定） |
| 擴展 | 垂直擴展為主 | 水平擴展 |
| 查詢 | 強大（JOIN、聚合） | 有限（因模型而異） |

**選 SQL：** 財務資料、訂單系統、複雜關聯查詢。
**選 NoSQL：** 使用者活動日誌、產品目錄（屬性多變）、快取、大量寫入場景。

---

### 24. 什麼是資料庫索引？如何運作？ `[中級]`

**解答：**
索引是獨立的資料結構，讓 DB 無需全表掃描即可快速找到資料。

**常見索引類型：**
- **B-Tree（預設）：** 適合等值查詢與範圍查詢（`=`、`<`、`>`、`BETWEEN`）
- **Hash：** 僅適合等值查詢（`=`），不支援範圍
- **複合索引：** 多欄位；欄位順序很重要（最左前綴原則）
- **覆蓋索引：** 索引包含查詢所需的所有欄位，無需回表

```sql
-- 建立索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- 用 EXPLAIN 查看是否使用索引
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';
```

**代價：** 寫入變慢（需維護索引）；佔用磁碟空間。不要對低選擇性欄位（如布林值）建索引。

---

### 25. 什麼是正規化？第一、第二、第三正規形式是什麼？ `[中級]`

**解答：**
正規化是消除資料重複、確保資料完整性的設計過程。

- **1NF：** 欄位是原子值；沒有重複的欄位群組。
- **2NF：** 符合 1NF + 非主鍵欄位完全依賴整個主鍵（消除部分依賴）。
- **3NF：** 符合 2NF + 非主鍵欄位不依賴其他非主鍵欄位（消除遞移依賴）。

**反正規化（Denormalization）：** 為查詢效能刻意引入冗餘。常見於讀取密集系統（OLAP、報表）。

---

### 26. 什麼是交易（Transaction）與 ACID？ `[中級]`

**解答：**
交易將多個操作組合成不可分割的工作單元。

**ACID 屬性：**
- **原子性（Atomicity）：** 全部成功或全部失敗。
- **一致性（Consistency）：** 交易前後資料庫都符合所有規則與限制。
- **隔離性（Isolation）：** 並行交易互不干擾（如同序列執行）。
- **持久性（Durability）：** 已提交的交易永久儲存，系統故障也不遺失。

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- 任何步驟失敗則 ROLLBACK
```

---

### 27. 資料庫隔離等級有哪些？ `[高級]`

**解答：**

| 隔離等級 | 髒讀 | 不可重複讀 | 幻讀 |
|---------|------|----------|------|
| Read Uncommitted | 可能 | 可能 | 可能 |
| Read Committed | ❌ | 可能 | 可能 |
| Repeatable Read | ❌ | ❌ | 可能 |
| Serializable | ❌ | ❌ | ❌ |

- **髒讀：** 讀到另一未提交交易的資料
- **不可重複讀：** 同一交易內兩次讀取同一筆資料，結果不同
- **幻讀：** 同一查詢返回不同的資料列集合

**PostgreSQL 預設：** Read Committed；**MySQL 預設：** Repeatable Read。

---

### 28. 什麼是連線池（Connection Pool）？ `[中級]`

**解答：**
連線池預先建立並重複使用 DB 連線，避免每次查詢的建立/關閉開銷。

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  max: 20,                     // 最大連線數
  idleTimeoutMillis: 30000,    // 閒置 30 秒後關閉
  connectionTimeoutMillis: 2000,
});

const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
```

**設定原則：** `max` 通常等於 CPU 核心數 × 2～4；設定超時避免連線洩漏；監控連線使用率。

---

### 29. ORM 的優缺點是什麼？ `[中級]`

**解答：**

**優點：**
- 用物件操作資料，程式碼直觀
- 防止 SQL 注入（參數化查詢）
- 自動處理類型轉換與關聯
- 提供資料庫遷移工具

**缺點：**
- 效能損耗（複雜查詢可能產生低效 SQL）
- 難以處理複雜查詢（N+1、子查詢）
- 抽象層遮蔽底層行為，難以 debug

**常見選擇：**
- **Prisma（Node.js）：** 型別安全、自動補全
- **TypeORM：** 裝飾器風格，支援 DataMapper/ActiveRecord
- **Sequelize：** 老牌、功能齊全
- **SQLAlchemy（Python）：** 業界標準

---

### 30. 解釋 SQL JOIN 的類型。 `[初級]`

**解答：**

```sql
-- INNER JOIN：只回傳兩表都匹配的列
SELECT u.name, o.total FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN：左表所有列，右表不匹配為 NULL
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- RIGHT JOIN：右表所有列，左表不匹配為 NULL
-- FULL OUTER JOIN：兩表所有列，不匹配為 NULL
-- CROSS JOIN：笛卡爾積（每個組合）
```

**記憶法：** INNER = 交集；LEFT = 左表全部 + 匹配右表；FULL = 聯集。

---

### 31. 什麼是資料庫分片（Sharding）？ `[高級]`

**解答：**
分片是將資料水平分散到多個資料庫節點，每個分片持有資料的子集。

**分片策略：**
- **範圍分片：** 按鍵值範圍分配。易有熱點問題。
- **雜湊分片：** `shard = hash(key) % N`。均勻分佈但難以範圍查詢。
- **目錄分片：** 查找表決定分片。靈活但查找表是單點故障。

**挑戰：**
- 跨分片 JOIN 困難
- 重新分片（Resharding）複雜
- 分散式交易需要額外協議
- 分片鍵選擇至關重要（避免熱點）

---

### 32. 什麼是最終一致性（Eventual Consistency）？ `[高級]`

**解答：**
在沒有新更新的情況下，所有副本最終會收斂到相同狀態——但不保證何時。

**應用場景：** DNS 傳播、社群媒體動態、購物車。

**對比強一致性：** 每次讀取都返回最新寫入的值（銀行轉帳需要此保證）。

**實作技術：** 向量時鐘（Vector Clocks）、CRDTs（無衝突複製資料類型）、最後寫入勝利（Last Write Wins）。

---

### 33. Redis 主要有哪些使用場景？ `[中級]`

**解答：**

**主要使用場景：**
- **快取：** 資料庫查詢結果、API 回應
- **Session 儲存：** 水平擴展時的 session 共用
- **速率限制：** 計數器 + 過期時間
- **排行榜：** Sorted Set（`ZADD`、`ZRANK`）
- **發布/訂閱：** 即時訊息傳遞
- **分散式鎖：** `SET key value NX EX 30`
- **任務佇列：** List（LPUSH/BRPOP）或 Redis Streams

```python
import redis, json
r = redis.Redis()

def get_user(user_id):
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    user = db.query_user(user_id)
    r.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

---

### 34. 什麼是資料庫遷移（Migration）？最佳實踐為何？ `[中級]`

**解答：**
資料庫遷移是對 Schema 的版本控制變更，確保所有環境（開發、測試、生產）保持同步。

**最佳實踐：**
- 使用工具管理（Flyway、Liquibase、Prisma Migrate、Alembic）
- 遷移必須可向前（up）也可向後（down）
- 遷移腳本納入版本控制
- 生產遷移先在測試環境驗證
- 大型表格的 Schema 變更使用線上遷移（避免鎖表）

```sql
-- 安全的線上遷移：先加 nullable 欄位，再批次回填，最後加限制
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

---

### 35. 如何優化慢查詢？ `[高級]`

**解答：**

**診斷步驟：**
1. 用 `EXPLAIN ANALYZE` 查看查詢計畫
2. 確認是否有全表掃描（Seq Scan）
3. 檢查 N+1 問題
4. 查看慢查詢日誌

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id;
```

**常見優化：**
- 在 WHERE、JOIN、ORDER BY 欄位加索引
- 只選取需要的欄位（避免 `SELECT *`）
- 使用覆蓋索引
- 分頁避免大偏移（用游標取代 OFFSET）
- 讀取密集場景使用讀取副本（Read Replica）

---

### 36. 什麼是資料庫複寫（Replication）？ `[高級]`

**解答：**
複寫將資料從主節點（Primary）同步到副本節點（Replica）。

**同步類型：**
- **同步複寫：** 主節點等待副本確認後才提交。強一致性但延遲高。
- **非同步複寫：** 主節點提交後非同步複製。低延遲但可能遺失資料。
- **半同步：** 至少一個副本確認。平衡兩者。

**使用場景：**
- 讀取副本：分散讀取負載（讀寫分離）
- 高可用性：主節點故障時自動切換（Failover）
- 地理分佈：就近讀取降低延遲

---

### 37. 如何處理資料庫連線洩漏？ `[高級]`

**解答：**
連線洩漏：從連線池取出連線後未歸還，最終耗盡連線池。

```javascript
// 危險：例外發生時連線不會歸還
const client = await pool.connect();
const result = await client.query('SELECT ...');
client.release();  // 若上方拋出例外則永遠不執行

// 安全：使用 try/finally
const client = await pool.connect();
try {
  const result = await client.query('SELECT ...');
  return result.rows;
} finally {
  client.release();  // 一定會執行
}
```

**監控：** 追蹤 `pool.totalCount`、`pool.idleCount`；設定連線超時與最大生命週期。

---

## 身份驗證與安全性（13 題）

### 38. JWT 是什麼？如何運作？ `[中級]`

**解答：**
JWT（JSON Web Token）是緊湊、自包含的令牌格式，用於傳遞聲明（Claims）。

**結構：** `Header.Payload.Signature`（Base64Url 編碼）

```javascript
// 建立 JWT
const token = jwt.sign(
  { userId: 123, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// 驗證 JWT
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log(decoded.userId);  // 123
} catch (err) {
  // 簽名無效或已過期
}
```

**注意：** Payload 只是 Base64 編碼，任何人都能解碼；簽名只保證資料未被竄改。不要在 JWT 放敏感資料。

---

### 39. Session 與 JWT 各有什麼優缺點？ `[中級]`

**解答：**

| | Session（Cookie） | JWT |
|---|---|---|
| 狀態 | 有狀態（伺服器儲存） | 無狀態（客戶端儲存） |
| 撤銷 | 即時（刪除 session） | 困難（需黑名單） |
| 擴展性 | 需要 session 共用（Redis） | 天然水平擴展 |
| 大小 | 小（只是 ID） | 較大（含 payload） |
| 安全性 | CSRF 風險（Cookie） | XSS 風險（localStorage） |

**建議：**
- 傳統 Web 應用：Session + HttpOnly Cookie（防 XSS）
- API/微服務：JWT（無狀態，易於擴展）
- 需要即時撤銷：Session 或 JWT + Redis 黑名單

---

### 40. 解釋 OAuth 2.0 的流程。 `[高級]`

**解答：**
OAuth 2.0 是授權框架，讓第三方應用代表用戶存取資源，而無需知道密碼。

**授權碼流程（最常見）：**
1. 用戶點擊「使用 Google 登入」→ 重新導向至 Google 授權頁
2. 用戶同意 → Google 回傳授權碼（`code`）
3. 後端用 `code` + `client_secret` 換取 `access_token`
4. 用 `access_token` 呼叫 Google API

**四種授權類型：**
- **Authorization Code：** 有後端的 Web 應用（最安全）
- **PKCE：** SPA 或行動應用（無 client_secret）
- **Client Credentials：** 服務對服務（機器對機器）
- **Device Code：** 沒有瀏覽器的裝置（電視、CLI）

**OAuth 2.0 vs OIDC：** OAuth 是授權；OIDC 在其上添加身份驗證（`id_token`）。

---

### 41. 如何安全儲存密碼？ `[初級]`

**解答：**

```python
import bcrypt

# 雜湊密碼（自動加鹽）
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# 驗證密碼
is_valid = bcrypt.checkpw(password.encode(), hashed)
```

**規則：**
- 絕對不要儲存明文密碼
- 不要使用 MD5 或 SHA1（太快，易被暴力破解）
- 使用慢速雜湊：bcrypt、Argon2、scrypt
- bcrypt cost factor 建議 ≥ 12（計算時間 > 100ms）

---

### 42. 什麼是 SQL 注入？如何防止？ `[初級]`

**解答：**

```javascript
// 危險：直接串接用戶輸入
const query = `SELECT * FROM users WHERE email = '${email}'`;
// 攻擊：' OR '1'='1  → 取得所有用戶

// 安全：參數化查詢
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ORM（Prisma）：預設安全
const user = await prisma.user.findFirst({ where: { email } });
```

**原則：** 永遠使用參數化查詢或 ORM；最小權限原則（DB 帳號不要有超出需求的權限）。

---

### 43. 什麼是 XSS？如何防止？ `[中級]`

**解答：**
XSS（跨網站指令碼）：攻擊者注入惡意 JavaScript，在用戶瀏覽器中執行。

**三種類型：**
- **Stored XSS：** 惡意碼存入資料庫（留言板攻擊）
- **Reflected XSS：** 惡意碼在 URL 參數中（釣魚連結）
- **DOM-based XSS：** 前端 JavaScript 直接操作 DOM

**防禦措施：**
- 輸出時 HTML encode 所有用戶資料
- 使用 CSP（Content Security Policy）標頭
- 設定 `HttpOnly` Cookie（防止 JS 存取）
- React/Vue 預設跳脫（避免 `dangerouslySetInnerHTML`）

---

### 44. 什麼是 CSRF？如何防止？ `[中級]`

**解答：**
CSRF（跨站請求偽造）：攻擊者誘使用戶在已登入的網站上執行非預期的操作。

```html
<!-- 惡意網站的隱藏請求 -->
<img src="https://bank.com/transfer?to=attacker&amount=1000">
```

**防禦措施：**
- **CSRF Token：** 表單中嵌入隨機令牌，伺服器驗證
- **SameSite Cookie：** `SameSite=Strict` 或 `Lax` 防止跨站 Cookie
- **驗證 Origin/Referer 標頭**
- **自訂請求標頭：** API 使用 `Authorization` 標頭

**現代防護：** SameSite Cookie + JWT in header 幾乎可完全防止 CSRF。

---

### 45. HTTPS 與 TLS 如何運作？ `[中級]`

**解答：**
TLS（傳輸層安全性）在 HTTP 之上提供加密、完整性與認證。

**TLS 握手（簡化版）：**
1. 用戶端發送支援的加密套件
2. 伺服器回傳憑證（含公鑰）
3. 用戶端驗證憑證（CA 鏈）
4. 交換對稱加密金鑰（使用公鑰加密）
5. 使用對稱金鑰加密後續通訊

**重點：** Let's Encrypt 提供免費憑證；TLS 1.3 比 1.2 更快（1-RTT 握手）；HSTS 標頭強制瀏覽器使用 HTTPS。

---

### 46. 什麼是最小權限原則？ `[初級]`

**解答：**
每個程式、用戶或系統組件只應擁有完成其工作所需的最小權限。

**實際應用：**
- 資料庫帳號：應用程式只有 `SELECT/INSERT/UPDATE`，不給 `DROP TABLE`
- IAM 角色：Lambda 函式只能存取它需要的 S3 儲存桶
- API 端點：普通用戶無法存取管理端點
- 微服務：只能存取自己的資料庫

---

### 47. 如何安全管理環境變數與密鑰？ `[中級]`

**解答：**

**不該做的：**
- 不要將密鑰提交到版本控制
- 不要在程式碼中寫死密鑰
- 不要在日誌中印出密鑰

```bash
# .env 檔案（加入 .gitignore）
DATABASE_URL=postgresql://...
JWT_SECRET=very-long-random-string

# Node.js 載入
require('dotenv').config();
const secret = process.env.JWT_SECRET;
```

**生產環境：** AWS Secrets Manager、HashiCorp Vault、GCP Secret Manager、Kubernetes Secrets。

---

### 48. 什麼是輸入驗證？為何重要？ `[初級]`

**解答：**

```javascript
// 使用 Zod 進行驗證
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
});

app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  // result.data 已通過驗證且有正確類型
});
```

**原則：** 在邊界處驗證（API 入口）；永遠驗證型別、範圍與格式；不信任任何外部輸入。

---

### 49. 常見的安全標頭有哪些？ `[中級]`

**解答：**

```javascript
// Helmet.js 自動設定安全標頭
app.use(helmet());
```

**主要安全標頭：**
- `Content-Security-Policy` — 防止 XSS，控制資源來源
- `X-Frame-Options: DENY` — 防止 Clickjacking
- `X-Content-Type-Options: nosniff` — 防止 MIME 嗅探
- `Strict-Transport-Security` — 強制 HTTPS（HSTS）
- `Referrer-Policy: no-referrer` — 控制 Referer 標頭
- `Permissions-Policy` — 控制瀏覽器功能（相機、位置等）

---

### 50. 什麼是時序攻擊（Timing Attack）？如何防止？ `[高級]`

**解答：**
攻擊者透過觀察操作執行時間來推斷秘密資訊。

```javascript
// 危險：字串比較在第一個不匹配字元就停止
if (userToken === storedToken) { ... }

// 安全：常數時間比較
const crypto = require('crypto');
const isValid = crypto.timingSafeEqual(
  Buffer.from(userToken),
  Buffer.from(storedToken)
);
```

**應用場景：** HMAC 驗證、API 金鑰比對、密碼重設令牌。bcrypt 的 `checkpw` 內建常數時間比較。

---

## 快取與效能（10 題）

### 51. 有哪些快取策略？ `[中級]`

**解答：**

- **Cache-Aside（旁路快取）：** 應用程式先查快取 → 未命中則查 DB → 寫入快取。最常用。
- **Write-Through（寫穿）：** 寫入時同步更新快取與 DB。一致性高，寫入較慢。
- **Write-Behind（寫回）：** 先寫快取，非同步批次寫入 DB。高吞吐但有遺失風險。
- **Read-Through：** 快取層自動從 DB 載入。

```python
# Cache-Aside 模式
def get_user(user_id):
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)      # 快取命中
    user = db.find_user(user_id)       # 快取未命中
    redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

---

### 52. 什麼是快取失效（Cache Invalidation）？為何困難？ `[高級]`

**解答：**
當來源資料更新時，確保快取中的舊資料被移除或更新。

**常見策略：**
- **TTL（Time-To-Live）：** 設定過期時間，接受短暫不一致
- **主動失效：** 資料更新時主動刪除快取
- **事件驅動：** 發布資料變更事件，訂閱者更新快取

**難點：** 分散式快取的一致性；級聯失效（大量快取同時失效）；競爭條件（兩個請求同時重建快取）。

```python
def update_user(user_id, data):
    db.update_user(user_id, data)
    redis.delete(f"user:{user_id}")  # 主動失效
```

---

### 53. CDN 如何運作？何時使用？ `[初級]`

**解答：**
CDN 是分布在全球的伺服器網路，將靜態資源快取在距用戶最近的節點。

**運作方式：**
1. 用戶請求 CDN URL
2. DNS 解析到最近節點
3. 節點有快取 → 直接回傳
4. 無快取 → 從源站取得 → 快取 → 回傳

**適用：** 靜態資源（圖片、CSS、JS）、影片串流、軟體下載。

**主要 CDN：** CloudFront（AWS）、Cloudflare、Fastly、Akamai。

---

### 54. 訊息佇列（Message Queue）的作用與使用時機？ `[中級]`

**解答：**

**使用時機：**
- 解耦服務（下訂單 → 非同步發送郵件）
- 平滑流量峰值（佇列吸收突發請求）
- 長時間任務（影片轉碼、批次報表）
- 保證至少執行一次的任務分發

**常見工具：**
- **RabbitMQ：** AMQP 協議，路由靈活，適合任務佇列
- **Apache Kafka：** 高吞吐日誌串流，持久化，適合事件溯源
- **AWS SQS：** 全託管，適合雲端架構
- **Bull（Redis）：** Node.js 輕量任務佇列

```javascript
// Bull 任務佇列
const emailQueue = new Bull('email');
emailQueue.add({ to: 'user@example.com', subject: '歡迎！' });
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

---

### 55. 水平擴展 vs 垂直擴展？WebSocket vs 輪詢？十二因素應用？ `[中級]`

**解答：**

**擴展方式：**
- **垂直擴展（Scale Up）：** 升級單一機器的 CPU/RAM。簡單但有上限，單點故障。
- **水平擴展（Scale Out）：** 增加更多機器。理論上無限擴展；需無狀態設計與負載均衡。

**建議：** 設計無狀態（session 存 Redis）；垂直擴展作短期方案。

**WebSocket vs 輪詢：**

| | 輪詢 | 長輪詢 | WebSocket |
|---|---|---|---|
| 方向 | 單向 | 單向 | 雙向 |
| 延遲 | 高 | 中等 | 低（即時） |
| 伺服器負載 | 高 | 中等 | 低 |
| 適用 | 低頻更新 | 通知 | 聊天、即時協作 |

**十二因素應用（Twelve-Factor App）：** 可擴展應用的 12 項原則；包含：設定用環境變數、無狀態程序、日誌輸出到 stdout、依賴明確聲明等。

---
