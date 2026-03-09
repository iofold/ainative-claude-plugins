# Cloudflare Python Sandbox - Baseline Analysis

## Baseline Test Results

**Scenario:** Execute user-submitted Python functions in Cloudflare Workers with security constraints (import whitelist, timeout, memory limits, no network/file access).

### Agent Response (WITHOUT Skill)

**RECOMMENDATION:** Use Cloudflare Python Workers with RestrictedPython, or external services (AWS Lambda, Cloud Run).

**KEY GAPS IDENTIFIED:**

1. Did NOT mention Cloudflare Sandbox SDK
   - This is the native Cloudflare solution for running untrusted code
   - Baseline agent was completely unaware of its existence

2. Suggested external services
   - AWS Lambda
   - Google Cloud Run
   - Separate microVM service with Firecracker
   - All add complexity and latency vs native Cloudflare solution

3. Mentioned RestrictedPython
   - Not wrong, but incomplete
   - Didn't know how to combine with Cloudflare infrastructure
   - Correctly identified it doesn't handle timeouts/memory limits

4. Mentioned Pyodide/WASM
   - Mentioned but unclear on implementation
   - Concerns about bundle size and cold start
   - Didn't connect to Sandbox SDK

5. Thought Python Workers are "experimental/limited"
   - Sandbox SDK is beta but fully functional
   - Agent had outdated or incomplete knowledge

### What the Correct Answer Should Include

1. **Cloudflare Sandbox SDK exists** - Native solution for isolated code execution
2. **Two execution approaches:**
   - Command execution: `sandbox.exec('python script.py')`
   - Code interpreter: `createCodeContext()` + `runCode()`
3. **Security model:**
   - Container-level isolation (strong security boundary)
   - Each sandbox runs in isolated Linux container
   - Import restrictions must be handled at application level
4. **Resource management:**
   - 10-minute default inactivity timeout
   - `keepAlive: true` for persistent containers
   - Must explicitly call `destroy()` when using keepAlive
5. **Requirements:**
   - Workers Paid plan
   - Currently in beta
   - Docker required for local development

### Rationalizations Observed

1. **"Cloudflare doesn't support Python natively"** - Incorrect, Sandbox SDK exists
2. **"Need external services for Python execution"** - Incorrect, native solution available
3. **"Python Workers are experimental"** - Outdated, Sandbox SDK is production-ready beta
4. **"RestrictedPython is the only option"** - Incomplete, needs to be combined with Sandbox SDK

### Knowledge Gap Summary

**Primary Gap:** Complete unawareness of Cloudflare Sandbox SDK

**Secondary Gaps:**
- How to configure Sandbox SDK for Python execution
- Security model (container isolation vs Python-level restrictions)
- API methods: `getSandbox()`, `exec()`, `createCodeContext()`, `runCode()`
- Configuration options: `keepAlive`, `destroy()`
- Requirements: Paid plan, Docker for local dev

### Skill Success Criteria

After skill is present, agent should:
1. Immediately recognize Cloudflare Sandbox SDK as the solution
2. Explain container-based isolation model
3. Provide correct API usage examples
4. Note that import restrictions need application-level handling
5. Mention resource management (timeouts, keepAlive, destroy)
6. Reference Workers Paid plan requirement
7. NOT suggest external services as primary solution
