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
| **apify-cloud** | Apify Actor workflows for capped web, social, SEO/GEO, SERP, and GTM research |
| **cloudflare-tools** | Cloudflare Workers, Pages, D1, and KV management from Claude Code |
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
  README.md         # Plugin-specific documentation
```

## Configuration

Many plugins require API keys or credentials. Set environment variables in `~/.claude/settings.json` under the `env` key:

```json
{
  "env": {
    "OPENAI_API_KEY": "sk-your-key",
    "ANTHROPIC_API_KEY": "your-key",
    "GEMINI_API_KEY": "your-key",
    "CLOUDFLARE_API_TOKEN": "your-token"
  }
}
```

Common configuration:

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | ai-development | OpenAI API access |
| `ANTHROPIC_API_KEY` | ai-development | Anthropic API access |
| `APIFY_API_TOKEN` or `APIFY_TOKEN` | apify-cloud | Apify Actor API access |
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
- Document required environment variables in your plugin's README
- Write clear skill descriptions so Claude Code can discover and use them
- Test your plugin with `claude plugins validate` before submitting

## License

MIT License. See [LICENSE](./LICENSE) for details.
