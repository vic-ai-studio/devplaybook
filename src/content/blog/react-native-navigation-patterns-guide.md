---
title: "React Native Navigation: React Navigation 7 Complete Guide"
description: "Complete guide to React Native navigation in 2026: Stack, Tab, Drawer navigators with React Navigation 7, TypeScript typed params, deep linking, auth flow patterns, shared element transitions, and Expo Router comparison."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: [react-native, navigation, react-navigation, expo-router, typescript, mobile]
readingTime: "10 min read"
category: "mobile"
---

# React Native Navigation: React Navigation 7 Complete Guide

Navigation is the backbone of every mobile app. React Navigation 7 is the dominant solution for React Native, and Expo Router has emerged as a compelling file-based alternative for Expo projects. This guide covers the complete stack: navigator types, TypeScript params, deep linking, auth flows, and a clear comparison so you pick the right tool.

## Installation and Setup

```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context

# Stack navigator
npm install @react-navigation/native-stack

# Tab navigator
npm install @react-navigation/bottom-tabs

# Drawer navigator
npm install @react-navigation/drawer react-native-gesture-handler react-native-reanimated
```

Wrap your root component with `NavigationContainer`:

```javascript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

## Stack Navigator

The native stack navigator uses iOS `UINavigationController` and Android's native Fragment stack, giving you true native transitions at no extra cost:

```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import DetailScreen from './screens/DetailScreen';

const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        animation: 'slide_from_right', // or 'fade', 'none'
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
```

## Tab Navigator

Bottom tabs are the most common navigation pattern in consumer mobile apps:

```javascript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap = {
            Home: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#374151' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

## Drawer Navigator

Drawers work well for apps with many sections or secondary navigation:

```javascript
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: { backgroundColor: '#111827', width: 280 },
        drawerLabelStyle: { color: '#f9fafb', fontSize: 15 },
        drawerActiveBackgroundColor: '#374151',
        drawerActiveTintColor: '#6366f1',
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Help" component={HelpScreen} />
    </Drawer.Navigator>
  );
}
```

## TypeScript Navigation: Typed Params

Type your navigation params to get autocompletion and compile-time safety:

```typescript
// types/navigation.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Define param types for each navigator
export type HomeStackParamList = {
  Home: undefined;
  Detail: { id: string; title: string };
  Comments: { postId: string; count: number };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: { query?: string };
  Profile: undefined;
};

// Screen props types
export type DetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'Detail'>;
export type SearchScreenProps = BottomTabScreenProps<MainTabParamList, 'Search'>;
```

```typescript
// screens/DetailScreen.tsx
import type { DetailScreenProps } from '../types/navigation';

export function DetailScreen({ route, navigation }: DetailScreenProps) {
  const { id, title } = route.params; // fully typed

  const goToComments = () => {
    navigation.navigate('Comments', { postId: id, count: 0 }); // type-checked
  };

  return (/* ... */);
}
```

Add the typed navigator declaration to get type-checked `useNavigation()`:

```typescript
// Extend the root param list for global useNavigation typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainTabParamList {}
  }
}
```

## Deep Linking

Deep links allow external URLs to open specific screens. Configure in `NavigationContainer`:

```javascript
// App.tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      HomeTab: {
        screens: {
          Home: 'home',
          Detail: 'posts/:id',    // maps to /posts/123
          Comments: 'posts/:postId/comments',
        },
      },
      Search: 'search',
      Profile: 'profile/:userId',
    },
  },
};

<NavigationContainer linking={linking} fallback={<SplashScreen />}>
  {/* ... */}
</NavigationContainer>
```

Test deep links with:
```bash
# iOS simulator
xcrun simctl openurl booted "myapp://posts/123"

# Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "myapp://posts/123"
```

## Auth Flow Pattern

The standard pattern for auth flows uses conditional rendering based on authentication state, not navigation guards:

```javascript
// navigation/RootNavigator.tsx
import { useAuthStore } from '../stores/useAuthStore';

export function RootNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);

  if (isLoading) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Auth screens (shown when logged in)
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Modal" component={ModalScreen} options={{ presentation: 'modal' }} />
        </>
      ) : (
        // Unauth screens (shown when logged out)
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

When `isAuthenticated` changes, React Navigation automatically handles the transition — no manual `navigation.reset()` calls needed. This approach also prevents users from navigating back to auth screens after login.

## Shared Element Transitions

For smooth element transitions between screens (like a card expanding to full screen), use `react-native-shared-element` with React Navigation:

```javascript
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import { SharedElement } from 'react-native-shared-element';

const Stack = createSharedElementStackNavigator();

// In ListScreen: wrap the shared element
<SharedElement id={`product.${item.id}.image`}>
  <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
</SharedElement>

// In DetailScreen: use the same ID
<SharedElement id={`product.${item.id}.image`}>
  <Image source={{ uri: item.imageUrl }} style={styles.hero} />
</SharedElement>

// Configure the transition
<Stack.Screen
  name="Detail"
  component={DetailScreen}
  sharedElements={(route) => [`product.${route.params.id}.image`]}
/>
```

## React Navigation vs Expo Router

| Feature | React Navigation 7 | Expo Router |
|---|---|---|
| Routing model | Imperative / component-based | File-based (like Next.js) |
| TypeScript | Manual param types | Auto-generated from file paths |
| Deep linking | Manual config | Automatic from file structure |
| Web support | Limited | Full (URL bar, SSR) |
| Learning curve | Moderate | Low (familiar if you know Next.js) |
| Flexibility | Very high | High within Expo ecosystem |
| Works with bare RN | Yes | Requires Expo (or significant setup) |
| Bundle size | Smaller (tree-shakeable) | Slightly larger |

**Choose React Navigation** if you're not using Expo, need maximum flexibility, or have an existing RN project.

**Choose Expo Router** if you're starting fresh with Expo, want automatic deep linking, or need web + native from a single codebase. Expo Router handles type generation and URL routing automatically, reducing boilerplate significantly for Expo projects.

## Navigation Performance Tips

- Use `native-stack` (not the JS-based `stack`) for native transitions — the performance difference is substantial on Android
- Set `freezeOnBlur: true` on tab screens to prevent off-screen tabs from re-rendering
- Use `lazy: true` (default in tabs) so unvisited tabs don't mount until needed
- For modals, use `presentation: 'modal'` on the stack screen rather than a separate modal navigator — it's lighter and uses native modal presentation
- Avoid deep navigator nesting (more than 3 levels) — it creates performance and DX issues

React Navigation 7's combination of native stack performance, strong TypeScript support, and the mature ecosystem of add-ons makes it the solid default for most React Native projects in 2026.
