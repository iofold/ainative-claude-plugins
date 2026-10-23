---
name: send-to-telegram
description: "Send messages, reports, or files to the user's Telegram. Use when the user asks to send something to Telegram, notify via Telegram, or share content on Telegram."
---

# Send to Telegram

Send text messages, formatted reports, or files to the user's Telegram chat via bot API.

## Configuration

Environment variables (auto-loaded from `~/.claude/settings.json`):
- `TELEGRAM_BOT_TOKEN` — Bot token
- `TELEGRAM_CHAT_ID` — User's chat ID

## Script

**Location:** `/home/ubuntu/workspace/ainative-claude-tools/telegram-messaging/scripts/send-telegram.sh`

```bash
# Send a short text message (HTML formatting)
/home/ubuntu/workspace/ainative-claude-tools/telegram-messaging/scripts/send-telegram.sh text "<b>Title</b>\nBody text here"

# Send a file/document with optional caption
/home/ubuntu/workspace/ainative-claude-tools/telegram-messaging/scripts/send-telegram.sh document /path/to/file.md "Caption text"
```

## Usage Patterns

### Short message (< 4096 chars)
Use `text` mode with HTML tags: `<b>bold</b>`, `<i>italic</i>`, `<code>monospace</code>`, `<pre>code block</pre>`, `<a href="url">link</a>`.

```bash
/home/ubuntu/workspace/ainative-claude-tools/telegram-messaging/scripts/send-telegram.sh text "<b>Task Complete</b>
Deployed v2.3.1 to production.
• 3 files changed
• All tests passing"
```

### Long report / document
Write content to a `.md` or `.txt` file first, then send as document:

```bash
# 1. Write report to temp file
cat > /tmp/report.md << 'EOF'
# My Report
...content...
EOF

# 2. Send as document
/home/ubuntu/workspace/ainative-claude-tools/telegram-messaging/scripts/send-telegram.sh document /tmp/report.md "Here's the report you requested"
```

### Supported file types
Telegram accepts: `.md`, `.txt`, `.pdf`, `.csv`, `.json`, `.html`, `.png`, `.jpg`, images, and most document formats up to 50MB.

## HTML Formatting Reference

| Format | HTML Tag |
|--------|----------|
| Bold | `<b>text</b>` |
| Italic | `<i>text</i>` |
| Code | `<code>text</code>` |
| Pre-formatted | `<pre>text</pre>` |
| Link | `<a href="url">text</a>` |
| Strikethrough | `<s>text</s>` |
| Underline | `<u>text</u>` |

## Important Notes

- Text messages are limited to 4096 characters (script auto-splits longer messages)
- Documents can be up to 50MB
- For tables/complex formatting, send as `.md` document rather than inline text
- HTML entities must be escaped in text mode: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`
