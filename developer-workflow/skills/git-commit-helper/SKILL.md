---
name: git-commit-helper
description: Invoked when committing changes, writing commit messages, or reviewing staged changes. Generates safe, chunked commits with sensitive file protection.
---

# Git Commit Helper

Safe, chunked commits with best practices and sensitive file protection.

## Workflow

### Step 1: Analyze Current State

```bash
git status --porcelain
git diff --staged --stat
git diff --stat
```

### Step 2: Detect Sensitive Files (CRITICAL)

**Before ANY commit**, scan for files that must never be committed:

```bash
git status --porcelain | grep -iE '\.(env|pem|key|secret|log|sqlite|db|local)$|credentials|secrets|token|\.tmp|node_modules|__pycache__|\.cache'
```

**If found:** Unstage (`git reset HEAD <file>`), update `.gitignore`, do NOT proceed until resolved.

### Step 3: Group Changes into Chunks

Group related changes for atomic commits by type: features, fixes, refactors, docs, config, tests.

```bash
git diff --name-status
```

### Step 4: Commit with Proper Messages

**Format (conventional commits):**
```
<type>(<scope>): <description>

[body - explain WHY not just WHAT]

[footer - breaking changes, issue refs]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```bash
git add <files>
git diff --staged --stat
git commit -m "$(cat <<'EOF'
type(scope): brief description

- Detail 1
- Detail 2
EOF
)"
```

### Step 5: Verify

```bash
git log --oneline -5
git diff HEAD~1 --name-only | grep -iE '\.env|\.pem|\.key|secret'
git status
```

## Reference

### Sensitive File Patterns

**Secrets:** `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.secret`, `credentials.json`, `secrets.json`, `secrets.yaml`, `token.json`, `service-account*.json`, `.npmrc`, `.pypirc`

**Temporary/Generated:** `.tmp/`, `tmp/`, `*.log`, `*.cache`, `__pycache__/`, `node_modules/`, `dist/`, `build/`, `.next/`, `*.local`

### Commit Message Guidelines

- Imperative mood ("add" not "added"), first line under 50 chars
- Capitalize first letter, no period at end
- Explain WHY in body
- Avoid vague messages ("update", "fix stuff"), past tense, mixing unrelated changes

### Examples

```
feat(auth): add JWT authentication

Implement JWT-based auth with login endpoint,
token validation middleware, and refresh tokens.
```

```
fix(api): handle null values in user profile

Prevent crashes when profile fields are null.
```

```
refactor(core): restructure authentication module

BREAKING CHANGE: Auth service requires config object
```

### Safety Rules

**ALWAYS:** Check for sensitive files first, suggest .gitignore updates, get confirmation, one logical change per commit.

**NEVER:** Commit without checking for secrets, commit .env/node_modules/.tmp, force push without confirmation, amend pushed commits without asking.
