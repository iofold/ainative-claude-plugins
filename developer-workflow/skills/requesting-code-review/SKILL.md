---
name: requesting-code-review
description: Invoked when requesting code review, checking implementation quality, or before merging major features. Dispatches a code-reviewer subagent to catch issues early.
---

# Requesting Code Review

Dispatch a code-reviewer subagent to catch issues before they cascade.

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-reviewer subagent** using Task tool with template at `code-reviewer.md`:
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` / `{HEAD_SHA}` - Commit range
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- **Critical:** Fix immediately
- **Important:** Fix before proceeding
- **Minor:** Note for later
- **Wrong:** Push back with reasoning

## Integration with Workflows

- **Subagent-Driven Development:** Review after EACH task
- **Executing Plans:** Review after each batch (3 tasks)
- **Ad-Hoc:** Review before merge or when stuck

## Reference

### Red Flags

**Never:** Skip review because "it's simple", ignore Critical issues, proceed with unfixed Important issues.

**If reviewer wrong:** Push back with technical reasoning, show code/tests, request clarification.

See template at: `requesting-code-review/code-reviewer.md`
