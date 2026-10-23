---
name: cloudflare-ecosystem
description: "Deploy and configure Cloudflare Workers, D1, KV, R2, Durable Objects, Sandbox SDK, and other edge services. Use when setting up wrangler.toml bindings, troubleshooting deployment errors, or building on the Cloudflare platform."
---

# Cloudflare Ecosystem

**Authoritative source:** https://developers.cloudflare.com/llms.txt — fetch when you need current API details or beta feature docs.

## Quick Reference

| Service | Use Case | Binding Config |
|---------|----------|----------------|
| **Workers** | Serverless edge compute | `wrangler.toml` main entry |
| **D1** | SQLite at edge | `[[d1_databases]]` |
| **R2** | S3-compatible storage | `[[r2_buckets]]` |
| **KV** | Key-value store | `[[kv_namespaces]]` |
| **Durable Objects** | Stateful compute | `[[durable_objects.bindings]]` |
| **Sandbox SDK** | Isolated code execution | `[[containers]]` + Durable Object |
| **Hyperdrive** | DB connection pooling | `[[hyperdrive]]` |
| **Queues** | Async task processing | `[[queues.producers/consumers]]` |

## Service Bindings Pattern

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
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await env.DB.prepare("SELECT * FROM users").all();
    await env.BUCKET.put("file.txt", "content");
    await env.KV.get("key");
    return new Response("OK");
  }
};
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Suggesting external services for Python | Use Sandbox SDK (native) |
| Using outdated API syntax | Check llms.txt |
| Missing service bindings | Configure in wrangler.toml |
| Not handling async | All service calls return Promises |
| Exceeding edge limits | See constraints below |
| Forgetting `destroy()` with keepAlive | Always cleanup in finally block |

## Edge Constraints

- **CPU time:** 10ms (free) / 50ms (paid) / 30s (Unbound)
- **Memory:** 128MB per isolate
- **Request size:** 100MB
- Heavy JSON parsing (>5MB) may hit CPU limits; use Durable Objects or Queues for long operations; streaming preferred for large payloads.

---

## Reference

### D1 Database

```typescript
const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();

// Batch operations
const results = await env.DB.batch([
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Alice"),
  env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Bob")
]);
```

### R2 Object Storage

```typescript
await env.BUCKET.put("path/file.txt", content, {
  httpMetadata: { contentType: "text/plain" }
});
const object = await env.BUCKET.get("path/file.txt");
const list = await env.BUCKET.list({ prefix: "path/" });
```

### Durable Objects

```typescript
export class Counter {
  constructor(private state: DurableObjectState, env: Env) {}
  async fetch(request: Request): Promise<Response> {
    let count = (await this.state.storage.get("count")) || 0;
    await this.state.storage.put("count", ++count);
    return new Response(count.toString());
  }
}

// Worker usage
const id = env.COUNTER.idFromName("my-counter");
const stub = env.COUNTER.get(id);
return stub.fetch(request);
```

```toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"
script_name = "my-worker"

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

### Sandbox SDK (Python Execution)

```typescript
import { getSandbox } from "@cloudflare/sandbox";

const sandbox = getSandbox(env.Sandbox, `request-${Date.now()}`);
await sandbox.writeFile('/tmp/script.py', code);
const result = await sandbox.exec('python /tmp/script.py');
```

```toml
[[containers]]
name = "sandbox"
image = "cloudflare/sandbox:latest"
```

Key points: Isolated Linux containers, no built-in import restrictions, 10-min inactivity timeout, requires Workers Paid plan, use `keepAlive: true` for persistent containers.

### Requirements

- Node.js 16.17+, Wrangler CLI
- Cloudflare account (some services require paid plan)
- Local Sandbox dev requires Docker Desktop

### Resources

- https://developers.cloudflare.com/llms.txt
- https://developers.cloudflare.com/workers/get-started/
- https://developers.cloudflare.com/sandbox/
- https://developers.cloudflare.com/workers/wrangler/
