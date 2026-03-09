# Agent Prompt Templates

Templates for dynamically generated exploration agents based on discovery findings.

## Discovery Agent

The single discovery agent that runs first:

```
subagent_type: "Explore"
description: "Map documentation structure"
prompt: |
  Map all documentation in this project.

  Tasks:
  1. Find all documentation files and directories:
     - Glob: **/*.md, **/*.rst, **/*.txt
     - Glob: **/docs/**, **/doc/**, **/documentation/**
     - Glob: **/swagger.*, **/openapi.*
     - Glob: **/.env.example, **/config.example.*
     - Glob: **/*.mmd, **/*.puml, **/*.drawio

  2. For each found file, note:
     - Path
     - Category (readme, api, setup, architecture, plan, changelog, etc.)
     - Approximate size
     - Last modified (if relevant)

  3. Assess project:
     - Count source files to estimate size
     - Identify primary language/framework
     - Note documentation conventions used

  4. Recommend exploration areas:
     - Group related docs that can be checked together
     - Identify which areas have enough content for dedicated agents
     - Suggest agent count based on project size

  Write to .tmp/docs-audit/discovery.md

  Format:
  ---
  ## Documentation Discovery

  ### Project Profile
  - Estimated size: [small (<50 files) / medium (50-500) / large (500+)]
  - Primary language: [language]
  - Framework: [if applicable]
  - Documentation style: [markdown/rst/jsdoc/etc]

  ### Documentation Inventory

  #### README Files
  - [ ] README.md - [exists/missing] - [brief status]
  - [ ] docs/README.md - ...

  #### API Documentation
  - [ ] [list files or "none found"]

  #### Setup/Installation
  - [ ] [list files or "none found"]

  #### Architecture/Design
  - [ ] [list files or "none found"]

  #### Plans/Specs
  - [ ] [list files or "none found"]

  #### Other Documentation
  - [ ] [any other docs found]

  ### Recommended Exploration Plan

  Based on findings, recommend this exploration structure:

  **Suggested agent count:** [N] agents

  **Agent assignments:**
  1. Agent 1: [description]
     - Files: [specific files]
     - Focus: [what to verify]

  2. Agent 2: [description]
     - Files: [specific files]
     - Focus: [what to verify]

  [Continue for each recommended agent...]

  ### Gaps & Issues Noted
  - [Any obvious gaps spotted during discovery]
  ---
```

## Exploration Agent Template

Template for agents dispatched based on discovery:

```
subagent_type: "Explore"
description: "Audit {area} documentation"
prompt: |
  Focus: {area description}

  Files to audit:
  {list of specific files from discovery}

  Tasks:
  1. Read each file thoroughly
  2. For each claim/instruction, verify against codebase:
     - Do referenced files/paths exist?
     - Do code examples work?
     - Are version numbers current?
     - Are commands accurate?
  3. Check for internal consistency
  4. Identify what's missing

  Write findings to .tmp/docs-audit/{area}-findings.md

  Format:
  ---
  ## {Area} Audit

  ### Files Reviewed
  | File | Lines | Status |
  |------|-------|--------|
  | [path] | [~N] | [accurate/outdated/mixed] |

  ### Verified Accurate
  - [file]: [section/claim that is correct]

  ### Outdated Content
  | File | Section | Issue | Should Be |
  |------|---------|-------|-----------|
  | [path] | [section] | [what's wrong] | [correct info] |

  ### Missing Documentation
  - [what's missing]: [why it matters]

  ### Broken References
  - [file:line]: [broken link/path]

  ### Recommendations
  Priority order:
  1. [Critical] [action]
  2. [High] [action]
  3. [Medium] [action]
  ---
```

## Deep Dive Agent Template

For focused follow-up exploration:

```
subagent_type: "Explore"
description: "Deep dive {specific issue}"
prompt: |
  Context: Previous exploration found issues with {specific area}.

  Previous findings:
  {paste relevant findings}

  Tasks:
  1. Investigate the specific issues in detail
  2. Gather accurate current state from codebase
  3. Draft corrected content if appropriate
  4. Verify against related documentation for consistency

  Write to .tmp/docs-audit/{area}-deep.md

  If drafting corrections, also write to:
  .tmp/docs-audit/drafts/{filename}-draft.md
```

## Validation Agent Template

For verifying proposed changes:

```
subagent_type: "Explore"
description: "Validate {area} changes"
prompt: |
  Validate proposed documentation changes.

  Draft location: .tmp/docs-audit/drafts/{file}
  Original file: {original path}

  Tasks:
  1. Read the proposed draft
  2. Verify every factual claim against codebase
  3. Check consistency with other project docs
  4. Ensure no regressions from original

  Write validation to .tmp/docs-audit/validation-{area}.md

  Format:
  ---
  ## Validation: {area}

  ### Verified Correct
  - [section]: verified

  ### Issues Found
  - [section]: [problem]

  ### Conflicts with Other Docs
  - This draft says X, but [other file] says Y

  ### Verdict
  - [ ] Ready to apply
  - [ ] Needs fixes (see issues above)
  ---
```

## Dynamic Agent Generation

When generating agents from discovery, follow these principles:

### Combining Small Areas

If discovery finds only a few files in an area, combine with related areas:

```
# Instead of separate agents for:
# - 1 README file
# - 2 setup docs
# - 1 contributing guide

# Combine into:
Agent: "Getting Started Documentation"
Files: README.md, CONTRIBUTING.md, docs/setup.md, docs/install.md
```

### Splitting Large Areas

If an area has many files, consider splitting:

```
# If API docs include:
# - 15 endpoint documentation files
# - 5 schema files
# - 3 example files

# Split into:
Agent 1: "API Endpoints A-M"
Agent 2: "API Endpoints N-Z"
Agent 3: "API Schemas & Examples"
```

### Scaling Guidelines

| Project Size | Typical Agent Count | Rationale |
|--------------|---------------------|-----------|
| Small | 1-2 | Few docs, quick audit |
| Medium | 3-4 | Moderate coverage |
| Large | 5-6 | Parallel efficiency |

### Area Examples

Common area groupings that emerge from discovery:

**Getting Started Bundle:**
- README files
- Installation guides
- Quick start docs
- Contributing guides

**API Bundle:**
- Endpoint documentation
- Request/response schemas
- Authentication docs
- API examples

**Architecture Bundle:**
- Design documents
- ADRs (Architecture Decision Records)
- System diagrams
- Component documentation

**Operations Bundle:**
- Deployment docs
- Configuration reference
- Environment setup
- Troubleshooting guides

**Development Bundle:**
- Code style guides
- Testing documentation
- Build instructions
- Development setup

**Planning Bundle:**
- Implementation plans
- Specifications
- Roadmaps
- Feature proposals
