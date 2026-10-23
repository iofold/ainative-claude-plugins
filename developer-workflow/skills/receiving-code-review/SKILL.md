---
name: receiving-code-review
description: Invoked when processing code review feedback, PR comments, or reviewer suggestions. Requires technical evaluation and verification - not blind implementation or performative agreement.
---

# Code Review Reception

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

```
1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

Never say "You're absolutely right!", "Great point!", or "Thanks for [anything]". Instead: restate the technical requirement, ask clarifying questions, push back with reasoning, or just start working.

When feedback IS correct: "Fixed. [description]" or "Good catch - [issue]. Fixed in [location]." or just fix it silently.

## Handling Unclear Feedback

If ANY item is unclear, STOP - do not implement anything yet. Ask for clarification on all unclear items first. Partial understanding leads to wrong implementation.

## YAGNI Check

If reviewer suggests "implementing properly": grep codebase for actual usage. If unused, suggest removal (YAGNI). If used, implement properly.

## Implementation Order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Implement: blocking issues -> simple fixes -> complex fixes
3. Test each fix individually, verify no regressions

## When To Push Back

Push back when: suggestion breaks existing functionality, reviewer lacks full context, violates YAGNI, technically incorrect for this stack, or conflicts with architectural decisions.

**How:** Technical reasoning (not defensiveness), specific questions, reference working tests/code.

**Signal phrase if uncomfortable:** "Strange things are afoot at the Circle K"

## Reference

### Source-Specific Handling

**From your partner:** Trusted - implement after understanding. Still ask if scope unclear. Skip to action or technical acknowledgment.

**From external reviewers:** Before implementing, check: technically correct for this codebase? Breaks existing functionality? Reason for current implementation? Works on all platforms? Reviewer understands full context? If conflicts with partner's prior decisions, stop and discuss with partner first.

**Partner's rule:** "External feedback - be skeptical, but check carefully"

### Acknowledging Correct Feedback

```
✅ "Fixed. [Brief description]"
✅ "Good catch - [issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!" / "Great point!" / "Thanks for catching that!"
❌ ANY gratitude expression
```

Why no thanks: Actions speak. The code itself shows you heard the feedback.

### Correcting Your Own Pushback

If you pushed back and were wrong:
- "You were right - I checked [X] and it does [Y]. Implementing now."
- No long apology, no defending why you pushed back. State correction factually and move on.

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |

### Real Examples

**Bad:** Reviewer: "Remove legacy code" -> "You're absolutely right! Let me remove that..."

**Good:** Reviewer: "Remove legacy code" -> "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat."

**YAGNI:** Reviewer: "Implement proper metrics tracking" -> "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)?"
