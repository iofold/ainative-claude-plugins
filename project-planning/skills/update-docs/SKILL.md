---
name: update-docs
description: Systematically audit and update project documentation using parallel explore agents. Use when asked to sync docs with code, audit docs for accuracy, archive stale plans, or verify documentation matches the current codebase.
---

# Update Documentation

Verify and update project documentation using parallel explore agents in explore-exploit turns.

## Safety Rules

**Always:**
- Run discovery FIRST before dispatching parallel agents
- Scale agent count to actual project size
- Get user confirmation before major changes
- Archive rather than delete

**Never:**
- Dispatch agents for non-existent documentation areas
- Auto-apply major rewrites without review
- Modify code (docs-only skill)

## The Process

### Phase 1: Discovery

Launch ONE agent to map the documentation landscape:
- Find all docs: `**/*.md`, `**/docs/**`, `**/*.rst`, swagger/openapi specs, config examples, diagrams
- Categorize: READMEs, API docs, setup guides, architecture docs, plans/specs, changelogs
- Note project size, language, framework
- Identify gaps (missing READMEs, undocumented APIs)
- Write findings to `.tmp/docs-audit/discovery.md`

If `$ARGUMENTS` provided, use as focus hint but still discover actual structure first.

### Phase 2: Plan and Explore

Read discovery findings, then dispatch parallel agents scaled to project size (small: 2-3, medium: 4-5, large: 6). Each agent:
- Focuses on one documentation area from discovery
- Cross-references docs against actual codebase
- Writes findings to `.tmp/docs-audit/{area}-findings.md`

### Phase 3: Apply

Consolidate findings, then:
1. **Quick fixes** - Apply immediately
2. **Needs deeper analysis** - Launch focused agents (max 2 additional turns)
3. **Major rewrites** - Flag for user decision

Archive outdated content to `docs/archive/`, apply fixes, report results, then `rm -rf .tmp/docs-audit`.

---

## Reference

### Setup

```bash
mkdir -p .tmp/docs-audit
```

### Discovery Agent Output Format

```markdown
## Documentation Map

### Project Profile
- Size: [small/medium/large]
- Language: [primary language]
- Framework: [if applicable]

### Documentation Found
| Category | Files | Status |
|----------|-------|--------|
| README | [list] | [exists/missing] |
| API Docs | [list] | [exists/missing] |

### Recommended Parallel Exploration Areas
1. [area]: [files to check]

### Gaps Identified
- [gap description]
```

### Exploration Agent Prompt Template

```
Focus: {area description from discovery}
Files to check: {specific files from discovery}

Tasks:
1. Read each documentation file
2. Verify claims against actual codebase
3. Check for outdated information
4. Identify gaps and inaccuracies

Write findings to .tmp/docs-audit/{area}-findings.md

Format:
## {Area} Audit
### Files Reviewed
- [file]: [status]
### Outdated
- [file:section]: [issue] -> [should be]
### Missing
- [what's missing]
### Recommendations
1. [action]
```

### Final Report Format

```markdown
## Documentation Audit Complete

### Summary
- Areas explored: [list]
- Issues found: X
- Auto-fixed: Y
- Needs review: Z

### Changes Made
1. [change]

### Needs User Decision
1. [major change requiring approval]
```
