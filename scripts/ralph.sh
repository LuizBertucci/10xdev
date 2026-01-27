#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${ROOT_DIR}/docs/ralph/PROMPT.md"

AGENT_CMD="${AGENT_CMD:-claude}"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Arquivo de prompt nao encontrado: $PROMPT_FILE" >&2
  exit 1
fi

while :; do
  cat "$PROMPT_FILE" | $AGENT_CMD
  sleep 5
done
