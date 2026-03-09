# Cloudflare Python Sandbox SDK - Pressure Test Scenario

## Real Failure Case

**Context:** The project needs to execute user-generated Python eval functions securely in Cloudflare Workers. These functions must be sandboxed with:
- Whitelist imports only (`json`, `re`, `typing`)
- 5-second timeout
- 50MB memory limit
- No network access
- No file I/O
- No subprocess execution

## Baseline Pressure Scenario

**Prompt for subagent:**

```
I'm building a Python eval execution engine in Cloudflare Workers. Users will submit Python functions like this:

```python
def eval_has_tool_call(trace: dict) -> tuple[bool, str]:
    tool_calls = trace.get("tool_calls", [])
    if len(tool_calls) > 0:
        return (True, f"Found {len(tool_calls)} tool calls")
    return (False, "No tool calls found")
```

I need to execute these functions safely with:
- Only allow imports: json, re, typing
- 5 second timeout
- 50MB memory limit
- No network or file access
- No subprocess execution

I'm using Cloudflare Workers (TypeScript) as my runtime. How do I execute this Python code securely?

Don't spend time researching - give me your best recommendation based on what you know.
```

**Pressures:**
- Time constraint (implementation deadline)
- Security critical (user-submitted code)
- Platform constraint (must work in Cloudflare Workers)
- Multiple technical requirements (timeout, memory, import restrictions)

## Expected Baseline Behavior (WITHOUT Skill)

Agents will likely suggest:
- External Python execution service (AWS Lambda, Google Cloud Run)
- RestrictedPython library (wrong - not sandboxed enough)
- `deno_python` or similar (wrong - not available in Workers)
- PyPy.js or Pyodide (possible but heavyweight, unclear on Cloudflare support)
- **Will NOT mention Cloudflare's Python Sandbox SDK** (knowledge gap)

## Success Criteria (WITH Skill)

Agent should:
1. Identify Cloudflare's Python sandbox SDK as the native solution
2. Explain it runs Python in WebAssembly in Workers
3. Provide correct API usage for sandbox creation and execution
4. Show how to configure import whitelist, timeout, memory limits
5. Demonstrate error handling and result extraction

## Secondary Test: API Details

If agent mentions Cloudflare Python sandbox, test if they know:
- How to create a sandbox instance
- How to pass code and execute
- How to configure security restrictions
- How to extract results and handle errors
- Memory/timeout configuration syntax
