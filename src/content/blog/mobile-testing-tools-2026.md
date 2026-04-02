---
title: "行動應用測試工具完整指南 2026"
description: "從單元測試到端對端測試，盤點 2026 年最適合行動 App 的測試工具，包括 Jest、Detox、Maestro、XCTest 等主流框架的深度評測。"
author: devplaybook
publishDate: "2026-04-01"
tags: ["測試", "行動開發", "品質保證", "Detox", "Maestro", "XCTest"]
---

# 行動應用測試工具完整指南 2026

## 前言

行動應用的測試金字塔從底層的單元測試、中層的整合測試，到頂層的端對端（E2E）測試，每一層都需要適合的工具支撐。2026 年的工具生態有幾個顯著變化：AI 輔助測試生成開始普及，傳統工具穩步演進，而一些新興工具降低了 E2E 測試的進入門檻。本篇完整解析各層級的代表性工具。

## 一、單元測試

### Jest

Jest 是 React Native 專案單元測試的事實標準。

```javascript
// sum.test.js
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

**2026 年更新重點**：
- Jest 30.x 改善了 `--shard` 支援，測試分片執行更穩定
- `--coverage` 報表與 GitHub Actions 的整合更順暢
- `vi.mock`（來自 Vitest 的 API）可選支援，方便從 Vitest 遷移

### Vitest

Vitest 在 2026 年已成為 Vite 專案的首選，React Native 社群也有越來越多採用：

```javascript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
});
```

**Vitest vs Jest**：Vitest 在測試執行速度上通常快 2-3 倍，但 Jest 的生態系統（特別是與 Create React App、React Native CLI 的整合）仍更成熟。

### XCTest（iOS 原生）

Swift/Objective-C 專案的單元測試：

```swift
import XCTest
@testable import MyApp

class MyAppTests: XCTestCase {
    func testAddition() {
        XCTAssertEqual(1 + 2, 3)
    }
}
```

**XCTAssert 系列**：2026 年 Swift 6 的Typed throws 讓錯誤處理測試更順暢，配合 `XCTAssertThrowsError` 使用更直觀。

### Kotest + JUnit（Android 原生）

Kotlin 專案的單元測試框架推薦：

```kotlin
import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.shouldBe

class CalculatorTests : FreeSpec({
    "Calculator" - {
        "should add numbers correctly" {
            Calculator().add(1, 2) shouldBe 3
        }
    }
})
```

## 二、React Native / Flutter 元件測試

### React Native Testing Library

取代 `react-test-renderer` 的現代方案，以使用者體驗為中心撰寫測試：

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import { LoginButton } from './LoginButton';

describe('LoginButton', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<LoginButton onPress={onPress} />);
    
    fireEvent.press(getByText('Login'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### flutter_test（Flutter 原生）

Flutter 內建的測試框架：

```dart
import flutter_test/flutter_test.dart';
import 'package:my_app/main.dart';

void main() {
  testWidgets('Counter increments', (WidgetTester tester) async {
    await tester.pumpWidget(MyApp());
    expect(find.text('0'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();
    expect(find.text('1'), findsOneWidget);
  });
}
```

## 三、整合測試

### Detox（React Native E2E + 整合）

Detox 在 2026 年的 20.x 版本帶來：

- iOS 18 和 Android 15 的完整支援
- Gray box 測試方法（可存取原生層）
- 與 GitHub Actions、Bitrise 的深度整合

```javascript
describe('Login Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully', async () => {
    await expect(element(by.id('emailInput'))).toBeVisible();
    await element(by.id('emailInput')).typeText('test@example.com');
    await element(by.id('passwordInput')).typeText('password123');
    await element(by.id('loginButton')).tap();
    await expect(element(by.id('dashboard'))).toBeVisible();
  });
});
```

### Maestro（跨平台 E2E，最友善的學習曲線）

Maestro 2026 年的 2.x 版本：

- **YAML 驅動**：無需寫程式碼，團隊任何人都能撰寫與維護測試
- 支援 Android 與 iOS（需 Mac）
- 內建 Flow IDE，可在圖形介面中錄製與編輯測試流程

```yaml
appId: com.example.myapp
---
- launchApp
- tapOn:
    id: "emailInput"
- inputText: "test@example.com"
- tapOn:
    id: "passwordInput"
- inputText: "password123"
- tapOn:
    id: "loginButton"
- assertVisible:
    id: "dashboard"
```

**Maestro 的限制**：複雜的頁面狀態、網路請求 Mock、小程式級別的精確控制，仍需要 Detox 或原生框架。

## 四、iOS 專屬工具

### XCTest Framework

 XCTest 是 iOS 專案的測試骨幹：

```swift
// UI Testing
import XCTest

class LoginUITests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }
    
    func testLogin() {
        let emailField = app.textFields["email"]
        emailField.tap()
        emailField.typeText("test@example.com")
        
        let passwordField = app.secureTextFields["password"]
        passwordField.tap()
        passwordField.typeText("password123")
        
        app.buttons["Login"].tap()
        XCTAssertTrue(app.staticTexts["Dashboard"].waitForExistence(timeout: 5))
    }
}
```

### XCUITest vs EarlGrey

| 特性 | XCUITest | EarlGrey |
|------|----------|----------|
| 維護狀態 | Apple 官方，持續更新 | Google 已停止主動維護 |
| Swift/ObjC | 原生支援 | 主要 ObjC |
| 與 Xcode 整合 | 無縫 | 需額外設定 |
| 社群活躍度 | 高 | 低（僅修復 critical bugs） |

**結論**：2026 年新專案應選擇 XCUITest，EarlGrey 僅適合現有大型程式碼庫遷移成本過高的情境。

## 五、視覺回歸測試

### Percy（BrowserStack 旗下）

跨平台視覺回歸測試，支援 iOS、Android、Web：

- 與 GitHub PR 流程深度整合，自動比對截圖差異
- AI 輔助的「智慧降噪」，自動忽略 UI 浮動元素（如時間戳、通知 badge）
- 支援 React Native 的 Native View 截圖比對

### Lost-pixel

開源替代方案，適合 self-hosted 或預算有限的團隊：

```javascript
// lost-pixel.config.ts
import { defineConfig } from 'lost-pixel';

export const config = defineConfig({
  shotOptions: {
    baseUrl: 'http://localhost:3000',
    pages: [{ path: '/', name: 'home' }],
  },
  ci: { prNumber: process.env.PR_NUMBER },
});
```

## 六、效能測試

### React Native Performance Monitor

Dev Menu 內建的即時效能工具：

- JS FPS 與 UI FPS 分別監控
- 記憶體使用曲線
- 啟動時間分析（Native init + JS bundle + First render）

### Instruments（Xcode）

傳統但功能完整的效能工具：

- **Time Profiler**：CPU 使用熱點分析
- **Leaks**：記憶體泄漏檢測
- **Network**：網路請求延遲分析
- **Animations**：Core Animation 幀率檢視

### Android Profiler（Android Studio）

對等的 Android 效能工具鏈：

- CPU / Memory / Network / Energy  profiler
- 支援離線分析與 Compare profiles

## 七、Monkey Testing / 混沌測試

### CrashMonkey（Android）

自動產生隨機輸入事件，測試 App 的穩定性：

```bash
# 安裝與執行
pip install crashmonkey
python -m crashmonkey -p com.example.myapp --iterations 1000
```

### Stuart（iOS，開源）

iOS 的混沌測試工具：

```bash
stuart run --app-bundle com.example.myapp --events 5000 --output results.json
```

## 八、測試資料管理

### Fixture / Factory 工具

| 框架 | 語言 | 特點 |
|------|------|------|
| factory_bot | Ruby/Rails | 經典，社群龐大 |
| model_mommy | Python | Django 專案常用 |
| Faker | 多語言 | 通用假資料生成 |
| Swift Faker | Swift | iOS/macOS 生態 |

### Mirage JS（前端 Mock 伺服器）

適合前端開發階段繞過後端依賴：

```javascript
import { createServer, Model } from 'miragejs';

createServer({
  models: {
    user: Model,
  },
  routes() {
    this.get('/api/users', schema => schema.users.all());
    this.post('/api/users', (schema, request) => {
      let attrs = JSON.parse(request.requestBody);
      return schema.users.create(attrs);
    });
  },
});
```

## 九、CI/CD 整合

### GitHub Actions + Mobile Testing

```yaml
# .github/workflows/test.yml
name: Mobile Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: npm test
      - name: Run Detox E2E
        run: npx detox test --configuration ios.sim.release
```

### Bitrise（Mobile-first CI）

Bitrise 的 mobile-specific step 生態：

- 自動 signing/codesign
- 內建 Gradle / Xcode build step
- 與 Firebase Test Lab / BrowserStack 的原生整合

## 十、測試策略建議

### 測試金字塔（2026 實踐版）

```
        ┌─────────────┐
        │   E2E 測試   │  ← 10-20 tests, 高成本維護
        ├─────────────┤
        │  整合測試    │  ← 50-100 tests, 中等成本
        ├─────────────┤
        │  單元測試    │  ← 500+ tests, 低成本快速
        └─────────────┘
```

### 測試覆蓋率目標

| 專案類型 | 覆蓋率目標 | 優先順序 |
|---------|-----------|---------|
| 函式庫 / SDK | 90%+ | 核心商業邏輯 |
| 企業內部 App | 70-80% | 關鍵路徑 |
| Consumer App | 60%+ | 登入、核心流程 |
| MVP | 30-40% | 最少要通過happy path |

### 測試優先順序

1. **單元測試** — Business logic, utility functions, data transformation
2. **整合測試** — API 整合、資料庫操作、模組間介面
3. **E2E 測試** — 使用者關鍵路徑（登入、結帳、核心功能）

## 結語

2026 年的行動測試工具生態已高度成熟，選擇時的關鍵原則是：

1. **先確定測試金字塔的完整性**，不要只做 E2E 忽視單元測試
2. **根據團隊技能選工具**：Maestro 適合快速交付但需要精確控制時換 Detox；Swift 團隊直接 XCTest
3. **CI/CD 整合是測試的最終價值**：沒有自動化的測試遲早會被放棄
4. **視覺回歸測試**是 UI 迭代的安全網，值得投資

---

*最後更新：2026-04-01*
