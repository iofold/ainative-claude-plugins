---
name: cloudflare-ecosystem
description: |
  This skill should be used when users ask about deploying to Cloudflare Workers, setting up D1 databases, configuring KV or R2 storage, or troubleshooting Wrangler deployments. Triggers include phrases like "deploy to Cloudflare", "set up D1 database", "configure KV storage", "wrangler dev not working", "Workers binding errors", "migrate to Cloudflare Pages", "Durable Objects setup", "edge function deployment", "cloudflare environment variables", or "wrangler.toml configuration".
---

# Cloudflare Ecosystem

## Overview

This skill provides access to current Cloudflare implementation patterns and API documentation. Use when conceptual knowledge exists but specific configuration, binding setup, or API syntax is needed.

**Authoritative source:** https://developers.cloudflare.com/llms.txt

## Quick Reference: Core Services

| Service | Use Case | Key Config |
|---------|----------|------------|
| **Workers** | Serverless compute at edge | `wrangler.toml` main entry |
| **D1** | SQLite database at edge | `[[d1_databases]]` binding |
| **R2** | S3-compatible object storage | `[[r2_buckets]]` binding |
| **KV** | Key-value store | `[[kv_namespaces]]` binding |
| **Durable Objects** | Stateful compute | `[[durable_objects.bindings]]` |
| **Sandbox SDK** | Isolated code execution | `[[containers]]` + Durable Object |
| **Hyperdrive** | Database connection pooling | `[[hyperdrive]]` binding |
| **AI Gateway** | Multi-provider AI with fallbacks | API endpoint configuration |
| **Queues** | Async task processing | `[[queues.producers]]` and `[[queues.consumers]]` |

## Implementation Patterns

### Accessing Official Documentation

When you need current API details or configuration:

1. **Reference llms.txt directly** - Most comprehensive source
2. **Look for specific service docs** at developers.cloudflare.com/{service}
3. **Check for recent updates** - Beta features and new APIs change frequently

**For this conversation:** If implementation details are needed, fetch from https://developers.cloudflare.com/llms.txt or service-specific documentation.

### Python Sandbox SDK (Common Gap)

**Problem:** Often suggest external services (AWS Lambda) instead of native solution.

**Solution:** Use Cloudflare Sandbox SDK for secure Python execution.

```typescript
import { getSandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { code, input } = await request.json();

    const sandbox = getSandbox(env.Sandbox, `request-${Date.now()}`);

    // Write and execute Python code in isolated container
    await sandbox.writeFile('/tmp/script.py', code);
    const result = await sandbox.exec('python /tmp/script.py');

    return Response.json({
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr
    });
  }
};
```

**Key points:**
- Each sandbox runs in isolated Linux container
- No built-in Python import restrictions (implement at app level)
- Default 10-minute inactivity timeout
- Requires Workers Paid plan
- Use `keepAlive: true` for persistent containers (must call `destroy()`)

**Configuration:**
```toml
# wrangler.toml
[[containers]]
name = "sandbox"
image = "cloudflare/sandbox:latest"
```

### Service Bindings Pattern

All Cloudflare services follow similar binding pattern:

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "..."

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

[[kv_namespaces]]
binding = "KV"
id = "..."
```

```typescript
// Access in Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Access bound services via env
    await env.DB.prepare("SELECT * FROM users").all();
    await env.BUCKET.put("file.txt", "content");
    await env.KV.get("key");

    return new Response("OK");
  }
};
```

### D1 Database Pattern

```typescript
// Query execution
const result = await env.DB.prepare(
  "SELECT * FROM users WHERE id = ?"
).bind(userId).first();

// Batch operations
const results = await env.DB.batch([
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Alice"),
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Bob")
]);
```

### R2 Object Storage Pattern

```typescript
// Write object
await env.BUCKET.put("path/to/file.txt", fileContent, {
  httpMetadata: { contentType: "text/plain" }
});

// Read object
const object = await env.BUCKET.get("path/to/file.txt");
const content = await object.text();

// List objects
const list = await env.BUCKET.list({ prefix: "path/" });
```

### Durable Objects Pattern

```typescript
// Export Durable Object class
export class Counter {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    let count = (await this.state.storage.get("count")) || 0;
    count++;
    await this.state.storage.put("count", count);
    return new Response(count.toString());
  }
}

// Worker that uses it
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.COUNTER.idFromName("my-counter");
    const stub = env.COUNTER.get(id);
    return stub.fetch(request);
  }
};
```

**Configuration:**
```toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"
script_name = "my-worker"

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Suggesting external services for Python | Use Sandbox SDK (native solution) |
| Using outdated API syntax | Check llms.txt for current syntax |
| Missing service bindings | Configure in wrangler.toml |
| Not handling async properly | All service calls return Promises |
| Exceeding edge compute constraints | Workers: 50ms CPU (paid), 128MB memory, 30s timeout (Unbound) |
| Forgetting to call `destroy()` with keepAlive | Always cleanup in finally block |

## Edge Constraints (Critical)

**Workers limits:**
- CPU time: 10ms (free) / 50ms (paid) / 30s (Unbound)
- Memory: 128MB per isolate
- Timeout: 30s max (Unbound workers)
- Request size: 100MB

**Design implications:**
- Heavy JSON parsing (>5MB) may hit CPU limits
- Long sequential operations need Durable Objects or Queues
- Streaming preferred for large payloads

## When to Fetch Documentation

Fetch from llms.txt or service-specific docs when:
- Unsure of current API method signatures
- Need configuration examples for wrangler.toml
- Working with beta features (Containers, new APIs)
- Integration pattern not covered here
- Error messages reference unfamiliar options

## Requirements

- **Development:** Node.js 16.17+, Wrangler CLI
- **Deployment:** Cloudflare account
- **Some services:** Paid plan required (Sandbox SDK, Durable Objects beyond free tier)
- **Local Sandbox dev:** Requires Docker Desktop

## Resources

- **Comprehensive docs:** https://developers.cloudflare.com/llms.txt
- **Getting started:** https://developers.cloudflare.com/workers/get-started/
- **Sandbox SDK:** https://developers.cloudflare.com/sandbox/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

## Real-World Architecture Example

A typical Cloudflare-native project might use:
- Workers: TypeScript orchestration, Python eval generation
- D1: SQLite for traces, evals, feedback, executions
- R2: Storage for generated Python functions
- Sandbox SDK: Secure execution of user-generated eval functions
- Pages: Next.js/SvelteKit frontend

**Key pattern:** Sandbox SDK + application-level validation for secure Python eval execution with import whitelist.
