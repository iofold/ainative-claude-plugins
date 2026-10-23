---
name: dispatching-parallel-agents
description: Dispatch one agent per independent problem domain to work concurrently. Use when facing 2+ independent tasks (different files, subsystems, or bugs) that don't share state.
---

# Dispatching Parallel Agents

Dispatch one agent per independent problem domain. Let them work concurrently.

## Independence Check

Before dispatching, confirm tasks are truly independent:
- **Different files/subsystems** - Fixing one doesn't affect others
- **No shared state** - Agents won't edit same files or use same resources
- **Self-contained** - Each task can be understood without the others

**If tasks are related**, investigate together first -- fixing one may fix others.

## The Pattern

### 1. Identify and Group

Group work by independent domain (e.g., separate test files, separate subsystems, separate bugs).

### 2. Dispatch Agents

Each agent gets:
- **Specific scope** - One file or subsystem
- **Clear goal** - What success looks like
- **Constraints** - What NOT to change
- **Required output** - Summary of findings and changes

### 3. Review and Integrate

When agents return:
1. Read each summary
2. Check for conflicts (did agents edit same code?)
3. Run full test suite
4. Spot check -- agents can make systematic errors

## Common Mistakes

| Bad | Good |
|-----|------|
| "Fix all the tests" (too broad) | "Fix agent-tool-abort.test.ts" (focused) |
| "Fix the race condition" (no context) | Paste error messages and test names |
| No constraints (agent refactors everything) | "Don't change production code" |
| "Fix it" (vague output) | "Return summary of root cause and changes" |

## When NOT to Use

- **Related failures** - Fixing one might fix others
- **Exploratory debugging** - You don't know what's broken yet
- **Shared state** - Agents would interfere with each other
- **Need full context** - Understanding requires seeing entire system

---

## Reference

### Agent Prompt Template

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:
1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by replacing arbitrary timeouts with event-based waiting
Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
```

### Real Example

**Scenario:** 6 test failures across 3 files after major refactoring

**Dispatch:**
- Agent 1 -> agent-tool-abort.test.ts (3 timing failures)
- Agent 2 -> batch-completion-behavior.test.ts (2 tool execution failures)
- Agent 3 -> tool-approval-race-conditions.test.ts (1 execution count failure)

**Results:** All fixes independent, no conflicts, full suite green. Three problems solved in the time of one.
