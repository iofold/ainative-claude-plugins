---
name: verification-before-completion
description: Invoked before claiming "done", "fixed", "complete", "it works", "tests pass", or creating commits/PRs. Requires running verification commands and confirming output before any success claim.
---

# Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Original symptom passes | Code changed, assumed fixed |
| Requirements met | Line-by-line checklist | Tests passing |

## Key Patterns

```
Tests:      ✅ [Run] → [See: 34/34 pass] → "All tests pass"
            ❌ "Should pass now"

Regression: ✅ Write → Run (pass) → Revert → Run (MUST FAIL) → Restore → Run (pass)
            ❌ "I've written a regression test"

Build:      ✅ [Run build] → [See: exit 0] → "Build passes"
            ❌ "Linter passed"

Agent:      ✅ Agent reports → Check VCS diff → Verify changes
            ❌ Trust agent report
```

**Apply ALWAYS before:** success claims, commits, PRs, task completion, moving to next task, delegating to agents.

## Reference

### Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- **ANY wording implying success without having run verification**

### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |

### Why This Matters

From 24 failure memories: trust broken ("I don't believe you"), undefined functions shipped, missing requirements shipped, time wasted on false completion and rework. Violates: "Honesty is a core value. If you lie, you'll be replaced."

### The Bottom Line

Run the command. Read the output. THEN claim the result. Non-negotiable.
