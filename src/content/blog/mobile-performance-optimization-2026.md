---
title: "行動應用效能優化完整指南 2026"
description: "深入解析 2026 年 React Native、Flutter 與原生 iOS/Android 的效能瓶頸與優化策略，從啟動時間、記憶體管理到 UI 渲染的實戰技巧。"
author: devplaybook
publishDate: "2026-04-01"
tags: ["效能優化", "React Native", "Flutter", "iOS", "Android", "行動開發"]
---

# 行動應用效能優化完整指南 2026

## 前言

效能是行動應用成敗的關鍵指標之一。使用者對 App 響應速度的期望在 2026 年只會更高——根據研究，響應時間超過 3 秒的 App 會失去超過 50% 的使用者。本篇從啟動時間、記憶體、渲染、網路四個核心維度，全面解析跨平台與原生 App 的效能優化實戰策略。

## 一、App 啟動時間優化

### Cold Start vs Warm Start

| 啟動類型 | 定義 | 目標時間 |
|---------|------|---------|
| Cold Start | App 完全不存在記憶體中 | < 2 秒 |
| Warm Start | App 在記憶體但被掛起 | < 500ms |
| Hot Start | App 在前台但被其他覆蓋 | < 200ms |

### React Native 啟動優化

**1. Hermes 引擎優化**

Hermes 是 RN 0.61+ 預設的 JavaScript 引擎，能顯著改善啟動時間：

```javascript
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // 確保 Hermes 是預設（RN CLI 已自動設定）
};
```

確保 Gradle/Xcode build 設定使用 Hermes：

```gradle
// android/app/build.gradle
project.ext.react = [
    enableHermes: true  // 預設已是 true，確認即可
]
```

**2. JavaScript Bundle 優化**

Bundle 越大，解析時間越長。優化策略：

```bash
# 分析 bundle 大小
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --max-workers 4

# 使用 metro config 排除不必要的依賴
```

**3. 預載核心模組**

```javascript
// App.tsx - 使用 InteractionManager 延遲非關鍵初始化
import { InteractionManager } from 'react-native';

const bootstrapped = bootstrapApp();

InteractionManager.runAfterInteractions(() => {
  // 啟動完成後再初始化這些非關鍵功能
  analytics.init();
  pushNotifications.setup();
});
```

### Flutter 啟動優化

**1. Dart AOT 編譯優化**

```bash
# Release build 使用 AOT（flutter build apk/release 預設）
flutter build apk --release
flutter build ios --release
```

**2. 減少 `main()` 中的同步工作**

```dart
// ❌ 慢啟動
void main() {
  runApp(MyApp()); // 同步初始化所有依賴
}

// ✅ 快速啟動
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 非阻塞式初始化
  await Future.wait([
    Firebase.initializeApp(),
    Hive.initFlutter(),
  ]);
  
  runApp(MyApp());
}
```

**3. 懶載入（Deferred Loading）**

```dart
import 'heavy_screen.dart' deferred as heavy;

Future<void> navigateToHeavyScreen() async {
  await heavy.loadLibrary(); // 需要時才載入
  Navigator.push(context, MaterialPageRoute(
    builder: (_) => heavy.HeavyScreen(),
  ));
}
```

### iOS 原生啟動優化

**1. `didFinishLaunchingWithOptions` 瘦身**

```swift
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // 只放最關鍵的同步初始化
        // 其餘改用 async 或 lazy
        
        // ✅ 好的做法
        configureAppearance()
        configureCoreLocation() // 同步
        
        // ❌ 應該移至 background 或 lazy
        // configureAnalytics()  // 改用 async
        // configurePushNotifications()  // 改用 async
        
        return true
    }
}
```

**2. Storyboard 啟動優化**

```xml
<!-- Info.plist - 避免 LaunchStoryboard，減少視覺載入時間 -->
<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>
<!-- 使用純色而非復雜 Storyboard -->
```

### Android 原生啟動優化

**1. App Startup Library**

使用 AndroidX App Startup 庫減少啟動時間：

```kotlin
// MyInitializer.kt
class MyInitializer : Initializer<MyDependency> {
    override fun create(context: Context): MyDependency {
        return MyDependencyImpl() // 在這裡懶初始化
    }
    
    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
```

**2. 減少 Splash Screen 白屏時間**

```xml
<!-- styles.xml -->
<style name="SplashTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">@drawable/splash_background</item>
    <item name="android:windowFullscreen">true</item>
</style>
```

## 二、記憶體管理

### React Native 記憶體優化

**1. 影像優化**

影像佔用的記憶體通常佔 App 總記憶體的 50%+：

```javascript
// ✅ 使用正確尺寸的影像
import { Image } from 'react-native';

// 固定尺寸，避免 OOM
<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 100, height: 100 }}
  resizeMode="cover"
/>

// ✅ 使用 FastImage（Glide 底層）
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 100, height: 100 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

**2. 大列表虛擬化**

```javascript
// ✅ 使用 FlashList 取代 FlatList（效能提升 2-10 倍）
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={largeDataset}
  renderItem={renderItem}
  estimatedItemSize={80}
  keyExtractor={item => item.id}
/>
```

**3. 監控記憶體使用**

```javascript
import { MemoryInfo } from 'react-native';

// Android 記憶體監控
const memory = new MemoryInfo();
console.log('Total Memory:', memory.totalMem);
console.log('Available Memory:', memory.availMem);
```

### Flutter 記憶體優化

**1. 影像快取設定**

```dart
// ✅ 使用 cached_network_image
CachedNetworkImage(
  imageUrl: 'https://example.com/image.jpg',
  memCacheWidth: 200, // 限制快取尺寸
  memCacheHeight: 200,
  maxWidth: 200,
  maxHeight: 200,
  placeholder: (context, url) => CircularProgressIndicator(),
  errorWidget: (context, url, error) => Icon(Icons.error),
);
```

**2. Dispose 資源**

```dart
class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  StreamSubscription? _subscription;
  ScrollController? _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _subscription = dataStream.listen((data) { /* ... */ });
  }

  @override
  void dispose() {
    _subscription?.cancel(); // ✅ 防止記憶體泄漏
    _scrollController?.dispose(); // ✅ 釋放控制器
    super.dispose();
  }
}
```

### iOS 記憶體優化

**記憶體 Warning 處理**

```swift
class ViewController: UIViewController {
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        
        // 清理 Image Cache
        imageCache.removeAllObjects()
        
        // 釋放不必要的 View
        self.someHeavyView = nil
    }
}
```

### Android 記憶體優化

**LeakCanary（開發期必備）**

```kotlin
// app/build.gradle
debugImplementation 'com.squareup.leakcanary:leakcanary-android:3.0'

// LeakCanary 會自動監控 Fragment、Activity 泄漏
// 生產環境記得移除！
debugImplementation 'com.squareup.leakcanary:leakcanary-android:3.0'
releaseImplementation 'com.squareup.leakcanary:leakcanary-android-release:3.0'
```

## 三、渲染效能優化

### React Native 渲染優化

**1. `React.memo` 避免不必要的重新渲染**

```javascript
import React, { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  // 只有 data 改變才重新渲染
  return <View>{/* complex UI */}</View>;
}, (prevProps, nextProps) => {
  // 自訂比較邏輯
  return prevProps.data.id === nextProps.data.id;
});
```

**2. `useCallback` 與 `useMemo`**

```javascript
const MyList = ({ items }) => {
  const renderItem = useCallback(({ item }) => (
    <ListItem key={item.id} data={item} />
  ), []);

  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return <FlatList data={sortedItems} renderItem={renderItem} />;
};
```

**3. Android 硬體加速**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:hardwareAccelerated="true"
  ...
>
```

### Flutter 渲染優化

**1. RepaintBoundary 隔離重繪**

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return RepaintBoundary( // 獨立图层，避免被其他動畫影響
      child: CustomPaint(
        painter: MyPainter(),
      ),
    );
  }
}
```

**2. Const Widgets（編譯期優化）**

```dart
// ✅ 使用 const 建構子
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Title')), // const
      body: const Center(child: CircularProgressIndicator()), // const
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add), // const
      ),
    );
  }
}

// ❌ 避免 - 每次 build 都建立新物件
body: Center(child: CircularProgressIndicator()),
```

**3. ListView.builder 懶載入**

```dart
// ❌ 一次性渲染所有 item
ListView(children: items.map((item) => ListTile(title: Text(item))).toList())

// ✅ 只渲染可視區域
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ListTile(title: Text(items[index])),
)
```

### iOS UI 渲染優化

**1. 避免主執行緒阻塞**

```swift
// ✅ 所有耗時操作放在 background queue
DispatchQueue.global(qos: .userInitiated).async {
    let processedData = self.processImages(images)
    DispatchQueue.main.async {
        self.updateUI(with: processedData)
    }
}

// ❌ 阻塞主執行緒
let processedData = self.processImages(images) // 可能在這卡住
self.updateUI(with: processedData)
```

**2. CALayer 優化**

```swift
// 複雜動畫使用 CAShapeLayer 而非 drawRect
let path = UIBezierPath()
path.move(to: CGPoint(x: 0, y: 0))
path.addLine(to: CGPoint(x: 100, y: 100))

let shapeLayer = CAShapeLayer()
shapeLayer.path = path.cgPath
shapeLayer.strokeColor = UIColor.red.cgColor
shapeLayer.fillColor = UIColor.clear.cgColor
view.layer.addSublayer(shapeLayer)
```

### Android UI 渲染優化

**1. ViewStub 延遲載入複雜 UI**

```xml
<!-- 只在需要時才 inflate -->
<ViewStub
    android:id="@+id/stub_import"
    android:layout="@layout/heavy_layout"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />

<!-- Kotlin: -->
val stub = findViewById<ViewStub>(R.id.stub_import)
stub?.inflate() // 觸發 inflate
```

**2. RecyclerView 優化**

```kotlin
// 使用 DiffUtil 計算差異，而非 notifyDataSetChanged
class MyAdapter : RecyclerView.Adapter<MyAdapter.ViewHolder>() {
    
    fun updateItems(newItems: List<Item>) {
        val diffCallback = ItemDiffCallback(items, newItems)
        val diffResult = DiffUtil.calculateDiff(diffCallback)
        items = newItems
        diffResult.dispatchUpdatesTo(this)
    }
}
```

## 四、網路效能優化

### API 呼叫優化

**1. 請求合併（Batching）**

```
# ❌ 逐個請求（10 個相關請求 = 10 個網路來回）
GET /user/1
GET /user/1/posts
GET /user/1/followers
...

# ✅ 使用 Batching 或 GraphQL
POST /graphql
{
  user(id: 1) {
    name
    posts { title }
    followers { name }
  }
}
```

**2. 快取策略**

| 策略 | 適用場景 | 實作 |
|------|---------|------|
| Cache-First | 不常變更的資料（設定、配置）| 先取快取，再背景更新 |
| Network-First | 需要最新資料（金融報價）| 先網路，降級快取 |
| Stale-While-Revalidate | 平衡新舊（社群動態）| 先顯示快取，同時更新 |
| Cache-Only | 離線場景 | 只取快取，無網路則失敗 |

### 壓縮與傳輸優化

**gzip / Brotli 壓縮**

伺服器端開啟壓縮可減少 60-80% 的傳輸大小：

```javascript
// React Native - 確認 fetch 支援 compression
fetch('https://api.example.com/data', {
  headers: { 'Accept-Encoding': 'gzip, deflate, br' }
});
```

**漸進式載入**

```javascript
// ✅ 先載入低解析度縮圖，用戶點擊後再載入原圖
<FastImage
  source={{
    uri: 'https://example.com/thumbnail.jpg',
    // 原圖只在需要時取用
  }}
/>
```

## 五、效能監控工具

### React Native

| 工具 | 用途 |
|------|------|
| React Native Dev Menu → Perf Monitor | 即時 FPS / 記憶體監控 |
| Flipper | Network、Layout、Crash 監控 |
| Sentry | 生產環境錯誤 + 效能追蹤 |
| New Relic / Datadog | APM 企業級監控 |

### Flutter

| 工具 | 用途 |
|------|------|
| Dart DevTools → Timeline | 追蹤幀渲染時間 |
| Flutter Inspector | Widget tree 分析 |
| Observatory | Dart VM 效能分析 |

### iOS

| 工具 | 用途 |
|------|------|
| Instruments (Xcode) | Time Profiler, Leaks, Allocations |
| Xcode Organizer | 啟動時間、記憶體趨勢 |
| MetricKit | 生產環境 crash + 效能分析 |

### Android

| 工具 | 用途 |
|------|------|
| Android Profiler (Android Studio) | CPU / Memory / Network |
| Perfetto | 系統層級追蹤 |
| R8 / ProGuard | 生產優化（程式碼縮減、最佳化） |

## 六、效能檢查清單

### 每次發版前檢查

- [ ] Cold start 時間 < 2 秒
- [ ] 60 FPS 在主要場景無卡頓
- [ ] 記憶體無持續成長（無記憶體泄漏）
- [ ] API 回應時間合理（< 500ms 或有適當 loading 狀態）
- [ ] 離開 App 後記憶體有正常釋放
- [ ] 網路請求有適當的錯誤處理與重試機制

### 新功能上線前

- [ ] 新的第三方函式庫做記憶體 profile
- [ ] 大清單滑動測試（500+ items）
- [ ] 弱網環境測試（3G / 離線）
- [ ] 低記憶體設備測試（1GB RAM 裝置）

## 七、結語

效能優化是一個持續的過程，不是一次性的專案。建議建立效能預算（Performance Budget），在 CI/CD 流程中加入效能測試環節，主動發現退化而非等到使用者抱怨。

**核心原則**：

1. **測量先於優化** — 不測量就無法知道瓶頸在哪
2. **一次只做一個改變** — 有利於確認優化效果
3. **在真實設備上測試** — 模擬器不等於真實效能
4. **照顧長尾裝置** — 旗艦機流暢不等於全線產品流暢

---

*最後更新：2026-04-01*
