---
name: systematic-debugging
description: Activate on bug reports, test failures, errors, crashes, unexpected behavior, or requests to debug/investigate/find root cause. Use BEFORE proposing fixes.
---

# Systematic Debugging

**Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

If you haven't completed Phase 1, you cannot propose fixes. Symptom fixes are failure.

**3+ failed fixes = question the architecture, not the code.**

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

BEFORE attempting ANY fix:

1. **Read error messages carefully** - stack traces, line numbers, error codes. They often contain the answer.
2. **Reproduce consistently** - exact steps, every time. If not reproducible, gather more data — don't guess.
3. **Check recent changes** - git diff, new dependencies, config changes, environmental differences.
4. **Gather evidence at component boundaries** - in multi-component systems, log inputs/outputs at each layer boundary. Run once to find WHERE it breaks, THEN investigate that component.
5. **Trace data flow** - where does the bad value originate? Trace backward to source. Fix at source, not symptom. See `root-cause-tracing.md` for the complete technique.

### Phase 2: Pattern Analysis

1. **Find working examples** - locate similar working code in the same codebase.
2. **Compare completely** - read reference implementations fully, don't skim. List every difference.
3. **Understand dependencies** - components, config, environment, assumptions.

### Phase 3: Hypothesis Testing

1. **Form single hypothesis** - "X is the root cause because Y." Be specific.
2. **Test minimally** - smallest possible change, one variable at a time.
3. **Evaluate** - worked? Phase 4. Didn't work? New hypothesis. Don't stack fixes.

### Phase 4: Implementation

1. **Create failing test** - simplest reproduction. Use `code-quality:test-driven-development` skill.
2. **Implement single fix** - address root cause. ONE change. No "while I'm here" improvements.
3. **Verify** - test passes, no regressions, issue resolved.
4. **If fix doesn't work** - count attempts. Under 3: return to Phase 1. **At 3+: STOP.**

**3+ failures = architectural problem.** Each fix revealing new issues in different places means the pattern is wrong, not the code. Discuss with your human partner before continuing.

## Red Flags — STOP and Return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see"
- Proposing solutions before tracing data flow
- "One more fix attempt" after 2+ failures
- Each fix reveals problems in different places

## Supporting Techniques

- **`root-cause-tracing.md`** - Trace bugs backward through call stack
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling

---

## Reference

### Phase 1 Extended: Multi-Component Diagnostic Example

```bash
# Layer 1: Workflow
echo "=== Secrets available in workflow: ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: Build script
echo "=== Env vars in build script: ==="
env | grep IDENTITY || echo "IDENTITY not in environment"

# Layer 3: Signing script
echo "=== Keychain state: ==="
security list-keychains
security find-identity -v

# Layer 4: Actual signing
codesign --sign "$IDENTITY" --verbose=4 "$APP"
```

This reveals which layer fails (secrets→workflow, workflow→build, etc.)

### Quick Reference Table

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

### Signals You're Doing It Wrong

- "Is that not happening?" — assumed without verifying
- "Will it show us...?" — should have added evidence gathering
- "Stop guessing" — proposing fixes without understanding
- "Ultrathink this" — question fundamentals, not symptoms

### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem. |

### When No Root Cause Found

If systematic investigation reveals a truly environmental, timing-dependent, or external issue:

1. Document what you investigated
2. Implement appropriate handling (retry, timeout, error message)
3. Add monitoring/logging for future investigation

But: 95% of "no root cause" cases are incomplete investigation.
