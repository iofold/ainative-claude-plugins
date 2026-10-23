---
name: make-issue-spec
description: Create a structured issue specification document for a task or feature. Use when asked to "create an issue", "write a spec", "document this task", "make a task spec", or when a piece of work needs a clear written specification before implementation.
---

# Make Issue Spec

Create a clear, structured specification for a task or feature. Ask clarifying questions for anything underspecified before writing.

**Save to:** `issues/YYYYMMDD-description.md`

## Process

1. **Understand the request** - Read relevant code/docs for context
2. **Ask questions** - Clarify anything ambiguous or underspecified (one question at a time)
3. **Write the spec** - Use the template below
4. **Stage in git** - `git add issues/YYYYMMDD-description.md`

## Template

```markdown
# [Title]: Brief descriptive title

## Context
Why this work is needed. Link to related code, issues, or conversations.
What exists today and what problem this solves.

## Requirements
- [ ] Requirement 1 - specific, testable
- [ ] Requirement 2 - specific, testable
- [ ] Requirement 3 - specific, testable

## Acceptance Criteria
- [ ] Criterion 1 - how to verify requirement is met
- [ ] Criterion 2 - how to verify requirement is met

## Implementation Notes
Key technical considerations:
- Files likely affected: `path/to/file.ts`
- Approach: Brief description of recommended approach
- Dependencies: Any libraries, APIs, or other work this depends on
- Risks: Known risks or open questions

## Out of Scope
What this issue explicitly does NOT cover (prevents scope creep).
```

## Example

```markdown
# Add rate limiting to API gateway

## Context
The API gateway currently has no rate limiting. Under load testing,
a single client can consume all available connections, causing 503s
for other users. See `src/gateway/handler.ts`.

## Requirements
- [ ] Per-client rate limiting based on API key
- [ ] Configurable limits per endpoint (default: 100 req/min)
- [ ] Return 429 with Retry-After header when limit exceeded
- [ ] Rate limit state stored in Redis for multi-instance support

## Acceptance Criteria
- [ ] Load test: single client gets 429 after 100 requests/min
- [ ] Load test: other clients unaffected when one is rate-limited
- [ ] Limits configurable via environment variables
- [ ] Existing tests still pass

## Implementation Notes
- Files: `src/gateway/handler.ts`, `src/gateway/middleware/`
- Approach: Token bucket algorithm via `rate-limiter-flexible` library
- Dependencies: Redis connection (already configured in `src/config/redis.ts`)
- Risks: Redis latency could add ~1ms per request

## Out of Scope
- Per-user (non-API-key) rate limiting
- Dynamic rate limit adjustment
- Rate limit dashboard/monitoring
```

## Guidelines

- **Be specific** - "Handle errors" is too vague; "Return 400 with validation message for invalid email format" is testable
- **Include file paths** - Reference actual files in the codebase
- **Scope tightly** - A good spec covers one coherent piece of work
- **Out of Scope matters** - Explicitly excluding things prevents scope creep
