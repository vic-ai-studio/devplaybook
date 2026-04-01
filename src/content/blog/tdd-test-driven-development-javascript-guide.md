---
title: "TDD in Modern JavaScript/TypeScript: Practical Guide 2026"
description: "Test-Driven Development in JavaScript/TypeScript 2026: Red-Green-Refactor cycle, writing tests first, outside-in TDD, testing async code, mocking strategies, and when TDD helps most."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["TDD", "test-driven development", "JavaScript", "TypeScript", "Jest", "Vitest", "unit testing"]
readingTime: "9 min read"
category: "testing"
---

Test-Driven Development (TDD) has a reputation problem. Developers who try it once often give up — not because the approach is wrong, but because they were shown TDD in an unrealistic context: simple calculator functions that nobody actually writes. TDD's real value shows up in complex business logic, refactoring safety, and designing APIs before implementing them.

This guide focuses on practical TDD in modern JavaScript and TypeScript. Real patterns, real tradeoffs, and a complete worked example from failing test to shipped feature.

## The Red-Green-Refactor Cycle

TDD operates in three phases, repeated in short loops (5–15 minutes per cycle):

1. **Red** — Write a failing test. Run it, confirm it fails for the right reason.
2. **Green** — Write the minimum code to make the test pass. Don't over-engineer.
3. **Refactor** — Clean up both the code and the test, keeping all tests green.

The discipline is in the order. Writing a test that fails before writing the implementation forces you to think about the interface first, not the internals. This naturally leads to better-designed code.

**A key rule:** In the Green phase, write the *minimum* code to pass. It can be ugly, hardcoded, even obviously wrong for other cases. You'll handle those in subsequent Red cycles.

## A Complete Worked Example: Password Validator

Let's build a password validation function TDD-style. Requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character
- Cannot contain the username

### Cycle 1: Minimum length

**Red:**

```ts
// src/auth/password-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword } from './password-validator';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1!', 'alice');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });
});
```

Run the test — it fails with "Cannot find module './password-validator'". That's the correct Red state.

**Green:**

```ts
// src/auth/password-validator.ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(
  password: string,
  username: string
): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return { valid: errors.length === 0, errors };
}
```

Test passes. **Refactor:** nothing to clean up yet.

### Cycle 2: Uppercase requirement

**Red:**

```ts
it('rejects passwords without uppercase letters', () => {
  const result = validatePassword('alicepass1!', 'bob');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one uppercase letter');
});
```

**Green:**

```ts
if (!/[A-Z]/.test(password)) {
  errors.push('Password must contain at least one uppercase letter');
}
```

### Cycle 3: Number requirement

**Red:**

```ts
it('rejects passwords without numbers', () => {
  const result = validatePassword('AlicePass!', 'bob');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one number');
});
```

**Green:**

```ts
if (!/\d/.test(password)) {
  errors.push('Password must contain at least one number');
}
```

### Cycle 4: Special character

**Red:**

```ts
it('rejects passwords without special characters', () => {
  const result = validatePassword('AlicePass1', 'bob');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one special character');
});
```

**Green:**

```ts
if (!/[^a-zA-Z0-9]/.test(password)) {
  errors.push('Password must contain at least one special character');
}
```

### Cycle 5: Username check

**Red:**

```ts
it('rejects passwords containing the username', () => {
  const result = validatePassword('Alice1234!', 'alice');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Password cannot contain your username');
});

it('username check is case-insensitive', () => {
  const result = validatePassword('ALICE1234!', 'alice');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Password cannot contain your username');
});
```

**Green:**

```ts
if (password.toLowerCase().includes(username.toLowerCase())) {
  errors.push('Password cannot contain your username');
}
```

### Cycle 6: Valid password

**Red:**

```ts
it('accepts a valid password', () => {
  const result = validatePassword('Tr0ub4dor!', 'alice');
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

This passes immediately — the implementation already handles it. This is expected and correct.

### Final Refactor

Now that all cases pass, clean up:

```ts
// src/auth/password-validator.ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALIDATION_RULES: Array<{
  test: (password: string, username: string) => boolean;
  message: string;
}> = [
  {
    test: (p) => p.length >= 8,
    message: 'Password must be at least 8 characters',
  },
  {
    test: (p) => /[A-Z]/.test(p),
    message: 'Password must contain at least one uppercase letter',
  },
  {
    test: (p) => /\d/.test(p),
    message: 'Password must contain at least one number',
  },
  {
    test: (p) => /[^a-zA-Z0-9]/.test(p),
    message: 'Password must contain at least one special character',
  },
  {
    test: (p, u) => !p.toLowerCase().includes(u.toLowerCase()),
    message: 'Password cannot contain your username',
  },
];

export function validatePassword(
  password: string,
  username: string
): ValidationResult {
  const errors = VALIDATION_RULES
    .filter(rule => !rule.test(password, username))
    .map(rule => rule.message);

  return { valid: errors.length === 0, errors };
}
```

All tests still pass. The refactored version is more maintainable — adding a new rule is one array entry. This is the payoff of TDD: you can refactor confidently because the tests define the behavior contract.

## Outside-In TDD

The worked example above is "inside-out" TDD — start with small units and build up. Outside-in TDD (also called "London School TDD") goes the other direction: start with an integration or acceptance test that describes the entire feature, then write failing unit tests to drive the implementation.

```ts
// Integration test first — describes the full user story
it('user registration flow validates password and creates account', async () => {
  const result = await registerUser({
    email: 'alice@example.com',
    username: 'alice',
    password: 'Tr0ub4dor!',
  });

  expect(result.success).toBe(true);
  expect(result.userId).toBeDefined();
});

it('user registration rejects weak password', async () => {
  const result = await registerUser({
    email: 'alice@example.com',
    username: 'alice',
    password: 'weak',
  });

  expect(result.success).toBe(false);
  expect(result.errors).toContain('Password must be at least 8 characters');
});
```

These fail because `registerUser` doesn't exist. You then write unit tests for each component `registerUser` needs (password validator, user repository, email sender), driving each implementation from the bottom up until the integration tests pass.

Outside-in TDD is better for feature development where the acceptance criteria are clear. Inside-out TDD is better for algorithmic code and utilities.

## Testing Async Code

Modern JavaScript is heavily async. TDD with async code requires a few patterns:

**Promises:**

```ts
it('fetches user profile from API', async () => {
  const profile = await fetchUserProfile('user-123');
  expect(profile.id).toBe('user-123');
  expect(profile.email).toBeDefined();
});
```

**Async error handling:**

```ts
it('throws UserNotFoundError for unknown user', async () => {
  await expect(fetchUserProfile('nonexistent')).rejects.toThrow('User not found');
});
```

**Testing with fake timers (time-dependent code):**

```ts
import { vi, it, expect } from 'vitest';

it('session expires after 30 minutes of inactivity', () => {
  vi.useFakeTimers();

  const session = createSession('user-123');
  expect(session.isValid()).toBe(true);

  vi.advanceTimersByTime(29 * 60 * 1000); // 29 minutes
  expect(session.isValid()).toBe(true);

  vi.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes (31 total)
  expect(session.isValid()).toBe(false);

  vi.useRealTimers();
});
```

## Strategic Mocking

A common TDD mistake is mocking everything, leading to tests that pass even when the real integration is broken. The rule of thumb: **mock what you own, not what third parties own.**

**Mock your own abstractions (repositories, services):**

```ts
// Good — mocking your own UserRepository interface
const mockUserRepo = {
  findById: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' }),
  save: vi.fn().mockResolvedValue(undefined),
};

const service = new UserService(mockUserRepo);
```

**Don't mock third-party libraries directly:**

```ts
// Avoid this — brittle, tests Stripe's API not your code
vi.mock('stripe');

// Better — wrap Stripe in your own abstraction and mock that
const mockPaymentGateway: PaymentGateway = {
  charge: vi.fn().mockResolvedValue({ success: true, transactionId: 'tx-123' }),
};
```

By wrapping third-party dependencies in your own interfaces, you make them mockable and swappable. The TDD process naturally guides you here — when you write a test for your service, you realize you need to inject the dependency, which forces you to define the interface.

## Property-Based Testing with fast-check

For functions with many input combinations, property-based testing generates random inputs and verifies invariants.

```ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { validatePassword } from './password-validator';

describe('validatePassword properties', () => {
  it('always returns a result with valid boolean and errors array', () => {
    fc.assert(
      fc.property(
        fc.string(),  // any password string
        fc.string(),  // any username string
        (password, username) => {
          const result = validatePassword(password, username);
          return typeof result.valid === 'boolean' && Array.isArray(result.errors);
        }
      )
    );
  });

  it('valid passwords always produce empty errors array', () => {
    fc.assert(
      fc.property(
        // Generate strings that meet all criteria
        fc.string({ minLength: 8 }),
        (base) => {
          const validPassword = base.toUpperCase() + '1!a';
          const result = validatePassword(validPassword, 'otheruser');
          if (result.valid) {
            return result.errors.length === 0;
          }
          return true; // skip invalid generated passwords
        }
      )
    );
  });
});
```

fast-check automatically shrinks failing cases to the smallest input that reproduces the failure — incredibly useful for finding edge cases.

## When TDD Helps vs Hinders

**TDD works best for:**

- **Business logic with clear rules** — the password validator above is a perfect example. Rules are explicit, testable, and independent of infrastructure.
- **Algorithmic code** — sorting, parsing, calculation, data transformation. TDD drives the implementation through examples.
- **Refactoring existing code** — write characterization tests for the current behavior, then refactor with confidence.
- **API design** — writing tests first forces you to think about the caller's perspective, leading to better interfaces.

**TDD is harder for:**

- **UI components** — visual behavior is hard to express as failing tests first. Write tests after for UI when snapshot testing makes more sense.
- **Exploratory code** — when you don't yet know what the code should do, TDD is premature. Spike first, then write tests, then refactor.
- **Integration/infrastructure code** — wiring up databases, queues, and HTTP clients involves too much setup for a tight TDD cycle. Write integration tests after.
- **Rapidly changing requirements** — if the spec changes every day, TDD tests become maintenance overhead. Stabilize requirements first.

## Common TDD Mistakes

**Testing implementation, not behavior:**

```ts
// Bad — tests internal implementation detail
expect(validator._rules.length).toBe(5);

// Good — tests observable behavior
expect(validatePassword('weak', 'alice').valid).toBe(false);
```

**Over-mocking:**

```ts
// Bad — everything mocked, no real logic being tested
vi.mock('./utils');
vi.mock('./helpers');
vi.mock('./constants');
// ... the test no longer tests anything meaningful
```

**Skipping the Red phase:**

Writing the test and implementation simultaneously defeats the purpose. The failing test proves that your test is actually testing something. If you skip Red, you might write a test that always passes regardless of the implementation.

**Too-large Red-Green cycles:**

If your Green phase takes 30+ minutes, the test is too big. Split it into multiple smaller cycles.

## Conclusion

TDD is a skill that improves with practice. The first hour feels slow. After a week, you'll notice that your functions have cleaner interfaces, your refactors are safer, and you spend less time debugging. The test suite becomes a documentation of what the code does — runnable, authoritative, always up to date.

Start with the clearest, most rule-based parts of your codebase. Business validation logic, data transformation utilities, and service-layer orchestration are ideal starting points. Leave UI components and infrastructure wiring for later. Build the habit in the easy areas first, then apply it more broadly as the rhythm becomes natural.
