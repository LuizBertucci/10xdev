# Como subir conteúdos para a 10xDev

## Conversão de mock data
- Gerar cards a partir de `frontend/mockData/codes.ts` executando `node scripts/convert-codes-to-json.js`; os arquivos resultantes ficam em `.clinerules/codes/`.
- Para `home.ts`, `lessons.ts` e `projects.ts`, usar `node scripts/convert-dashboard-data-to-json.js`, que escreve `home-dashboard-widgets.json`, `lessons-catalog.json` e `project-templates.json` no mesmo diretório.
- Manter todos os JSONs padronizados segundo o schema Subir (`title`, `tech`, `language`, `content_type`, `card_type`, `screens[]`, `blocks[]`).

## Preparação para upload
- Conferir e, se necessário, ajustar IDs e slugs gerados automaticamente pelos scripts; todos os `blocks` recebem `uuid`.
- Validar os arquivos com `jq . file.json` ou `node -e "JSON.parse(fs.readFileSync(path))"` antes de subir.
- Não alterar as importações do frontend até confirmar que os cards foram carregados na API; os mocks TypeScript podem ser removidos após o upload.

## Upload para API
- Base URL padrão: `https://web-backend-10xdev.azurewebsites.net/api/card-features` (ex.: card `6ad3121d-9b27-480c-81cb-28e5fdb406ef`).
- Requisições usam header `Content-Type: application/json`; atualmente sem autenticação obrigatória.
- Para criar um card individual, enviar o JSON correspondente com `curl -X POST https://web-backend-10xdev.azurewebsites.net/api/card-features -H 'Content-Type: application/json' -d @.clinerules/codes/<arquivo>.json`.
- Para criação em lote, montar um array e usar `curl -X POST https://web-backend-10xdev.azurewebsites.net/api/card-features/bulk -H 'Content-Type: application/json' -d @cards-bulk.json`; remoções múltiplas usam `curl -X DELETE https://web-backend-10xdev.azurewebsites.net/api/card-features/bulk -H 'Content-Type: application/json' -d '{ "ids": [] }'.
- Respeitar enums aceitos pelo backend: `content_type` ∈ {`code`, `text`, `terminal`} e `card_type` ∈ {`dicas`, `codigos`, `workflows`}; valores diferentes resultam em erro 500.
- Após cada upload bem-sucedido, anotar o `id` retornado (ex.: `b2e59dd2-3b51-46f3-acb9-3ceac21011af` para `project-templates`).
- Para cards de dados (JSON), usar `content_type: "code"` + `language: "json"` e `card_type: "codigos"`.

### Cards já publicados
- `project-templates.json` → `b2e59dd2-3b51-46f3-acb9-3ceac21011af`
- `1-sistema-de-autenticacao-jwt.json` → `fb3f0c2b-80a4-4182-b6dd-6f0b21d7f110`
- `2-crud-completo-react-typescript.json` → `70989170-77a5-4b60-a496-52ed386ac100`
- `3-api-rest-com-validacao.json` → `578f00f0-21e0-437a-a1eb-3404b55fad89`
- `dashboard-metrics-cards-de-metricas-dashboard.json` → `2281eb69-dfce-4a6d-9084-53544ffab06a`
- `home-dashboard-widgets.json` → `3ddb3226-a2f8-4037-beca-d044bfa63f4f`
- `lessons-catalog.json` → `6b41f168-360c-4652-93c9-09fd45e04751`
- `ai-integracao-ia.json` → `cbab42b2-a363-4971-a557-314a56f2f6ec`
- `trainings-youtube-manager.json` → `ca7e7746-55cc-458c-8773-493a3c790f69`

## Documentação complementar
- `@subir-code.json` mantém um exemplo completo dos endpoints de Card Features e pode servir como referência rápida para payloads e respostas esperadas.
- Revisar `backend/src/types/cardfeature.ts` para garantir que campos (`content_type`, `card_type`, estrutura de `screens`/`blocks`) estejam alinhados antes do envio.
