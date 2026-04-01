---
title: "SwiftUI — Apple's Declarative UI Framework for iOS & macOS"
description: "SwiftUI is Apple's declarative UI framework for building iOS, macOS, watchOS, and tvOS apps with Swift. Write once, run across Apple platforms with live preview in Xcode."
category: "Mobile"
pricing: "Free"
pricingDetail: "Free as part of Apple's SDK. Requires Xcode (free from Mac App Store). Apple Developer Program ($99/year) required to publish to App Store."
website: "https://developer.apple.com/xcode/swiftui"
tags: ["ios", "macos", "swift", "apple", "swiftui", "declarative-ui"]
pros:
  - "Declarative syntax — describe what UI should look like, not how to build it"
  - "Live Preview in Xcode — see changes instantly without running the simulator"
  - "Runs across all Apple platforms: iOS, macOS, watchOS, tvOS, visionOS"
  - "Deep Apple integration with Combine, async/await, and SwiftData"
  - "Rapidly improving — Apple ships major SwiftUI enhancements every WWDC"
cons:
  - "Apple platforms only — no cross-platform story"
  - "API surface changes significantly between iOS versions — iOS 15 vs 16 vs 17"
  - "Complex layouts and custom components harder to achieve than in UIKit"
  - "Many APIs require iOS 16+ or iOS 17+, limiting backwards compatibility"
date: "2026-04-02"
---

## What is SwiftUI?

SwiftUI is Apple's declarative UI framework introduced at WWDC 2019. It replaces (or supplements) UIKit's imperative, delegate-heavy programming model with a reactive, declarative approach: you describe what the UI should look like for a given state, and SwiftUI handles rendering and updates automatically.

SwiftUI runs on iOS, macOS, watchOS, tvOS, and visionOS — you write UI code once and it adapts to each platform's conventions. The same `NavigationStack` becomes a sidebar on macOS and a full-screen stack on iOS.

## The View Protocol

Everything in SwiftUI is a `View` — a value type (struct) that implements a `body` property:

```swift
struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Hello, SwiftUI!")
                .font(.title)
                .fontWeight(.bold)

            Image(systemName: "swift")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            Button("Tap Me") {
                print("Tapped!")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

Views are lightweight structs that get rebuilt every time state changes. SwiftUI diffs the old and new view trees to determine the minimal set of UI updates needed.

## State Management

SwiftUI has a built-in data flow system using property wrappers:

### @State — Local Component State

```swift
struct Counter: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") { count += 1 }
        }
    }
}
```

`@State` is for simple, local state owned by a single view.

### @Binding — Two-Way Data Flow

```swift
struct ToggleRow: View {
    @Binding var isEnabled: Bool

    var body: some View {
        Toggle("Enable feature", isOn: $isEnabled)
    }
}

// Parent passes $isEnabled (binding, not value)
ToggleRow(isEnabled: $featureEnabled)
```

### @ObservableObject / @Observable — Shared State

```swift
// Swift 5.9+ with @Observable macro
@Observable
class AppSettings {
    var theme: ColorScheme = .light
    var notificationsEnabled = true
}

struct SettingsView: View {
    @State private var settings = AppSettings()

    var body: some View {
        Toggle("Dark Mode", isOn: Binding(
            get: { settings.theme == .dark },
            set: { settings.theme = $0 ? .dark : .light }
        ))
    }
}
```

## Navigation: NavigationStack

Modern SwiftUI navigation uses `NavigationStack` with type-safe destinations (iOS 16+):

```swift
struct RootView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List(users) { user in
                NavigationLink(value: user) {
                    Text(user.name)
                }
            }
            .navigationDestination(for: User.self) { user in
                UserDetailView(user: user)
            }
            .navigationTitle("Users")
        }
    }
}
```

## Async/Await Integration

SwiftUI integrates naturally with Swift's structured concurrency:

```swift
struct UserListView: View {
    @State private var users: [User] = []
    @State private var isLoading = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else {
                List(users) { user in Text(user.name) }
            }
        }
        .task {  // Runs async task tied to view lifecycle
            isLoading = true
            users = await fetchUsers()
            isLoading = false
        }
    }
}
```

The `.task` modifier automatically cancels the task when the view disappears.

## SwiftData: Persistence

SwiftData (iOS 17+, macOS 14+) is SwiftUI's native persistence layer, replacing Core Data with a Swift-first API:

```swift
@Model
class Note {
    var title: String
    var content: String
    var createdAt: Date

    init(title: String, content: String) {
        self.title = title
        self.content = content
        self.createdAt = .now
    }
}

struct NotesView: View {
    @Query private var notes: [Note]
    @Environment(\.modelContext) private var context

    var body: some View {
        List(notes) { note in Text(note.title) }
        Button("Add Note") {
            context.insert(Note(title: "New", content: ""))
        }
    }
}
```

## SwiftUI vs UIKit: When to Use Each

| Scenario | Recommendation |
|----------|---------------|
| New iOS 16+ project | SwiftUI |
| Complex custom views/animations | UIKit (or UIKit + SwiftUI) |
| Targeting iOS 14+ | SwiftUI with UIKit fallbacks |
| Large existing UIKit codebase | Incremental migration to SwiftUI |
| SwiftUI layout doesn't behave | UIViewRepresentable wrapper |

SwiftUI and UIKit interoperate seamlessly — you can embed UIKit views in SwiftUI with `UIViewRepresentable` and vice versa. Most new projects start with SwiftUI and fall back to UIKit only where SwiftUI falls short.

SwiftUI is the future of Apple platform development. Its rapid improvement each WWDC cycle means the gaps with UIKit are shrinking every year. For any new iOS app targeting iOS 16+ in 2026, SwiftUI is the default choice.
