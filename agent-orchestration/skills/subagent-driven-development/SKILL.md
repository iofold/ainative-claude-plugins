---
name: subagent-driven-development
description: Dispatches a fresh subagent per task with two-stage review (spec compliance, then code quality). Use when executing implementation plans in the current session with independent tasks.
---

# Subagent-Driven Development

Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

**Announce at start:** "I'm using the subagent-driven-development skill."

## The Process

1. **Load plan** - Read plan file once, extract all tasks with full text and context, create TodoWrite
2. **Per task:**
   - Dispatch implementer subagent (`./implementer-prompt.md`) with full task text + context
   - If subagent asks questions: answer clearly before letting them proceed
   - Subagent implements, tests, commits, self-reviews
   - Dispatch spec reviewer (`./spec-reviewer-prompt.md`) - must pass before quality review
   - If spec issues: implementer fixes, spec reviewer re-reviews (loop until approved)
   - Dispatch code quality reviewer (`./code-quality-reviewer-prompt.md`)
   - If quality issues: implementer fixes, quality reviewer re-reviews (loop until approved)
   - Mark task complete in TodoWrite
3. **After all tasks** - Dispatch final code reviewer for entire implementation
4. **Finish development branch**

## Red Flags

**Never:**
- Skip either review stage (spec compliance OR code quality)
- Start quality review before spec compliance passes
- Dispatch multiple implementation subagents in parallel (conflicts)
- Make subagent read plan file (provide full text instead)
- Accept "close enough" on spec compliance
- Let implementer self-review replace actual review (both needed)
- Move to next task while either review has open issues

**If subagent fails:** Dispatch fix subagent with specific instructions. Don't fix manually (context pollution).

## Integration

- **writing-plans** - Creates the plan this skill executes
- **requesting-code-review** - Code review template for reviewer subagents
- **finishing-a-development-branch** - Complete development after all tasks
- **executing-plans** - Alternative: parallel session instead of same-session execution

---

## Reference

### Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent
- `./spec-reviewer-prompt.md` - Dispatch spec compliance reviewer subagent
- `./code-quality-reviewer-prompt.md` - Dispatch code quality reviewer subagent

### Example Workflow

```
[Read plan file once: docs/plans/feature-plan.md]
[Extract all 5 tasks with full text and context]
[Create TodoWrite with all tasks]

Task 1: Hook installation script
[Dispatch implementer with full task text + context]
Implementer: "Should the hook be installed at user or system level?"
You: "User level (~/.config/hooks/)"
Implementer: Implemented, tests passing, self-reviewed, committed.

[Dispatch spec reviewer] → Spec compliant
[Dispatch code quality reviewer] → Approved
[Mark Task 1 complete]

Task 2: Recovery modes
[Dispatch implementer] → Implements, tests passing, committed.
[Dispatch spec reviewer] → Issues: missing progress reporting, extra --json flag
[Implementer fixes] → [Spec reviewer re-reviews] → Spec compliant
[Dispatch code quality reviewer] → Issue: magic number
[Implementer fixes] → [Code quality re-reviews] → Approved
[Mark Task 2 complete]

... (remaining tasks)

[Dispatch final code reviewer] → Ready to merge
```

### Advantages

**vs. Manual execution:** Fresh context per task, parallel-safe, subagents follow TDD naturally, subagent can ask questions before and during work.

**vs. Executing Plans:** Same session (no handoff), continuous progress, automatic review checkpoints.

**Quality gates:** Self-review catches issues before handoff. Two-stage review with loops ensures fixes actually work. Spec compliance prevents over/under-building.

**Cost:** More subagent invocations (implementer + 2 reviewers per task) and review loops add iterations, but catches issues early.
