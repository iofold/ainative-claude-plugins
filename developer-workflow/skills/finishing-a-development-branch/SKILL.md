---
name: finishing-a-development-branch
description: Invoked when work is complete and ready for integration - merging, creating a PR, or cleaning up a branch. Presents structured options for merge, PR, keep, or discard.
---

# Finishing a Development Branch

**Core principle:** Verify tests -> Present options -> Execute choice -> Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

Run the project's test suite. If tests fail, stop - cannot proceed until fixed.

### Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

### Step 3: Present Options

Present exactly these 4 options (no added explanation):

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

### Step 4: Execute Choice

**Option 1 - Merge Locally:**
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>               # verify on merged result
git branch -d <feature-branch>
```

**Option 2 - Push and Create PR:**
```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

**Option 3 - Keep As-Is:** Report branch/worktree location. Don't clean up.

**Option 4 - Discard:** Show what will be deleted, require typed "discard" confirmation.
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

### Step 5: Cleanup Worktree

For Options 1, 2, 4 - check and remove worktree:
```bash
git worktree list | grep $(git branch --show-current)
git worktree remove <worktree-path>
```

For Option 3 - keep worktree.

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | Y | - | - | Y |
| 2. Create PR | - | Y | Y | - |
| 3. Keep as-is | - | - | Y | - |
| 4. Discard | - | - | - | Y (force) |

## Reference

### Red Flags

**Never:** Proceed with failing tests, merge without verifying tests on result, delete work without confirmation, force-push without explicit request.

**Always:** Verify tests before offering options, present exactly 4 options, get typed confirmation for discard, clean up worktree for Options 1 and 4 only.

### Common Mistakes

- **Skipping test verification** -> merging broken code
- **Open-ended questions** -> use the 4 structured options instead
- **Auto worktree cleanup** -> only for Options 1 and 4
- **No discard confirmation** -> require typed "discard"

### Integration

**Called by:** subagent-driven-development (Step 7), executing-plans (Step 5)
**Pairs with:** using-git-worktrees (cleans up worktree created by that skill)
