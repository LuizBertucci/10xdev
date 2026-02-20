#!/usr/bin/env bash
# Ralph Wiggum loop para OpenCode CLI - WSL Ubuntu / Linux.
# Chama opencode run para executar microtarefas do PRD.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${PROMPT_FILE:-$ROOT_DIR/docs/ralph/PROMPT.md}"
COMPLETION_PROMISE="${COMPLETION_PROMISE:-DONE}"
MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/logs/ralph-opencode}"
MODEL="${MODEL:-}"
AUTO_START="${AUTO_START:-0}"
OPENCODE_ATTACH="${OPENCODE_ATTACH:-}"

mkdir -p "$LOG_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_FILE:-$LOG_DIR/ralph-opencode-$TIMESTAMP.log}"

write_log() {
  local msg="$1"
  local level="${2:-INFO}"
  local line="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $msg"
  echo "$line" >> "$LOG_FILE"
  echo "$line"
}

# Resolve caminho absoluto do prompt
if [[ -n "$PROMPT_FILE" && "$PROMPT_FILE" != /* ]]; then
  PROMPT_FILE="$ROOT_DIR/$PROMPT_FILE"
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  write_log "Arquivo de prompt nao encontrado: $PROMPT_FILE" "ERROR"
  exit 1
fi

# Detecao do OpenCode
export PATH="${HOME}/.local/bin:${PATH}"
if [[ -n "${OPENCODE_CMD:-}" ]]; then
  AGENT_BIN="$OPENCODE_CMD"
  echo "[INFO] Usando OPENCODE_CMD: $OPENCODE_CMD"
elif command -v opencode &>/dev/null; then
  AGENT_BIN="opencode"
  echo "[INFO] Usando 'opencode'"
else
  echo "[ERROR] OpenCode nao encontrado. Instale com:"
  echo "  curl -fsSL https://opencode.ai/install | bash"
  echo "  ou: npm install -g opencode-ai"
  exit 1
fi

# Permissao automatica para execucao sem prompts de aprovacao
export OPENCODE_PERMISSION="${OPENCODE_PERMISSION:-{\"permission\":\"allow\"}}"

# ========== O QUE VAI ACONTECER ==========
echo ""
echo "========================================"
echo "  RALPH OPENCODE - O QUE ESTE SCRIPT FAZ"
echo "========================================"
echo ""
echo "1. OBJETIVO: Executar microtarefas do PRD (docs/ralph/PRD.json) de forma automatica."
echo "2. COMO: Em cada iteracao, o OpenCode recebe o prompt e executa UMA microtarefa pendente."
echo "3. O QUE O AGENTE FAZ: Le o PRD, pega a primeira microtarefa 'pending', executa, atualiza status, faz commit."
echo "4. QUANDO PARA: Ao detectar '$COMPLETION_PROMISE' no output ou apos $MAX_ITERATIONS iteracoes."
echo "5. LOGS: Saida completa em $LOG_FILE"
echo ""
echo "PROXIMA MICROTAREFA PENDENTE: Verifique em docs/ralph/PRD.json (procure status: \"pending\")"
echo ""

if [[ "$AUTO_START" != "1" ]]; then
  echo "Pressione ENTER para iniciar ou Ctrl+C para cancelar..."
  read -r
fi

# Conteudo do prompt + promise de conclusao
PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
PROMPT_WITH_PROMISE="${PROMPT_CONTENT}

Ao concluir TODAS as microtarefas do PRD, output exatamente: $COMPLETION_PROMISE"

cd "$ROOT_DIR"

write_log "Modo: opencode run"
write_log "=== RALPH OPENCODE INICIADO ==="
write_log "Prompt: $PROMPT_FILE"
write_log "Completion promise: '$COMPLETION_PROMISE'"
write_log "Max iterations: $MAX_ITERATIONS"
write_log "Log file: $LOG_FILE"
[[ -n "$MODEL" ]] && write_log "Model: $MODEL"
[[ -n "$OPENCODE_ATTACH" ]] && write_log "Attach: $OPENCODE_ATTACH"
write_log ""

START_TIME=$(date +%s)
ITERATION=0

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  ITER_START=$(date +%s)
  ELAPSED=$((ITER_START - START_TIME))
  ELAPSED_STR="$((ELAPSED / 60))m $((ELAPSED % 60))s"

  write_log "[ $ITERATION / $MAX_ITERATIONS ] Tempo total: $ELAPSED_STR"
  echo ""
  echo ">>> Iteracao $ITERATION/$MAX_ITERATIONS (elapsed: $ELAPSED_STR) - executando opencode..."

  OUTPUT=""
  EXIT_CODE=0
  OUTPUT_TMP=$(mktemp)
  set +e
  RUN_ARGS=("run" "$PROMPT_WITH_PROMISE")
  [[ -n "$MODEL" ]] && RUN_ARGS+=("--model" "$MODEL")
  [[ -n "$OPENCODE_ATTACH" ]] && RUN_ARGS+=("--attach" "$OPENCODE_ATTACH")

  "$AGENT_BIN" "${RUN_ARGS[@]}" 2>&1 | tee "$OUTPUT_TMP"
  EXIT_CODE=${PIPESTATUS[0]}
  set -e
  OUTPUT=$(cat "$OUTPUT_TMP")
  rm -f "$OUTPUT_TMP"

  ITER_DURATION=$(($(date +%s) - ITER_START))
  write_log "Exit code: $EXIT_CODE | Duration: ${ITER_DURATION}s"

  if [[ $EXIT_CODE -eq 0 ]]; then
    echo "    Exit: $EXIT_CODE | Duracao: ${ITER_DURATION}s"
  else
    echo "    Exit: $EXIT_CODE | Duracao: ${ITER_DURATION}s"
  fi

  echo "" >> "$LOG_FILE"
  echo "--- OUTPUT (iteration $ITERATION) ---" >> "$LOG_FILE"
  echo "$OUTPUT" >> "$LOG_FILE"
  echo "--- FIM OUTPUT ---" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"

  if [[ $EXIT_CODE -ne 0 && -n "${OUTPUT// }" ]]; then
    echo "    [ERRO] Ultimas linhas do output:"
    echo "$OUTPUT" | tail -8 | while IFS= read -r line; do
      echo "      $line"
    done
  fi

  # Verificar completion promise
  if [[ -n "$COMPLETION_PROMISE" && "$OUTPUT" == *"$COMPLETION_PROMISE"* ]]; then
    write_log "COMPLETION PROMISE DETECTADO: '$COMPLETION_PROMISE'"
    echo ""
    echo "*** CONCLUIDO em $ITERATION iteracoes! ***"
    write_log "=== RALPH OPENCODE CONCLUIDO (iteracao $ITERATION) ==="
    exit 0
  fi

  write_log "Aguardando 5s antes da proxima iteracao..."
  echo "    Aguardando 5s..."
  sleep 5
done

TOTAL_DURATION=$(($(date +%s) - START_TIME))
TOTAL_MIN=$((TOTAL_DURATION / 60))
write_log "Max iterations atingido ($MAX_ITERATIONS). Encerrando."
write_log "Total duration: ${TOTAL_MIN} min"
write_log "=== RALPH OPENCODE ENCERRADO (max-iter) ==="
exit 0
