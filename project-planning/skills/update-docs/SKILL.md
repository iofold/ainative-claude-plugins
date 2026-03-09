---
name: Update Documentation
description: This skill should be used when the user asks to "update documentation", "sync docs with code", "audit docs", "archive old plans", "check if docs are outdated", "verify documentation accuracy", or wants to ensure documentation matches the current codebase state.
---

# Update Documentation

Systematically verify and update project documentation using parallel explore agents in explore-exploit turns.

## Overview

This skill uses an adaptive approach:
1. **Discovery** - Map what documentation exists in the project
2. **Planning** - Determine which areas can be explored in parallel
3. **Exploration** - Dispatch agents based on discovered structure
4. **Exploitation** - Apply fixes and updates

## Arguments

If `$ARGUMENTS` provided, use as a focus hint but still discover the actual structure first.

## Phase 1: Discovery (Single Agent)

Launch ONE discovery agent first to map the documentation landscape:

```
subagent_type: "Explore"
description: "Map documentation structure"
prompt: |
  Map all documentation in this project.

  Tasks:
  1. Find all documentation files and directories:
     - Glob for **/*.md, **/docs/**, **/*.rst, **/*.txt
     - Check for swagger/openapi specs
     - Find .env.example, config examples
     - Look for diagrams (*.mmd, *.puml, *.drawio)

  2. Categorize what exists:
     - README files (root and nested)
     - API documentation
     - Setup/installation guides
     - Architecture/design docs
     - Implementation plans/specs
     - Inline code documentation patterns
     - Configuration documentation
     - Changelogs/release notes

  3. Note project characteristics:
     - Approximate size (file count)
     - Primary language/framework
     - Documentation style/format used

  4. Identify documentation gaps:
     - Directories with no README
     - Undocumented public APIs
     - Missing setup instructions

  Write findings to .tmp/docs-audit/discovery.md

  Format:
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
  ...

  ### Recommended Parallel Exploration Areas
  Based on what exists, these areas can be explored in parallel:
  1. [area]: [files to check]
  2. [area]: [files to check]
  ...

  ### Gaps Identified
  - [gap description]
```

## Phase 2: Planning

After discovery completes, read `.tmp/docs-audit/discovery.md` and determine:

1. **Which areas have enough content** to warrant dedicated agents
2. **What can be combined** (e.g., if only 2 small docs exist, one agent suffices)
3. **How many agents** to dispatch (scale to project size)

**Scaling guidelines:**
- Small project (few docs): 2-3 parallel agents
- Medium project: 4-5 parallel agents
- Large project: 6 parallel agents

**Do NOT dispatch agents for areas that don't exist.**

## Phase 3: Exploration (Parallel Agents)

Dispatch agents ONLY for areas identified in discovery. Each agent should:

1. Focus on its assigned documentation area
2. Cross-reference with actual codebase
3. Identify outdated, missing, or incorrect content
4. Write findings to `.tmp/docs-audit/{area}-findings.md`

**Agent prompt template:**
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

### Accurate
- [what's correct]

### Outdated
- [file:section]: [issue] → [should be]

### Missing
- [what's missing]

### Recommendations
1. [action]
```

## Phase 4: Consolidation

After exploration agents complete:

```bash
cat .tmp/docs-audit/*-findings.md
```

Categorize findings:
1. **Quick fixes** - Apply immediately
2. **Needs deeper analysis** - Consider another exploration turn
3. **Major rewrites** - Flag for user decision

## Phase 5: Additional Turns (Conditional)

If findings indicate areas needing deeper analysis:
- Launch focused agents for specific issues
- Maximum 2 additional turns
- Each turn should be smaller/more targeted than the previous

## Phase 6: Exploitation

After all exploration complete:

**1. Archive outdated content:**
```bash
mkdir -p docs/archive
# Move completed/abandoned plans
```

**2. Apply fixes:**
Edit files directly with accurate information from findings.

**3. Report to user:**
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

### Recommendations
- [suggestions]
```

**4. Cleanup:**
```bash
rm -rf .tmp/docs-audit
```

## Setup

Before starting:
```bash
mkdir -p .tmp/docs-audit
```

## Safety Rules

**Always:**
- Run discovery FIRST before dispatching parallel agents
- Scale agent count to actual project documentation
- Get user confirmation before major changes
- Archive rather than delete

**Never:**
- Dispatch agents for non-existent documentation areas
- Assume a fixed set of documentation categories
- Auto-apply major rewrites without review
- Modify code (docs-only skill)

## Additional Resources

For detailed patterns and prompts, see:
- **`references/agent-prompts.md`** - Agent prompt templates
- **`references/patterns.md`** - Documentation patterns to check
