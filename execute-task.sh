#!/bin/bash
set -euo pipefail

TASK_ID=$1

# Config via env (avoid committing credentials in repo):
#   export RALPH_BASE_URL="http://localhost:3001"
#   export RALPH_EMAIL="you@example.com"
#   export RALPH_PASSWORD="your-password"
BASE_URL="${RALPH_BASE_URL:-http://localhost:3001}"
EMAIL="${RALPH_EMAIL:-}"
PASSWORD="${RALPH_PASSWORD:-}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Missing credentials. Set RALPH_EMAIL and RALPH_PASSWORD env vars." >&2
  exit 2
fi

LOGIN_JSON="$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

# Parse accessToken using node (avoids jq dependency)
TOKEN="$(node -e "const s=process.argv[1]; try{const j=JSON.parse(s); process.stdout.write(j.accessToken||'');}catch(e){process.stdout.write('');}" "$LOGIN_JSON")"

if [ -z "$TOKEN" ]; then
  echo "Login failed or accessToken missing. Response:" >&2
  echo "$LOGIN_JSON" >&2
  exit 3
fi

if [ "$TASK_ID" = "1" ]; then
  # Delete old post
  POST_ID=$(curl -s "$BASE_URL/api/contents" \
    -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[a-f0-9-]*"' | head -1 | cut -d'"' -f4)

  if [ ! -z "$POST_ID" ]; then
    curl -s -X DELETE "$BASE_URL/api/contents/$POST_ID" \
      -H "Authorization: Bearer $TOKEN"
    echo "✅ Post deleted: $POST_ID"
  fi

elif [ "$TASK_ID" = "2" ]; then
  # Create new post with full content
  curl -s -X POST "$BASE_URL/api/contents" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "title": "ClawdBot: O Assistente de IA que Siri Deveria Ser",
      "description": "Assistente de IA self-hosted que roda no seu servidor 24/7, integrando com Telegram. A revolução que o Vale do Silício não conseguiu fazer.",
      "contentType": "post",
      "category": "AI/Automation",
      "tags": ["ai", "automation", "claude", "self-hosted", "setup", "devops"],
      "markdownContent": "# ClawdBot: A IA que Trabalha Enquanto Você Dorme\n\nO Vale do Silício está falando sobre isso. E isso nem virou assunto no Brasil ainda.\n\n## Por que esquecer ChatGPT?\n\nA diferença não é apenas em poder de processamento, é em **como funciona**.\n\n### ChatGPT vs ClawdBot\n\n| Aspecto | ChatGPT | ClawdBot |\n|--------|---------|----------|\n| Onde vive | Site | Seu Telegram |\n| Memória | Perde tudo ao fechar | Lembra cada conversa |\n| Iniciativa | Espera você abrir | Te manda mensagem primeiro |\n| Capacidade | Responde perguntas | Executa tarefas no seu PC |\n\n## O Que Ele Faz\n\n✅ **Briefing automático às 7h**: seus emails, agenda, tarefas\n✅ **Alertas proativos**: \"aquela ação caiu 5%\"\n✅ **Automações sob demanda**: você pede, ele cria\n✅ **Memória real**: lembra o que você disse há 2 semanas\n\n> Siri tem memória de peixinho dourado. ClawdBot tem cérebro.\n\n---\n\n## O Custo Real\n\n| Componente | Custo | Notas |\n|-----------|-------|-------|\n| Servidor VPS | $5/mês | Hetzner CX22 (4GB RAM) |\n| IA (Claude) | $20-100/mês | Depende do uso |\n| **Total** | **$25-150/mês** | Uso moderado |\n\n---\n\n## Como Instalar em 30 Minutos\n\n### Pré-requisitos\n\n1. ✅ Conta na Hetzner (ou outro VPS com Ubuntu)\n2. ✅ API key da Anthropic (~$20-50/mês)\n3. ✅ Telegram (recomendado) ou WhatsApp\n\n### Passo 1: Servidor na Hetzner\n\n```bash\n# Acessa hetzner.com/cloud\n# OS: Ubuntu 24.04\n# Plano: CX22 ($4/mês, 4GB RAM)\n```\n\n### Passo 2: SSH Setup\n\n```bash\nssh root@<seu-ip>\nadduser clawdbot\nusermod -aG sudo clawdbot\nsu - clawdbot\n```\n\n### Passo 3: Node.js\n\n```bash\ncurl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash\nsource ~/.bashrc\nnvm install 22\ncorepack enable pnpm\n```\n\n### Passo 4: ClawdBot\n\n```bash\ncurl -fsSL https://clawd.bot/install.sh | bash\n```\n\n### Passo 5: Wizard\n\n```bash\nclawdbot onboard --install-daemon\n```\n\n### Passo 6: Telegram\n\n1. Procura @BotFather no Telegram\n2. Manda /newbot\n3. Aprova pairing\n\n```bash\nclawdbot pairing approve telegram <código>\n```\n\n✅ **Pronto! 24/7 rodando**\n\n---\n\n## Recursos\n\n- 📖 **Docs**: https://docs.clawd.bot\n- 🚀 **GitHub**: https://github.com/clawdbot/clawdbot\n- 🌐 **Hetzner**: https://hetzner.com/cloud\n- 🤖 **Anthropic**: https://console.anthropic.com\n\n---\n\n**Isso é o futuro do trabalho. E já começou.**"
    }' > /dev/null
  echo "✅ Post created"
fi
