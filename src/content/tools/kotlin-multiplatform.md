---
title: "Kotlin Multiplatform — Share Business Logic Across iOS & Android"
description: "Kotlin Multiplatform (KMP) lets you share business logic, data layer, and networking code between iOS and Android while keeping native UIs for each platform."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source (JetBrains). No licensing fees."
website: "https://kotlinlang.org/docs/multiplatform.html"
github: "https://github.com/JetBrains/kotlin"
tags: ["kotlin", "mobile", "ios", "android", "multiplatform", "jetbrains", "kmp"]
pros:
  - "Native UI per platform — iOS feels like iOS, Android feels like Android"
  - "Share core business logic, networking, and database code between platforms"
  - "Strong Kotlin ecosystem with Ktor (networking) and SQLDelight (database)"
  - "Compose Multiplatform extends KMP to shared UI across platforms"
  - "Google officially supports KMP as a recommended approach for Android"
cons:
  - "iOS developers must learn Kotlin — adds onboarding cost"
  - "Project setup is complex compared to React Native or Expo"
  - "Ecosystem still maturing — fewer KMP-ready libraries than platform-specific ones"
  - "Smaller community than Flutter or React Native"
date: "2026-04-02"
---

## What is Kotlin Multiplatform?

Kotlin Multiplatform (KMP) is JetBrains' approach to code sharing across platforms. Rather than writing the entire app once (like Flutter or React Native), KMP focuses on sharing the business logic layer — networking, data models, validation, repositories, use cases — while letting each platform keep its native UI.

On Android, you write Jetpack Compose or XML Views. On iOS, you write SwiftUI or UIKit. The shared Kotlin module compiles to a native iOS framework (via Kotlin/Native) and a standard Android library (via Kotlin/JVM), so both platforms call the same business logic with zero bridge overhead.

## Architecture: The Shared Module

A KMP project typically has three source sets:

```
shared/
├── commonMain/    # Shared Kotlin code (platform-agnostic)
├── androidMain/   # Android-specific implementations
└── iosMain/       # iOS-specific implementations

androidApp/        # Android UI (Jetpack Compose)
iosApp/            # iOS UI (SwiftUI)
```

Code in `commonMain` is compiled for all targets. Code in `androidMain` and `iosMain` provides platform-specific implementations of interfaces defined in `commonMain`.

## The expect/actual Pattern

The key mechanism for platform-specific code in KMP:

```kotlin
// commonMain: declare expected platform behavior
expect fun platformName(): String
expect class PlatformStorage(key: String) {
    fun read(): String?
    fun write(value: String)
}

// androidMain: actual Android implementation
actual fun platformName() = "Android ${Build.VERSION.SDK_INT}"
actual class PlatformStorage actual constructor(private val key: String) {
    actual fun read() = sharedPreferences.getString(key, null)
    actual fun write(value: String) = sharedPreferences.edit().putString(key, value).apply()
}

// iosMain: actual iOS implementation
actual fun platformName() = UIDevice.currentDevice.systemName()
actual class PlatformStorage actual constructor(private val key: String) {
    actual fun read() = NSUserDefaults.standardUserDefaults.stringForKey(key)
    actual fun write(value: String) = NSUserDefaults.standardUserDefaults.setObject(value, key)
}
```

## Ktor: Networking in KMP

Ktor is JetBrains' multiplatform HTTP client, designed to work in `commonMain`:

```kotlin
// Runs on both iOS and Android without platform-specific code
class UserRepository(private val client: HttpClient) {
    suspend fun fetchUsers(): List<User> {
        return client.get("https://api.example.com/users").body()
    }
}

// Setup
val client = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(Logging) { level = LogLevel.HEADERS }
}
```

## SQLDelight: Shared Database

SQLDelight generates typesafe Kotlin code from SQL queries and runs on both Android (SQLite) and iOS (SQLite via native driver):

```sql
-- shared/src/commonMain/sqldelight/com/example/User.sq
CREATE TABLE User (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

selectAll:
SELECT * FROM User;

insert:
INSERT INTO User(id, name, email) VALUES (?, ?, ?);
```

```kotlin
// Generated typesafe access in Kotlin
val users: List<User> = database.userQueries.selectAll().executeAsList()
database.userQueries.insert(id = 1, name = "Alice", email = "alice@example.com")
```

## Compose Multiplatform: Shared UI

While KMP's primary value is shared logic, Compose Multiplatform (CMP) extends Jetpack Compose to iOS, Desktop, and Web:

```kotlin
// Shared UI in commonMain (runs on iOS, Android, Desktop)
@Composable
fun UserList(users: List<User>) {
    LazyColumn {
        items(users) { user ->
            Text(user.name, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
```

CMP is production-ready for Desktop and Android; iOS CMP is stable as of late 2024.

## KMP vs Flutter vs React Native

| Factor | KMP | Flutter | React Native |
|--------|-----|---------|-------------|
| UI approach | Native per platform | Shared custom | Native widgets |
| Code sharing | Logic only (or full with CMP) | Full (Flutter) | Full |
| Native feel | Excellent | Good | Excellent |
| Language | Kotlin | Dart | JavaScript/TypeScript |
| iOS devs need to learn | Kotlin | Dart | JavaScript |
| Android devs need to learn | SwiftUI (for iOS UI) | Dart | JavaScript |
| Ecosystem | Growing | pub.dev | npm (huge) |
| Setup complexity | High | Medium | Medium |

KMP is the right choice when you have separate Android and iOS teams who want to keep their native UI expertise while eliminating duplicated business logic. If you want a single team building one codebase with shared UI, Flutter or React Native are more appropriate.

## Getting Started

```bash
# Install KMP project wizard (IntelliJ IDEA or Android Studio required)
# Use the KMP project wizard at: https://kmp.jetbrains.com/

# Or create via command line with Kotlin Multiplatform Plugin
```

The recommended tooling is Android Studio with the Kotlin Multiplatform Mobile plugin, which provides project templates, device simulators, and shared module configuration wizards.

KMP represents a pragmatic, incremental approach to cross-platform development — share what makes sense to share (business logic, APIs, data models), keep what benefits from being native (UI, platform integrations). Google's endorsement and JetBrains' continued investment make it a safe long-term bet for teams building on the Android/Kotlin ecosystem.
