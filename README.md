# ainative-claude-tools

AI-native development tools for Claude Code -- a curated marketplace of plugins for modern software engineering workflows.

## Plugins

| Plugin | Description |
|--------|-------------|
| **developer-workflow** | Git workflow automation, PR management, and development lifecycle tools |
| **project-planning** | Project scaffolding, task breakdown, and milestone tracking |
| **agent-orchestration** | Multi-agent coordination, sub-agent spawning, and parallel task execution |
| **code-quality** | Linting, testing, code review, and static analysis integrations |
| **ai-development** | AI model gateway, prompt engineering, and LLM-assisted development tools |
| **cloudflare-tools** | Cloudflare Workers, Pages, D1, and KV management from Claude Code |
| **safety-hooks** | Pre/post-execution safety checks, command validation, and guardrails |
| **session-management** | Session persistence, context recovery, and progress logging |
| **frontend-design** | UI component generation, design system integration, and browser preview |
| **video-tools** | Video processing, transcription, and media manipulation via ffmpeg |
| **google-workspace** | Google Docs, Sheets, Drive, and Calendar integration |

## Quick Start

```bash
git clone https://github.com/ainative/ainative-claude-tools.git
cd ainative-claude-tools
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install system dependencies (Python 3.11+, Node.js, Bun, tmux, jq, ffmpeg, gpg)
- Install Python CLI tools via `uv` (tmux-cli, aichat, vault, env-safe)
- Optionally install Rust tools and Playwright browsers
- Register the marketplace with Claude Code

Use `--skip-optional` to skip non-essential components:

```bash
./setup.sh --skip-optional
```

## Per-Plugin Installation

Each plugin can be installed individually. Navigate to the plugin directory and follow its README:

```bash
cd developer-workflow
cat README.md
```

Plugins are self-contained -- each includes its own `plugin.json` manifest, skills, hooks, and MCP server definitions as needed.

## Plugin Structure

Each plugin follows the Claude Code plugin standard:

```
plugin-name/
  plugin.json       # Plugin manifest (skills, hooks, MCP servers)
  skills/           # Skill definitions and implementations
  hooks/            # Pre/post execution hooks
  servers/          # MCP server configurations
  .env.example      # Required environment variables
  README.md         # Plugin-specific documentation
```

## Configuration

Many plugins require API keys or credentials. After installation:

1. Copy `.env.example` to `.env` in each plugin that needs configuration
2. Fill in the required values (API keys, OAuth tokens, etc.)
3. Never commit `.env` files -- they are gitignored

Common configuration:

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | ai-development | OpenAI API access |
| `ANTHROPIC_API_KEY` | ai-development | Anthropic API access |
| `CLOUDFLARE_API_TOKEN` | cloudflare-tools | Cloudflare account access |
| `GOOGLE_CLIENT_ID` | google-workspace | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | google-workspace | Google OAuth secret |

## Contributing

Contributions are welcome. To add a new plugin:

1. Fork this repository
2. Create a new directory for your plugin at the repository root
3. Include a `plugin.json` manifest following the Claude Code plugin specification
4. Add a `README.md` with setup instructions and usage examples
5. Update `marketplace.json` to include your plugin in the plugins array
6. Submit a pull request with a clear description of what the plugin does

Guidelines:
- Plugins must be self-contained with no cross-plugin dependencies
- Include `.env.example` if your plugin requires configuration
- Write clear skill descriptions so Claude Code can discover and use them
- Test your plugin with `claude plugins validate` before submitting

## License

MIT License. See [LICENSE](./LICENSE) for details.
