#!/usr/bin/env bash
# Ralph loop para Claude CLI - estrutura mylab (branch origin/mylab).
# Alternativas (PowerShell): .\scripts\ralph-cursor.ps1 | .\scripts\ralph-opencode.ps1
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${ROOT_DIR}/docs/ralph/PROMPT.md"

AGENT_CMD="${AGENT_CMD:-claude --print --permission-mode bypassPermissions --model sonnet --output-format stream-json --include-partial-messages --input-format text}"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Arquivo de prompt nao encontrado: $PROMPT_FILE" >&2
  exit 1
fi

while :; do
  cat "$PROMPT_FILE" | $AGENT_CMD
  sleep 5
done
