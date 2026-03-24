# Testing Prompts

10 structured prompts for writing, reviewing, and improving tests.

---

## TE-01 — Unit Test Generator

```
Write unit tests for this {{LANGUAGE}} function.

```{{LANGUAGE}}
{{FUNCTION_CODE}}
```

Testing framework: {{JEST_OR_PYTEST_OR_VITEST_ETC}}
Mock library: {{MOCK_LIBRARY_OR_NONE}}

Write tests covering:
1. **Happy path** — normal input, expected output
2. **Edge cases** — empty, null/undefined, minimum/maximum values, empty arrays
3. **Error cases** — invalid input, exceptions that should be thrown
4. **Boundary conditions** — values just inside and outside valid ranges

For each test:
- Use descriptive test names ("should return empty array when input is null" not "test1")
- Arrange-Act-Assert structure
- One assertion per test where possible (or one behavior per test)
- Mock external dependencies

Show all tests in a single test file.
```

---

## TE-02 — Integration Test Design

```
Design integration tests for this flow.

**Flow being tested:** {{FLOW_DESCRIPTION}}
**Services involved:** {{SERVICES_AND_DEPENDENCIES}}
**Critical paths:**
1. {{CRITICAL_PATH_1}}
2. {{CRITICAL_PATH_2}}

**Infrastructure available for tests:**
{{TEST_INFRA}}

Design integration tests covering:
1. **Success scenarios** — full happy path end-to-end
2. **Service failure scenarios** — what happens when {{DEPENDENCY}} is down/slow/returns errors
3. **Data consistency** — data written correctly and readable after the flow
4. **Idempotency** — re-running the operation produces the same result

For each test:
- Setup (data seeding, mock/stub configuration)
- The action being tested
- Assertions (what to verify and where)
- Teardown

Show as actual test code.
```

---

## TE-03 — Test Coverage Analysis

```
Analyze this code for test coverage gaps.

```{{LANGUAGE}}
{{CODE}}
```

Existing tests:
```{{LANGUAGE}}
{{EXISTING_TESTS}}
```

Identify:
1. **Untested code paths** — branches, conditions, and error cases not covered
2. **Missing edge cases** — inputs that could reveal bugs
3. **Risky untested areas** — code where a bug would be most impactful
4. **Tests that don't actually test anything** — passing tests that wouldn't catch real bugs

For each gap, write the specific test that would cover it.
```

---

## TE-04 — Test Refactoring

```
Refactor these tests. They work but they're hard to maintain.

```{{LANGUAGE}}
{{TEST_CODE}}
```

Problems I can see:
{{KNOWN_PROBLEMS_OR_JUST_REFACTOR}}

Improve the tests by:
1. **DRY** — extract repeated setup into `beforeEach` or helper functions
2. **Naming** — make test names describe behavior, not implementation
3. **Assertions** — use the most specific assertion available (not just `toBeTruthy`)
4. **Isolation** — ensure tests don't depend on each other's state
5. **Clarity** — make the Arrange-Act-Assert sections obvious

Show the refactored tests and explain the key improvements.
```

---

## TE-05 — E2E Test Script

```
Write an end-to-end test for this user flow.

**Flow:** {{USER_FLOW_DESCRIPTION}}
**Tool:** {{PLAYWRIGHT_OR_CYPRESS_OR_PUPPETEER}}
**Application URL:** {{APP_URL_OR_LOCALHOST}}
**Test user credentials:** {{CREDENTIALS_OR_HOW_TO_SET_UP}}

**Steps in the flow:**
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}
...

Write the E2E test that:
- Uses locators by role/label/text (not fragile CSS selectors or test-ids as last resort)
- Handles async operations with proper waits (not arbitrary `sleep`)
- Includes assertions after each significant action
- Cleans up test data on completion
- Has a meaningful test description

Include setup/teardown if needed.
```

---

## TE-06 — Mock and Stub Design

```
Design mocks and stubs for testing this code in isolation.

```{{LANGUAGE}}
{{CODE_WITH_DEPENDENCIES}}
```

**Dependencies to mock:**
{{LIST_DEPENDENCIES}}

For each dependency, decide:
1. **Mock vs. stub vs. spy** — what's the right test double and why
2. **What to simulate** — success responses, error responses, timeouts
3. **Verification** — what interactions to assert (was the dependency called correctly?)

Show the mock setup code and 2-3 example tests using these mocks.

Avoid over-mocking — if a dependency is simple and deterministic (like a utility function), suggest testing with the real thing.
```

---

## TE-07 — Performance Test Design

```
Design performance tests for this {{ENDPOINT_OR_FUNCTION}}.

**Target:** {{WHAT_YOURE_TESTING}}
**Tool:** {{K6_OR_LOCUST_OR_JMH_ETC}}
**Performance requirements:**
- Throughput: {{RPS_TARGET}}
- P99 latency: {{LATENCY_TARGET}}
- Under load duration: {{TEST_DURATION}}

**Typical usage patterns:**
{{USAGE_PATTERNS}}

Write:
1. **Baseline test** — single user, establish normal performance
2. **Load test** — ramp to target RPS, hold, ramp down
3. **Stress test** — push beyond target to find breaking point
4. **Spike test** — sudden traffic spike, measure recovery

Include:
- The test script
- Thresholds that should cause test failure
- What metrics to collect and report
```

---

## TE-08 — Property-Based Test Design

```
Design property-based tests for this function.

```{{LANGUAGE}}
{{FUNCTION_CODE}}
```

**Testing library:** {{FAST_CHECK_OR_HYPOTHESIS_OR_PROPTEST_ETC}}

Property-based testing finds bugs that example-based tests miss by testing with hundreds of random inputs.

For this function:
1. **Identify invariants** — properties that must always be true regardless of input
   (e.g., "sorting never changes length", "reversing twice returns original")
2. **Identify relationships** — input/output relationships that hold for all valid inputs
3. **Identify valid input space** — what inputs are valid, how to generate them

Write property tests for the top 3-5 properties. Include:
- The property being tested (in plain English)
- The generator for inputs
- The assertion

Also identify inputs that should be excluded from generation (invalid inputs, if function doesn't handle them).
```

---

## TE-09 — Test Data Factory

```
Create a test data factory for these models.

**Models:**
```{{LANGUAGE}}
{{MODEL_DEFINITIONS}}
```

**Testing framework:** {{FRAMEWORK}}
**Fake data library available:** {{FAKER_OR_NONE}}

Build a factory that:
1. Generates realistic test data (not `test_user_1`, `foo@bar.com`)
2. Allows overriding specific fields for test-specific scenarios
3. Handles relationships between models (creates parent records when needed)
4. Has variants for common test scenarios (e.g., `userFactory.admin()`, `userFactory.inactive()`)

Show the factory implementation and 5 example usages demonstrating the override pattern.
```

---

## TE-10 — Test Strategy for Legacy Code

```
Design a testing strategy for this untested legacy code.

```{{LANGUAGE}}
{{LEGACY_CODE}}
```

**Constraints:**
- Can't refactor until tests exist (chicken-and-egg)
- Must not break current behavior
- Time available: {{AVAILABLE_TIME}}

Design a pragmatic strategy:
1. **Risk triage** — which parts are most dangerous to have untested? Start there.
2. **Characterization tests** — how to write tests that capture current behavior without understanding it
3. **Seam identification** — where can you inject test doubles without refactoring?
4. **Incremental coverage** — order of operations to build coverage safely
5. **Quick wins** — what can be tested right now without any changes?

Show 2-3 example characterization tests for the highest-risk section of the code.
```
