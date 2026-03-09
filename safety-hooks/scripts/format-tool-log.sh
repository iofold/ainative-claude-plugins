#!/bin/bash
# Human-friendly formatter for Claude Code tool usage logs

INPUT=$(cat)

# Extract key fields using jq
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo 'unknown')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)
TIMESTAMP=$(date '+%H:%M:%S')

# Format the output based on tool type
case "$TOOL_NAME" in
  "Bash")
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
    DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null)
    if [ -n "$DESCRIPTION" ]; then
      echo "[$TIMESTAMP] Bash: $DESCRIPTION"
      echo "   -> $COMMAND"
    else
      echo "[$TIMESTAMP] Bash: $COMMAND"
    fi
    ;;

  "Read")
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    FILENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
    echo "[$TIMESTAMP] Read: $FILENAME"
    echo "   -> $FILE_PATH"
    ;;

  "Write")
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    FILENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
    CONTENT_LENGTH=$(echo "$INPUT" | jq -r '.tool_input.content // "" | length' 2>/dev/null)
    echo "[$TIMESTAMP] Write: $FILENAME ($CONTENT_LENGTH bytes)"
    echo "   -> $FILE_PATH"
    ;;

  "Edit")
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    FILENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
    OLD_LENGTH=$(echo "$INPUT" | jq -r '.tool_input.old_string // "" | length' 2>/dev/null)
    NEW_LENGTH=$(echo "$INPUT" | jq -r '.tool_input.new_string // "" | length' 2>/dev/null)
    echo "[$TIMESTAMP] Edit: $FILENAME (${OLD_LENGTH}->${NEW_LENGTH} chars)"
    echo "   -> $FILE_PATH"
    ;;

  "Glob")
    PATTERN=$(echo "$INPUT" | jq -r '.tool_input.pattern // ""' 2>/dev/null)
    echo "[$TIMESTAMP] Glob: $PATTERN"
    ;;

  "Grep")
    PATTERN=$(echo "$INPUT" | jq -r '.tool_input.pattern // ""' 2>/dev/null)
    OUTPUT_MODE=$(echo "$INPUT" | jq -r '.tool_input.output_mode // "content"' 2>/dev/null)
    echo "[$TIMESTAMP] Grep: \"$PATTERN\" (mode: $OUTPUT_MODE)"
    ;;

  "TodoWrite")
    TODO_COUNT=$(echo "$INPUT" | jq -r '.tool_input.todos | length' 2>/dev/null || echo "0")
    echo "[$TIMESTAMP] TodoWrite: $TODO_COUNT todos"
    ;;

  "Task")
    DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null)
    SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)
    echo "[$TIMESTAMP] Task: $DESCRIPTION"
    echo "   -> subagent: $SUBAGENT"
    ;;

  "WebFetch")
    URL=$(echo "$INPUT" | jq -r '.tool_input.url // ""' 2>/dev/null)
    echo "[$TIMESTAMP] WebFetch: $URL"
    ;;

  "WebSearch")
    QUERY=$(echo "$INPUT" | jq -r '.tool_input.query // ""' 2>/dev/null)
    echo "[$TIMESTAMP] WebSearch: \"$QUERY\""
    ;;

  "Skill")
    SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null)
    echo "[$TIMESTAMP] Skill: $SKILL"
    ;;

  "SlashCommand")
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
    echo "[$TIMESTAMP] SlashCommand: $COMMAND"
    ;;

  "AskUserQuestion")
    QUESTION_COUNT=$(echo "$INPUT" | jq -r '.tool_input.questions | length' 2>/dev/null || echo "1")
    echo "[$TIMESTAMP] AskUserQuestion: $QUESTION_COUNT question(s)"
    ;;

  *)
    echo "[$TIMESTAMP] $TOOL_NAME"
    ;;
esac

# Add separator for readability
echo ""
