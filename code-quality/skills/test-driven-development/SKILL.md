---
name: test-driven-development
description: Activate on requests to write tests first, use TDD, red-green-refactor, or when implementing features where test-first quality matters. Use BEFORE writing production code.
---

# Test-Driven Development (TDD)

**Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Write code before the test? Delete it. Start over. Don't keep it as "reference," don't "adapt" it. Delete means delete.

## Red-Green-Refactor

### RED — Write Failing Test

One minimal test showing what should happen. One behavior, clear name, real code (no mocks unless unavoidable).

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

### Verify RED — Watch It Fail (MANDATORY)

```bash
npm test path/to/test.test.ts
```

Confirm: test **fails** (not errors), failure is expected, fails because feature is missing.
- Test passes immediately? You're testing existing behavior. Fix test.
- Test errors? Fix error, re-run until it fails correctly.

### GREEN — Minimal Code

Write the simplest code to pass the test. No extra features, no "while I'm here" improvements.

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); }
    catch (e) { if (i === 2) throw e; }
  }
  throw new Error('unreachable');
}
```

### Verify GREEN (MANDATORY)

Test passes. Other tests still pass. Output pristine. Test fails? Fix code, not test.

### REFACTOR — Clean Up

After green only: remove duplication, improve names, extract helpers. Keep tests green. Don't add behavior.

### Repeat

Next failing test for next behavior.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Bug Fix Flow

Write failing test reproducing the bug → fix → verify. Never fix bugs without a test.

```typescript
// RED
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
// GREEN
function submitForm(data: FormData) {
  if (!data.email?.trim()) return { error: 'Email required' };
  // ...
}
```

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Red Flags — Delete Code, Start Over

- Code written before test
- Test passes immediately (never saw it fail)
- "Keep as reference" or "adapt existing code"
- "I'll add tests later" / "just this once"
- "Already spent X hours, deleting is wasteful"

---

## Reference

### Why Order Matters

**"I'll write tests after"** — Tests written after pass immediately, proving nothing. You never saw them catch the bug. They're biased by your implementation — you test what you built, not what's required.

**"Already manually tested"** — No record, can't re-run, easy to forget cases. Manual ≠ systematic.

**"Deleting X hours is wasteful"** — Sunk cost fallacy. Keeping unverified code is technical debt.

**"TDD is dogmatic"** — TDD IS pragmatic: finds bugs before commit, prevents regressions, documents behavior, enables refactoring. "Pragmatic" shortcuts = debugging in production.

**"Tests-after achieve the same goals"** — Tests-after answer "what does this do?" Tests-first answer "what should this do?" 30 minutes of tests-after ≠ TDD.

### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = skip it" | Hard to test = hard to use. Listen to the test. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Existing code has no tests" | You're improving it. Add tests for what you touch. |

### Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass, output pristine
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

### Testing Anti-Patterns

See `@testing-anti-patterns.md`:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies
