#!/usr/bin/env bash
# Ralph Wiggum loop para Cursor CLI - WSL Ubuntu / Linux.
# Convertido do antigo ralph-cursor.ps1 (PowerShell).
# Chama cursor agent ou agent standalone para executar microtarefas do PRD.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${PROMPT_FILE:-$ROOT_DIR/docs/ralph/PROMPT.md}"
COMPLETION_PROMISE="${COMPLETION_PROMISE:-DONE}"
MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/logs/ralph-cursor}"
MODEL="${MODEL:-}"
AUTO_START="${AUTO_START:-0}"

mkdir -p "$LOG_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_FILE:-$LOG_DIR/ralph-cursor-$TIMESTAMP.log}"

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

# Comando do agente: AGENT_CMD ou deteccao automatica
# Ex: AGENT_CMD="agent" | AGENT_CMD="cursor agent" (nao use placeholder como "seu_alias")
export PATH="${HOME}/.local/bin:${PATH}"
if [[ -n "${AGENT_CMD:-}" && "$AGENT_CMD" != "seu_alias" ]]; then
  AGENT_BIN="$AGENT_CMD"
  # Standalone aceita -p --trust; cursor agent nao
  if [[ "$AGENT_CMD" == agent || "$AGENT_CMD" == *"/agent"* ]]; then
    USE_STANDALONE=true
  else
    USE_STANDALONE=false
  fi
  echo "[INFO] Usando AGENT_CMD: $AGENT_CMD"
elif [[ -x "${HOME}/.local/bin/agent" ]] || command -v agent &>/dev/null; then
  AGENT_BIN="agent"
  USE_STANDALONE=true
  echo "[INFO] Usando 'agent' (standalone)"
elif command -v cursor &>/dev/null; then
  AGENT_BIN="cursor agent"
  USE_STANDALONE=false
  echo "[INFO] Usando 'cursor agent'"
else
  echo "[ERROR] Nenhum agente encontrado. Defina AGENT_CMD ou instale:"
  echo "  curl -fsSL https://cursor.com/install | sh"
  exit 1
fi

if ! $USE_STANDALONE; then
  echo "[INFO] Para modo automatico (--trust), instale standalone: curl -fsSL https://cursor.com/install | sh"
fi

# ========== O QUE VAI ACONTECER ==========
echo ""
echo "========================================"
echo "  RALPH CURSOR - O QUE ESTE SCRIPT FAZ"
echo "========================================"
echo ""
echo "1. OBJETIVO: Executar microtarefas do PRD (docs/ralph/PRD.json) de forma automatica."
echo "2. COMO: Em cada iteracao, o Cursor Agent recebe o prompt e executa UMA microtarefa pendente."
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

MODE_DESC="cursor agent (sem --print/--trust)"
if $USE_STANDALONE; then
  MODE_DESC="standalone agent (-p --trust)"
fi
write_log "Modo: $MODE_DESC"

write_log "=== RALPH CURSOR INICIADO ==="
write_log "Prompt: $PROMPT_FILE"
write_log "Completion promise: '$COMPLETION_PROMISE'"
write_log "Max iterations: $MAX_ITERATIONS"
write_log "Log file: $LOG_FILE"
[[ -n "$MODEL" ]] && write_log "Model: $MODEL"
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
  echo ">>> Iteracao $ITERATION/$MAX_ITERATIONS (elapsed: $ELAPSED_STR) - executando agent..."

  OUTPUT=""
  EXIT_CODE=0
  OUTPUT_TMP=$(mktemp)
  set +e
  if $USE_STANDALONE; then
    if [[ -n "$MODEL" ]]; then
      $AGENT_BIN -p "$PROMPT_WITH_PROMISE" --output-format text --trust --model "$MODEL" 2>&1 | tee "$OUTPUT_TMP"
    else
      $AGENT_BIN -p "$PROMPT_WITH_PROMISE" --output-format text --trust 2>&1 | tee "$OUTPUT_TMP"
    fi
    EXIT_CODE=${PIPESTATUS[0]}
  else
    $AGENT_BIN -p "$PROMPT_WITH_PROMISE" 2>&1 | tee "$OUTPUT_TMP"
    EXIT_CODE=${PIPESTATUS[0]}
  fi
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
    write_log "=== RALPH CURSOR CONCLUIDO (iteracao $ITERATION) ==="
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
write_log "=== RALPH CURSOR ENCERRADO (max-iter) ==="
exit 0
