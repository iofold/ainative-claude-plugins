---
name: git-commit-helper
description: This skill should be used when the user asks to "commit", "make a commit", "commit these changes", "write a commit message", "review staged changes", "what should I commit", "help me commit", or after completing implementation work that should be committed. Generates safe, chunked commits with sensitive file protection.
---

# Git Commit Helper

Safe, chunked commits with best practices and sensitive file protection.

## Workflow

### Step 1: Analyze Current State

```bash
# Full status
git status --porcelain

# Staged changes
git diff --staged --stat

# Unstaged changes
git diff --stat
```

### Step 2: Detect Sensitive Files (CRITICAL)

**Before ANY commit**, check for files that should NEVER be committed:

**Sensitive patterns:**
- `.env`, `.env.*` (except `.env.example`)
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.secret`
- `credentials.json`, `secrets.json`, `secrets.yaml`, `token.json`
- `service-account*.json`, `.npmrc`, `.pypirc`

**Temporary/Generated:**
- `.tmp/`, `tmp/`, `*.log`, `*.cache`, `__pycache__/`
- `node_modules/`, `dist/`, `build/`, `.next/`
- `*.local` (local config overrides)

**Detection command:**
```bash
git status --porcelain | grep -iE '\.(env|pem|key|secret|log|sqlite|db|local)$|credentials|secrets|token|\.tmp|node_modules|__pycache__|\.cache'
```

**If sensitive files found:**
1. **Unstage them:** `git reset HEAD <file>`
2. **Check .gitignore:** `cat .gitignore 2>/dev/null`
3. **Suggest additions:**
   ```
   .env
   .env.*
   !.env.example
   *.pem
   *.key
   *.secret
   .tmp/
   *.log
   *.local
   ```
4. **DO NOT proceed** until resolved

### Step 3: Group Changes into Chunks

Group related changes for atomic commits:

**By type:**
- Features: new files, new functions
- Fixes: modifications to existing logic
- Refactors: restructuring without behavior change
- Docs: README, comments, docs/
- Config: package.json, tsconfig, etc.
- Tests: test files with their implementations

**Commands:**
```bash
git diff --name-status
git diff --name-only | grep -E 'test|spec'
git diff --name-only | grep -E 'config|\.json$|\.yaml$'
```

### Step 4: Commit with Proper Messages

**Format (conventional commits):**
```
<type>(<scope>): <description>

[body - explain WHY not just WHAT]

[footer - breaking changes, issue refs]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting only
- `refactor`: Code restructure
- `test`: Tests
- `chore`: Maintenance, deps

**Commit flow:**
```bash
# Stage specific files
git add <files>

# Review staged
git diff --staged --stat

# Commit
git commit -m "$(cat <<'EOF'
type(scope): brief description

- Detail 1
- Detail 2
EOF
)"
```

### Step 5: Verify

```bash
# Check history
git log --oneline -5

# Verify no sensitive files
git diff HEAD~1 --name-only | grep -iE '\.env|\.pem|\.key|secret'

# Clean status
git status
```

## Commit Message Guidelines

**DO:**
- Use imperative mood ("add" not "added")
- Keep first line under 50 chars
- Capitalize first letter
- No period at end
- Explain WHY in body

**DON'T:**
- Vague messages ("update", "fix stuff")
- Past tense
- Mix unrelated changes

## Examples

**Feature:**
```
feat(auth): add JWT authentication

Implement JWT-based auth with:
- Login endpoint with token generation
- Token validation middleware
- Refresh token support
```

**Fix:**
```
fix(api): handle null values in user profile

Prevent crashes when profile fields are null.
Add null checks before accessing nested properties.
```

**Multi-file:**
```
refactor(core): restructure authentication module

- Move auth logic to service layer
- Extract validation into validators
- Update tests for new structure

BREAKING CHANGE: Auth service requires config object
```

## Safety Rules

**ALWAYS:**
- Check for sensitive files FIRST
- Suggest .gitignore updates for detected patterns
- Get confirmation before committing
- One logical change per commit

**NEVER:**
- Commit without checking for secrets
- Commit .env, node_modules, .tmp files
- Force push without confirmation
- Amend pushed commits without asking
