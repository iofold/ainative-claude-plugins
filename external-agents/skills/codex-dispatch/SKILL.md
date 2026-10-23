---
name: codex-dispatch
description: Dispatch coding tasks to OpenAI Codex CLI in isolated worktrees. Triggers on "codex agent", "parallel codex", "codex worktree", "dispatch to codex", "run this with codex", "use openai for this", "codex exec", "codex review", "give this task to codex".
---

# Codex CLI Task Dispatch

Dispatch independent coding tasks to OpenAI's Codex CLI running in isolated git worktrees. Codex has its own tool loop and excels at autonomous code generation.

**Use Codex when:** task benefits from OpenAI models, you want a diverse model perspective, task involves long-running autonomous coding, you need structured JSON output, or code review via `codex review`.

**Use Claude subagents when:** task needs current conversation context, is tightly coupled to ongoing work, is quick (<30s), or needs MCP tools.

## Essential Workflow

### 1. Conflict check — verify file independence

Before dispatching, confirm no other agent is modifying the same files, dev servers, or shared state (DB files, lock files). Each task gets its own branch.

### 2. Create worktree

```bash
TASK_ID=$(date +%s)-codex-$(echo "$TASK_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | head -c 30)
WORKTREE=/tmp/agent-tasks/$TASK_ID
git worktree add $WORKTREE -b agent/codex/$TASK_ID
```

### 3. Write prompt file

Never pass complex prompts inline. Write to the worktree for shell-safety and audit trail.

```bash
cat > $WORKTREE/.codex-prompt.md << 'PROMPT'
# Task: [TITLE]
## Objective
[What to accomplish]
## Files to Modify
- path/to/file — [what to change]
## Files to NOT Modify
- path/to/other — owned by another agent
## Constraints
- Follow existing code patterns
- Run tests after changes
## Acceptance Criteria
- [ ] [Criterion]
- [ ] All existing tests pass
PROMPT
```

Optionally write `.codex/instructions.md` in the worktree for persistent project context Codex reads automatically.

### 4. Dispatch

**Recommended** — captures JSONL events + final message:

```bash
codex exec \
  --full-auto \
  --json \
  -C $WORKTREE \
  --ephemeral \
  -o $WORKTREE/.codex-result.txt \
  - < $WORKTREE/.codex-prompt.md \
  > $WORKTREE/.codex-events.jsonl \
  2> $WORKTREE/.codex-stderr.txt &
CODEX_PID=$!
```

**Simple** — final message only (no event stream):

```bash
codex exec --full-auto -C $WORKTREE --ephemeral \
  -o $WORKTREE/.codex-result.txt \
  - < $WORKTREE/.codex-prompt.md \
  2>&1 | tee $WORKTREE/.codex-log.txt &
```

### 5. Retrieve results — git diff is ground truth

Codex does not auto-commit. Always check `git diff` in the worktree — the agent's self-report may be incomplete.

```bash
cd $WORKTREE
git diff --name-status   # which files changed
git diff --stat          # insertions/deletions per file
cat .codex-result.txt    # agent's self-assessment
```

### 6. Merge and cleanup

```bash
# From main repo
git merge agent/codex/$TASK_ID --no-ff -m "Merge codex task: $TASK_NAME"
# Or: git push origin agent/codex/$TASK_ID && gh pr create ...

# Cleanup
git worktree remove $WORKTREE --force
git branch -d agent/codex/$TASK_ID
```

## Key Rules

- **File independence** — no two agents touch the same files
- **Git diff is ground truth** — the agent's response is its *claim*; verify against actual changes
- **Always use --full-auto** — without it, Codex hangs waiting for approvals
- **Always use -C $WORKTREE** — otherwise Codex runs in the wrong directory
- **Always use --ephemeral** — avoids filling disk with session data
- **Default model** — do NOT pass `-m` unless the user explicitly requests a specific model

---

## Reference

### Structured output with schema validation

```bash
cat > $WORKTREE/.output-schema.json << 'SCHEMA'
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "files_changed": { "type": "array", "items": { "type": "string" } },
    "tests_passed": { "type": "boolean" }
  },
  "required": ["summary", "files_changed"]
}
SCHEMA

codex exec --full-auto -C $WORKTREE \
  --output-schema $WORKTREE/.output-schema.json \
  -o $WORKTREE/.codex-result.json \
  - < $WORKTREE/.codex-prompt.md &
```

### Docker isolation (for dev servers, port conflicts)

```bash
BASE_PORT=$((10000 + RANDOM % 50000))
docker run --rm -d \
  --name codex-$TASK_ID \
  -v $WORKTREE:/workspace -w /workspace \
  -p $BASE_PORT:3000 -p $((BASE_PORT+1)):5173 \
  -e CODEX_API_KEY=${CODEX_API_KEY:-$OPENAI_API_KEY} \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges --memory 4g --cpus 2 --pids-limit 200 \
  node:20-bookworm \
  bash -c "
    npm install -g @openai/codex && \
    git config --global --add safe.directory /workspace && \
    codex exec --full-auto -o /workspace/.codex-result.txt \
      - < /workspace/.codex-prompt.md 2>&1 | tee /workspace/.codex-log.txt
  "
```

### Parsing JSONL events

```bash
# Files changed
jq -r 'select(.type=="item.completed") | select(.item.type=="file_change") | .item.changes[] | "\(.kind)\t\(.path)"' $WORKTREE/.codex-events.jsonl

# Commands run and exit codes
jq -r 'select(.type=="item.completed") | select(.item.type=="command_execution") | "\(.item.exit_code)\t\(.item.command)"' $WORKTREE/.codex-events.jsonl

# Failed commands only
jq -r 'select(.type=="item.completed") | select(.item.type=="command_execution") | select(.item.status=="failed") | .item.command' $WORKTREE/.codex-events.jsonl

# Token usage
jq -r 'select(.type=="turn.completed") | .usage' $WORKTREE/.codex-events.jsonl
```

### Comprehensive result collection

```bash
cd $WORKTREE
jq -n \
  --argjson exit_code "${CODEX_EXIT_CODE:-$?}" \
  --argjson has_changes "$([ -n "$(git status --porcelain)" ] && echo true || echo false)" \
  --arg agent_response "$(cat .codex-result.txt 2>/dev/null || echo 'No response')" \
  --arg git_diff_stat "$(git diff --stat 2>/dev/null)" \
  --arg git_name_status "$(git diff --name-status 2>/dev/null)" \
  --arg untracked "$(git ls-files --others --exclude-standard 2>/dev/null)" \
  --arg failed_commands "$(jq -r 'select(.type=="item.completed") | select(.item.type=="command_execution") | select(.item.status=="failed") | .item.command' .codex-events.jsonl 2>/dev/null)" \
  '{exit_code: $exit_code, has_changes: $has_changes, agent_response: $agent_response,
    git_diff_stat: $git_diff_stat, git_name_status: $git_name_status,
    untracked_files: ($untracked | split("\n") | map(select(length > 0))),
    failed_commands: ($failed_commands | split("\n") | map(select(length > 0)))}'
```

### Code review mode

```bash
codex review --uncommitted              # review uncommitted changes
codex review --base main                # review against a branch
codex review --commit abc123            # review a specific commit
codex review "Focus on security issues" # custom review instructions
```

### Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CODEX_API_KEY` | API authentication (CI/automation) | Yes (if not logged in) |
| `OPENAI_API_KEY` | Fallback API key | Optional |

**Setup:** Set in `~/.claude/settings.json` under `env`, or inject from vault:
```bash
vault inject OPENAI_API_KEY
```

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Codex hangs | Missing `--full-auto` | Add `--full-auto` flag |
| Wrong directory | Missing `-C` flag | Add `-C $WORKTREE` |
| Git lock errors | Shared .git directory | Use worktrees for isolation |
| Large repo slowness | Codex reads full repo context | Use `--add-dir` to scope to subdirectories |
| Disk filling up | Session data accumulation | Use `--ephemeral` |
| Docker auth failure | Missing API key in container | Pass `-e CODEX_API_KEY=...` |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| Non-zero | Task submission failed or agent error |
