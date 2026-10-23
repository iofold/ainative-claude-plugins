#!/usr/bin/env bash
# send-telegram.sh — Send text or document to Telegram
# Usage:
#   send-telegram.sh text "message"                    # Send text message (HTML parse mode)
#   send-telegram.sh markdown "message"                # Send with MarkdownV2 parse mode
#   send-telegram.sh document /path/to/file "caption"  # Send file as document
#
# Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (from ~/.claude/settings.json)

set -euo pipefail

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN not set}"
CHAT_ID="${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID not set}"
API="https://api.telegram.org/bot${BOT_TOKEN}"

mode="${1:?Usage: send-telegram.sh <text|markdown|document> <message|filepath> [caption]}"
shift

case "$mode" in
  text)
    message="${1:?No message provided}"
    # Telegram text limit is 4096 chars; split if needed
    if [ ${#message} -le 4096 ]; then
      curl -s -X POST "${API}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg chat_id "$CHAT_ID" --arg text "$message" \
          '{chat_id: $chat_id, text: $text, parse_mode: "HTML"}')"
    else
      # Split into chunks
      echo "$message" | fold -w 4000 -s | while IFS= read -r chunk; do
        curl -s -X POST "${API}/sendMessage" \
          -H "Content-Type: application/json" \
          -d "$(jq -n --arg chat_id "$CHAT_ID" --arg text "$chunk" \
            '{chat_id: $chat_id, text: $text, parse_mode: "HTML"}')" > /dev/null
        sleep 0.5
      done
    fi
    ;;

  markdown)
    message="${1:?No message provided}"
    curl -s -X POST "${API}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg chat_id "$CHAT_ID" --arg text "$message" \
        '{chat_id: $chat_id, text: $text, parse_mode: "MarkdownV2"}')"
    ;;

  document)
    filepath="${1:?No file path provided}"
    caption="${2:-}"
    if [ ! -f "$filepath" ]; then
      echo "Error: File not found: $filepath" >&2
      exit 1
    fi
    if [ -n "$caption" ]; then
      curl -s -X POST "${API}/sendDocument" \
        -F "chat_id=${CHAT_ID}" \
        -F "document=@${filepath}" \
        -F "caption=${caption}" \
        -F "parse_mode=HTML"
    else
      curl -s -X POST "${API}/sendDocument" \
        -F "chat_id=${CHAT_ID}" \
        -F "document=@${filepath}"
    fi
    ;;

  *)
    echo "Unknown mode: $mode. Use: text, markdown, document" >&2
    exit 1
    ;;
esac
