#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${1:-10}"

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  echo "=== Ralph(local) iteration $i / $MAX_ITERATIONS ==="
  node ./scripts/ralph-runner.js --max 1

  if node -e "const p=require('./prd.json'); process.exit(p.stories.some(s=>!s.passes)?1:0)"; then
    echo "<promise>complete</promise>"
    echo "All tasks complete!"
    exit 0
  fi
done

echo "Hit max iterations. Check prd.json, progress.txt, ralph-output.log."
exit 1

