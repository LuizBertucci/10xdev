#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${1:-10}"
PROMPT_FILE="${PROMPT_FILE:-./prompt.md}"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 2
fi

if [ ! -f "./prd.json" ]; then
  echo "Missing ./prd.json" >&2
  exit 2
fi

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  echo "=== Ralph iteration $i / $MAX_ITERATIONS ==="

  # Default: safer (will request permissions when needed).
  # If you want non-interactive runs, set:
  #   export CLAUDE_FLAGS="--dangerously-skip-permissions"
  CLAUDE_FLAGS="${CLAUDE_FLAGS:-}"

  # Note: change `claude` below if your CLI name differs.
  OUTPUT="$(cat "$PROMPT_FILE" | claude $CLAUDE_FLAGS -p 2>&1 || true)"

  echo "$OUTPUT"

  if echo "$OUTPUT" | grep -q "<promise>complete</promise>"; then
    echo "All tasks complete!"
    exit 0
  fi
done

echo "Hit max iterations. Check prd.json and progress.txt for status."
exit 1
