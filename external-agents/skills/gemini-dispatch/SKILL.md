---
name: gemini-dispatch
description: Dispatch tasks to Google Gemini CLI in isolated worktrees. Triggers on "gemini agent", "parallel gemini", "gemini worktree", "dispatch to gemini", "run this with gemini", "use google for this", "gemini cli", "give this task to gemini". Gemini excels at multimodal (images/video), 1M+ token context, and Google Search grounding.
---

# Gemini CLI Task Dispatch

Dispatch independent tasks to Google's Gemini CLI running in isolated git worktrees. Gemini excels at multimodal input (images, video), 1M+ token context windows, and Google Search grounding for up-to-date information.

**Use Gemini when:** task involves images/video/multimodal input, benefits from 1M+ context, needs Google Search grounding, you want a diverse model perspective, or involves analyzing large codebases.

**Use Claude subagents when:** task needs current conversation context, is tightly coupled to ongoing work, is quick (<30s), or needs Claude-specific MCP tools.

## Essential Workflow

### 1. Conflict check — verify file independence

Before dispatching, confirm no other agent is modifying the same files, dev servers, or shared state. Each task gets its own branch.

### 2. Create worktree

```bash
TASK_ID=$(date +%s)-gemini-$(echo "$TASK_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | head -c 30)
WORKTREE=/tmp/agent-tasks/$TASK_ID
git worktree add $WORKTREE -b agent/gemini/$TASK_ID
```

### 3. Write prompt file

Never pass complex prompts inline. Write to the worktree for shell-safety and audit trail. Gemini supports `@./path` file references inside prompts, resolved relative to the working directory.

```bash
cat > $WORKTREE/.gemini-prompt.md << 'PROMPT'
# Task: [TITLE]
## Objective
[What to accomplish]
## Files to Modify
- @./path/to/file — [what to change]
## Files to NOT Modify
- @./path/to/other — owned by another agent
## Constraints
- Follow existing code patterns
- Run tests after changes
## Acceptance Criteria
- [ ] [Criterion]
- [ ] All existing tests pass
PROMPT
```

Optionally write `.gemini/GEMINI.md` in the worktree for persistent project context Gemini reads automatically.

### 4. Dispatch

**CRITICAL: Always use `--approval-mode yolo` (or `-y`). Without it, Gemini WILL HANG waiting for tool call confirmation.**

**Recommended** — JSON output with sandbox:

```bash
cd $WORKTREE && \
gemini \
  -p "$(cat .gemini-prompt.md)" \
  --approval-mode yolo \
  --sandbox \
  --output-format json \
  --extensions none \
  > $WORKTREE/.gemini-result.json \
  2> $WORKTREE/.gemini-log.txt &
GEMINI_PID=$!
```

**Without sandbox** (faster, for read/write-only tasks):

```bash
cd $WORKTREE && \
gemini \
  -p "$(cat .gemini-prompt.md)" \
  --approval-mode yolo \
  --output-format json \
  --extensions none \
  > $WORKTREE/.gemini-result.json \
  2> $WORKTREE/.gemini-log.txt &
```

### 5. Retrieve results — git diff is ground truth

Gemini does not auto-commit. Its JSON output only has aggregate line counts, NOT which files changed. Always check `git diff`.

```bash
cd $WORKTREE
git diff --name-status   # which files changed
git diff --stat          # insertions/deletions per file
jq -r '.response' .gemini-result.json  # agent's self-assessment
jq -r '.error' .gemini-result.json     # null = success
```

### 6. Merge and cleanup

```bash
# From main repo
git merge agent/gemini/$TASK_ID --no-ff -m "Merge gemini task: $TASK_NAME"
# Or: git push origin agent/gemini/$TASK_ID && gh pr create ...

# Cleanup
git worktree remove $WORKTREE --force
git branch -d agent/gemini/$TASK_ID
```

## Key Rules

- **--approval-mode yolo is mandatory** — without it, Gemini hangs in non-interactive mode (#1 issue)
- **File independence** — no two agents touch the same files
- **Git diff is ground truth** — Gemini's JSON only has aggregate stats, not per-file changes
- **cd to worktree before running** — Gemini uses cwd as workspace context
- **Always use -p flag** — without it, Gemini enters interactive mode
- **Always use --extensions none** — reduces startup time and interference
- **Default model** — do NOT pass `-m` unless the user explicitly requests a specific model

---

## Reference

### Stream JSON output (file-level event tracking)

Use `stream-json` when you need to know exactly which files were touched and which commands ran:

```bash
cd $WORKTREE && \
gemini \
  -p "$(cat .gemini-prompt.md)" \
  --approval-mode yolo \
  --sandbox \
  --output-format stream-json \
  --extensions none \
  > $WORKTREE/.gemini-events.jsonl \
  2> $WORKTREE/.gemini-log.txt &
```

Event types: `tool_call`, `tool_result`, `content`, `finished`, `error`.

### Parsing stream-json events

```bash
# Files written/modified
jq -r 'select(.type=="tool_call") | select(.toolName=="write_file" or .toolName=="replace") | .args.path' $WORKTREE/.gemini-events.jsonl

# Commands run
jq -r 'select(.type=="tool_call") | select(.toolName=="run_shell_command") | .args.command' $WORKTREE/.gemini-events.jsonl

# Agent's final text
jq -r 'select(.type=="content") | .chunk' $WORKTREE/.gemini-events.jsonl | tr -d '\n'
```

### Parsing JSON result

```bash
jq -r '.response' $WORKTREE/.gemini-result.json           # agent response
jq '.stats' $WORKTREE/.gemini-result.json                  # aggregate stats
jq '.stats.tools.byName' $WORKTREE/.gemini-result.json     # tool usage breakdown
jq '{added: .stats.files.totalLinesAdded, removed: .stats.files.totalLinesRemoved}' $WORKTREE/.gemini-result.json
```

### Gemini-specific strengths

```bash
# Multimodal: images, video, screenshots
gemini -p "Compare @./design-mock.png with @./screenshot.png and list differences" \
  --approval-mode yolo --output-format json

# Google Search grounding: up-to-date information
gemini -p "Find latest Next.js 15 best practices and update our routing" \
  --approval-mode yolo --sandbox --output-format json

# Large context (up to 1M tokens): analyze entire codebases
gemini -p "Analyze @./src/ and create a dependency graph" \
  --approval-mode yolo --output-format json
```

### Docker isolation (full environment control)

Use when Gemini's built-in sandbox isn't sufficient (specific system packages, custom network config).

```bash
BASE_PORT=$((10000 + RANDOM % 50000))
docker run --rm -d \
  --name gemini-$TASK_ID \
  -v $WORKTREE:/workspace -w /workspace \
  -p $BASE_PORT:3000 -p $((BASE_PORT+1)):5173 \
  -e GEMINI_API_KEY=${GEMINI_API_KEY} \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges --memory 4g --cpus 2 --pids-limit 200 \
  node:20-bookworm \
  bash -c "
    npm install -g @google/gemini-cli && \
    git config --global --add safe.directory /workspace && \
    gemini -p \"\$(cat /workspace/.gemini-prompt.md)\" \
      --approval-mode yolo --extensions none --output-format json \
      > /workspace/.gemini-result.json 2>&1 | tee /workspace/.gemini-log.txt
  "
```

### Custom sandbox image

For projects needing specific dependencies, create `.gemini/sandbox.Dockerfile` (extends `gemini-cli-sandbox`), then build with `BUILD_SANDBOX=1 gemini -s -p "..."`.

### Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `GEMINI_API_KEY` | API authentication | Yes (if not using OAuth) |
| `GOOGLE_API_KEY` | Alternative API key | Optional |
| `GEMINI_MODEL` | Default model override | Optional |
| `GEMINI_SANDBOX` | Force sandbox mode (`true`, `docker`, `podman`) | Optional |
| `GOOGLE_CLOUD_PROJECT` | Vertex AI project ID | For Vertex AI |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON path | For Vertex AI |

**Setup:** Set in `~/.claude/settings.json` under `env`, or inject from vault:
```bash
vault inject GEMINI_API_KEY GOOGLE_APPLICATION_CREDENTIALS
```

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Gemini hangs | Missing `--approval-mode yolo` | Add `-y` or `--approval-mode yolo` |
| Interactive mode | Missing `-p` flag | Always use `-p "prompt"` |
| Slow startup | Extensions loading | Add `--extensions none` |
| Sandbox reads host files | By design — sandbox only isolates writes/shell | Use Docker for full isolation |
| Rate limits | Free tier: 60 req/min, 1000/day | Use Vertex AI for production |
| Wrong workspace | Didn't cd to worktree | Always `cd $WORKTREE` before running |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 41 | Authentication error |
| 42 | Input error |
| 52 | Configuration error |
| 130 | User cancellation |
