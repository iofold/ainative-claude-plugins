---
name: env-management
description: "Manage environment variables and secrets safely. Use when needing to check, inject, or configure .env files. Covers vault (secret storage/injection), env-safe (read-only inspection), and project key mappings."
---

# Environment Variable & Secrets Management

Direct .env file access is blocked by safety hooks. Use these tools instead.

## Quick Reference

| Task | Command |
|------|---------|
| List .env keys | `env-safe list` |
| Check if key exists | `env-safe check KEY_NAME` |
| Check key status (set/empty) | `env-safe list --status` |
| Validate .env syntax | `env-safe validate` |
| List vault secrets | `vault keys` |
| Inject secrets into .env | `vault inject KEY1 KEY2` |
| Inject with name mapping | `vault inject VAULT_KEY=ENV_KEY` |
| Inject all project mappings | `vault inject --mapped` |
| Show project mappings | `vault maps` |

## Vault: Centralized Secrets Store

The vault stores named secrets centrally (`~/Git/dotenvs/`) encrypted with Fernet. Secrets are added by the user, then injected into project `.env` files by agents or scripts.

### Storing secrets (user action)

```bash
vault set OPENAI_API_KEY "sk-..."
vault set GEMINI_API_KEY "AIza..."
vault keys              # list all stored keys
vault get KEY_NAME      # retrieve a value
vault rm KEY_NAME       # remove a key
```

### Injecting secrets into .env (agent-safe)

```bash
# Inject specific keys (same name in vault and .env)
vault inject OPENAI_API_KEY GEMINI_API_KEY

# Inject with name mapping (VAULT_KEY=LOCAL_ENV_NAME)
# Use when the vault key name differs from what the project expects
vault inject OPENAI_KEY_PROJECT_A=OPENAI_API_KEY

# Inject all keys mapped for this project
vault inject --mapped

# Mix: explicit keys + all project mappings
vault inject EXTRA_KEY --mapped
```

### Project key mappings

When the same secret has different names across projects (e.g., `OPENAI_KEY_PERSONAL` in vault but `OPENAI_API_KEY` in .env), set up persistent mappings:

```bash
# Map: vault key → local .env name (for current project)
vault map OPENAI_KEY_PERSONAL OPENAI_API_KEY
vault map GEMINI_KEY_SHARED GEMINI_API_KEY

# View mappings for current project
vault maps

# Remove a mapping
vault unmap OPENAI_API_KEY

# Map for a different project
vault map OPENAI_KEY_WORK OPENAI_API_KEY --project other-project
```

Then `vault inject --mapped` injects all mapped keys using the correct names.

## env-safe: Read-Only .env Inspection

Use `env-safe` to inspect `.env` files without exposing secret values:

```bash
env-safe list            # list all variable names
env-safe list --status   # show which are set vs empty
env-safe check KEY_NAME  # check if a specific key exists
env-safe count           # count variables
env-safe validate        # check .env syntax
```

## Setting Up a New Project

When a project needs environment variables:

1. **Check what's available:** `vault keys`
2. **Check what's needed:** read the project docs or check for `.env.example`
3. **Set up mappings** if vault key names differ from project names:
   ```bash
   vault map VAULT_KEY_NAME LOCAL_ENV_NAME
   ```
4. **Inject:** `vault inject --mapped` or `vault inject KEY1 KEY2`
5. **Verify:** `env-safe list --status`

## How It Works

- **Vault storage:** `~/Git/dotenvs/secrets.enc` (Fernet-encrypted)
- **Vault key:** `~/Git/dotenvs/.vault-key` (auto-generated, mode 600)
- **Project maps:** `~/Git/dotenvs/maps/{project-name}.map`
- **Safety hook:** blocks direct .env access (cat, grep, echo >, etc.)
- **Whitelisted:** `vault` and `env-safe` commands pass through the hook

## What's Blocked

The safety hook prevents: `cat .env`, `grep .env`, `echo > .env`, `sed -i .env`, `cp .env`, and similar direct access patterns. Always use `vault inject` to write and `env-safe` to read.
