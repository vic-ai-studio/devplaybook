# Code Review Checklist

Use this checklist when reviewing PRs. Not every item applies to every PR — use judgment.

---

## 🔐 Security

- [ ] **No secrets in code** — API keys, tokens, passwords are in env vars, not source
- [ ] **Input validation** — all user inputs validated and sanitized before use
- [ ] **SQL injection** — parameterized queries used, no string interpolation in SQL
- [ ] **XSS prevention** — user data escaped before rendering in HTML
- [ ] **Auth checks** — endpoints verify authentication AND authorization (not just auth)
- [ ] **Dependency audit** — no known vulnerable packages added (`npm audit`)
- [ ] **Sensitive data in logs** — PII, passwords, tokens not logged in plaintext
- [ ] **CORS** — cross-origin policy is explicitly set, not `*` on sensitive endpoints

---

## ⚡ Performance

- [ ] **N+1 queries** — no loops that trigger database queries (use includes/joins)
- [ ] **Indexes** — new query patterns have corresponding DB indexes
- [ ] **Caching** — expensive repeated operations cached appropriately
- [ ] **Pagination** — list endpoints paginated, not returning unbounded results
- [ ] **Async operations** — blocking operations not on the critical path
- [ ] **Bundle size** — new dependencies checked for size impact (`bundlephobia.com`)

---

## 🏗️ Design & Architecture

- [ ] **Single responsibility** — functions/classes do one thing
- [ ] **DRY principle** — no significant duplication that warrants a shared utility
- [ ] **Separation of concerns** — business logic not mixed with I/O code
- [ ] **Error handling** — errors caught, handled, and surfaced appropriately
- [ ] **No silent failures** — caught exceptions are logged or re-thrown, not swallowed
- [ ] **Backward compatibility** — API changes don't break existing consumers
- [ ] **Config over constants** — magic numbers and strings extracted to named constants

---

## 🧪 Testing

- [ ] **Test coverage** — new behavior has test coverage
- [ ] **Edge cases** — boundary conditions and error paths tested
- [ ] **Test naming** — test names describe behavior, not implementation
- [ ] **No flaky tests** — tests don't depend on timing or external state
- [ ] **Mocks appropriate** — mocked only at system boundaries (not internal functions)

---

## 📖 Readability

- [ ] **Variable names** — names are descriptive and unambiguous
- [ ] **Function length** — functions are short enough to understand without scrolling
- [ ] **Comments explain "why"** — not "what" (what should be clear from the code)
- [ ] **TODO comments** — any TODOs have a linked issue, not open-ended
- [ ] **Dead code** — no commented-out code blocks committed

---

## 🚀 Operational Readiness

- [ ] **Observability** — new features emit appropriate logs/metrics/traces
- [ ] **Error messages** — error messages are actionable and non-leaking
- [ ] **Graceful degradation** — service degrades gracefully when dependencies fail
- [ ] **Migrations safe** — DB migrations are backwards-compatible (no locked tables)
- [ ] **Environment parity** — behavior consistent between dev/staging/prod

---

## PR Housekeeping

- [ ] **PR description** — explains what changed and why (not just "fixed bug")
- [ ] **Linked issue** — PR references the related issue/ticket
- [ ] **Small scope** — PR is focused on one thing (not multiple unrelated changes)
- [ ] **CI passing** — all automated checks green before requesting review
- [ ] **Self-reviewed** — author reviewed their own diff before requesting review

---

## Review Response Guide

| Prefix | Meaning | Requires response? |
|--------|---------|-------------------|
| `nit:` | Minor style suggestion | No — author's call |
| `q:` | Genuine question | Yes — clarify or fix |
| `suggest:` | Non-blocking idea | No — consider if easy |
| `issue:` | Must fix before merge | Yes — fix required |
| `FYI:` | Information only | No |
