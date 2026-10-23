#!/usr/bin/env python3
"""
Hook to protect .env files from being read or searched.
Blocks commands that would expose .env contents and suggests safer alternatives.
"""
import re

def check_env_file_access(command):
    """
    Check if a command attempts to read, write, or edit .env files.
    Returns tuple: (should_block: bool, reason: str or None)
    """
    # Normalize the command
    normalized_cmd = ' '.join(command.strip().split())

    # Whitelist: vault and env-safe commands are allowed to interact with .env
    if normalized_cmd.startswith(("vault ", "env-safe ")):
        return False, None

    # Patterns that indicate reading, writing, or editing .env files
    env_patterns = [
        # Direct file reading
        r'\bcat\s+.*\.env\b',
        r'\bless\s+.*\.env\b',
        r'\bmore\s+.*\.env\b',
        r'\bhead\s+.*\.env\b',
        r'\btail\s+.*\.env\b',

        # Editors - both reading and writing
        r'\bnano\s+.*\.env\b',
        r'\bvi\s+.*\.env\b',
        r'\bvim\s+.*\.env\b',
        r'\bemacs\s+.*\.env\b',
        r'\bcode\s+.*\.env\b',
        r'\bsubl\s+.*\.env\b',
        r'\batom\s+.*\.env\b',
        r'\bgedit\s+.*\.env\b',

        # Writing/modifying .env files
        r'>\s*\.env\b',  # Redirect to .env
        r'>>\s*\.env\b',  # Append to .env
        r'\becho\s+.*>\s*\.env\b',
        r'\becho\s+.*>>\s*\.env\b',
        r'\bprintf\s+.*>\s*\.env\b',
        r'\bprintf\s+.*>>\s*\.env\b',
        r'\bsed\s+.*-i.*\.env\b',  # sed in-place editing
        r'\bawk\s+.*>\s*\.env\b',
        r'\btee\s+.*\.env\b',
        r'\bcp\s+.*\.env\b',  # Copying to .env
        r'\bmv\s+.*\.env\b',  # Moving to .env
        r'\btouch\s+.*\.env\b',  # Creating .env

        # Searching/grepping .env files
        r'\bgrep\s+.*\.env\b',
        r'\bgrep\s+.*\s+\.env\b',
        r'\brg\s+.*\.env\b',
        r'\brg\s+.*\s+\.env\b',
        r'\bag\s+.*\.env\b',
        r'\back\s+.*\.env\b',
        r'\bfind\s+.*-name\s+["\']?\.env',

        # Other ways to expose .env contents
        r'\becho\s+.*\$\(.*cat\s+.*\.env.*\)',
        r'\bprintf\s+.*\$\(.*cat\s+.*\.env.*\)',

        # Also check for patterns without the dot (like "env" file)
        r'\bcat\s+["\']?env["\']?\s*$',
        r'\bcat\s+["\']?env["\']?\s*[;&|]',
        r'\bless\s+["\']?env["\']?\s*$',
        r'\bless\s+["\']?env["\']?\s*[;&|]',
        r'>\s*["\']?env["\']?\s*$',
        r'>>\s*["\']?env["\']?\s*$',
    ]

    # Check if any pattern matches
    for pattern in env_patterns:
        if re.search(pattern, normalized_cmd, re.IGNORECASE):
            reason_text = (
                "Blocked: Direct access to .env files is not allowed for security reasons.\n\n"
                "- Reading .env files could expose sensitive values\n"
                "- Writing/editing .env files should be done manually outside Claude Code\n\n"
                "For safe inspection, use the `env-safe` command:\n"
                "  - `env-safe list` - List all environment variable keys\n"
                "  - `env-safe list --status` - Show keys with defined/empty status\n"
                "  - `env-safe check KEY_NAME` - Check if a specific key exists\n"
                "  - `env-safe count` - Count variables in the file\n"
                "  - `env-safe validate` - Check .env file syntax\n\n"
                "To inject secrets from the vault into .env:\n"
                "  - `vault inject KEY1 KEY2` - Inject specific keys\n"
                "  - `vault inject VAULT_KEY=ENV_KEY` - Inject with name mapping\n"
                "  - `vault inject --mapped` - Inject all project-mapped keys\n"
                "  - `vault keys` - List available secrets in the vault"
            )
            return True, reason_text

    return False, None


# If run as a standalone script
if __name__ == "__main__":
    import json
    import sys

    data = json.load(sys.stdin)

    # Check if this is a Bash tool call
    tool_name = data.get("tool_name")
    if tool_name != "Bash":
        print(json.dumps({"decision": "approve"}))
        sys.exit(0)

    # Get the command being executed
    command = data.get("tool_input", {}).get("command", "")

    should_block, reason = check_env_file_access(command)

    if should_block:
        print(json.dumps({
            "decision": "block",
            "reason": reason
        }, ensure_ascii=False))
    else:
        print(json.dumps({"decision": "approve"}))

    sys.exit(0)
