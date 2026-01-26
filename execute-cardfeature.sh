#!/bin/bash
set -euo pipefail

# Usage:
#   export RALPH_EMAIL="you@example.com"
#   export RALPH_PASSWORD="your-password"
#   export RALPH_BASE_URL="http://localhost:3001"
#   ./execute-cardfeature.sh clawdbot-post.json

INPUT_JSON="${1:-clawdbot-post.json}"

BASE_URL="${RALPH_BASE_URL:-http://localhost:3001}"
EMAIL="${RALPH_EMAIL:-}"
PASSWORD="${RALPH_PASSWORD:-}"

if [ ! -f "$INPUT_JSON" ]; then
  echo "Missing input json: $INPUT_JSON" >&2
  exit 2
fi

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Missing credentials. Set RALPH_EMAIL and RALPH_PASSWORD env vars." >&2
  exit 2
fi

LOGIN_JSON="$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

TOKEN="$(node -e "const s=process.argv[1]; try{const j=JSON.parse(s); process.stdout.write(j.accessToken||'');}catch(e){process.stdout.write('');}" "$LOGIN_JSON")"

if [ -z "$TOKEN" ]; then
  echo "Login failed or accessToken missing. Response:" >&2
  echo "$LOGIN_JSON" >&2
  exit 3
fi

RESP="$(curl -s -X POST "$BASE_URL/api/card-features" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$INPUT_JSON")"

STATUS_OK="$(node -e "const s=process.argv[1]; try{JSON.parse(s); process.stdout.write('ok');}catch(e){process.stdout.write('bad');}" "$RESP")"
if [ "$STATUS_OK" != "ok" ]; then
  echo "Non-JSON response from POST /api/card-features:" >&2
  echo "$RESP" >&2
  exit 4
fi

ID="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(String(j.id||j.cardFeatureId||j.data?.id||''));" "$RESP")"

echo "✅ CardFeature created"
if [ -n "$ID" ]; then
  echo "id=$ID"
fi
