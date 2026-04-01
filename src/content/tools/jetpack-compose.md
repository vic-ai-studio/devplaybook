---
title: "Jetpack Compose — Android's Modern Declarative UI Toolkit"
description: "Jetpack Compose is Android's modern declarative UI framework replacing XML layouts. Build Android UI with Kotlin composable functions with live preview and Material 3."
category: "Mobile"
pricing: "Free"
pricingDetail: "Free as part of Android Jetpack. Android Studio and the Android SDK are free to use."
website: "https://developer.android.com/jetpack/compose"
tags: ["android", "kotlin", "jetpack", "compose", "google", "declarative-ui", "material"]
pros:
  - "Kotlin-first — no XML, less boilerplate than the View system"
  - "Declarative paradigm — UI is a function of state, same as React/SwiftUI"
  - "Live Preview in Android Studio — see UI changes without running the emulator"
  - "Material 3 design system built in with full theming support"
  - "Compose Multiplatform extends to iOS, Desktop, and Web"
  - "Google's primary Android UI development path going forward"
cons:
  - "Android-only without Compose Multiplatform"
  - "Learning curve for developers coming from the View/XML system"
  - "Performance profiling more complex than with the View system"
  - "Some older UI patterns (RecyclerView adapters) replaced but requires unlearning"
date: "2026-04-02"
---

## What is Jetpack Compose?

Jetpack Compose is Android's modern toolkit for building native UI, released as stable by Google in August 2021. It replaces the decades-old XML layout system with a Kotlin-based declarative UI approach where you describe what the UI should look like rather than how to build it imperatively.

Like SwiftUI on iOS, Compose is reactive: UI automatically updates when the underlying state changes. Unlike XML layouts where you'd find a view by ID and mutate it, in Compose you rebuild the UI tree from state, and Compose efficiently diffs and updates only what changed.

## Composable Functions

The building block of Compose UI is the composable function — a Kotlin function annotated with `@Composable`:

```kotlin
@Composable
fun Greeting(name: String) {
    Text(
        text = "Hello, $name!",
        style = MaterialTheme.typography.headlineMedium,
        color = MaterialTheme.colorScheme.primary
    )
}

// Compose UI is just nested function calls
@Composable
fun UserCard(user: User) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(user.name, style = MaterialTheme.typography.titleMedium)
            Text(user.email, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
```

## State Management

### remember and rememberSaveable

```kotlin
@Composable
fun Counter() {
    // remember: survives recomposition, lost on rotation
    var count by remember { mutableStateOf(0) }

    // rememberSaveable: survives rotation and process death
    var persistedCount by rememberSaveable { mutableStateOf(0) }

    Column {
        Text("Count: $count")
        Button(onClick = { count++ }) {
            Text("Increment")
        }
    }
}
```

### ViewModel Integration

For app-level state, Compose integrates with Jetpack ViewModel:

```kotlin
class UserViewModel : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    init {
        viewModelScope.launch {
            _users.value = userRepository.fetchUsers()
        }
    }
}

@Composable
fun UserListScreen(viewModel: UserViewModel = viewModel()) {
    val users by viewModel.users.collectAsState()

    LazyColumn {
        items(users, key = { it.id }) { user ->
            UserCard(user = user)
        }
    }
}
```

## Modifier System

The `Modifier` system replaces XML attributes with a chainable, ordered API:

```kotlin
Text(
    text = "Hello",
    modifier = Modifier
        .fillMaxWidth()         // match_parent width
        .padding(16.dp)         // margin/padding
        .background(Color.Blue) // background color
        .clip(RoundedCornerShape(8.dp)) // rounded corners
        .clickable { /* handle click */ }
)
```

Order matters in Modifier chains — `padding` before `background` adds padding outside the background; `background` before `padding` puts padding inside.

## LazyColumn: Efficient Lists

`LazyColumn` is the Compose equivalent of `RecyclerView` — it only composes and renders visible items:

```kotlin
@Composable
fun UserList(users: List<User>) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(16.dp)
    ) {
        item {
            Text("Users", style = MaterialTheme.typography.titleLarge)
        }
        items(
            items = users,
            key = { user -> user.id }  // stable keys for performance
        ) { user ->
            UserCard(user = user)
        }
    }
}
```

## Navigation with NavHost

Compose Navigation uses a `NavHost` with composable destinations:

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onUserClick = { userId ->
                    navController.navigate("user/$userId")
                }
            )
        }
        composable(
            route = "user/{userId}",
            arguments = listOf(navArgument("userId") { type = NavType.IntType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getInt("userId") ?: return@composable
            UserDetailScreen(userId = userId)
        }
    }
}
```

## Material 3 Theming

Compose ships with full Material 3 theming support:

```kotlin
// Define your theme
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) darkColorScheme(
        primary = Color(0xFF6200EE),
        secondary = Color(0xFF03DAC5)
    ) else lightColorScheme(
        primary = Color(0xFF6200EE),
        secondary = Color(0xFF03DAC5)
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
```

## Compose vs XML: Side-by-Side

| Aspect | Compose | XML + ViewBinding |
|--------|---------|------------------|
| Language | Kotlin only | XML + Kotlin |
| Layout definition | Kotlin functions | XML files |
| State handling | State + recomposition | Manual view updates |
| List rendering | LazyColumn | RecyclerView + Adapter |
| Preview | @Preview composable | Layout Preview |
| Animation | Compose Animation API | ObjectAnimator / MotionLayout |
| Boilerplate | Low | High (findById, adapters) |
| Interop | UIView wrappers | Native |

## Getting Started

```kotlin
// build.gradle.kts
android {
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.10" }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.8.2")
}
```

Jetpack Compose is the definitive way to build new Android UI in 2026. The XML View system still works and will be supported for years, but all new Google sample code, Android documentation, and Jetpack library updates are Compose-first. Any new Android project should start with Compose.
