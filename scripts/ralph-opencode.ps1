<#
.SYNOPSIS
    Ralph Wiggum loop para OpenCode - iteração até completion promise ou max-iterations.

.DESCRIPTION
    Adaptação da técnica Ralph Wiggum (https://awesomeclaude.ai/ralph-wiggum) para OpenCode.
    Executa um loop que alimenta o agente com o mesmo prompt até:
    - O output conter o texto de completion-promise (ex: DONE, COMPLETE)
    - Atingir max-iterations (segurança)

.PARAMETER PromptFile
    Caminho para o arquivo de prompt (default: docs/ralph/PROMPT.md).

.PARAMETER CompletionPromise
    Texto exato que indica conclusão no output (ex: "DONE", "COMPLETE").
    Se vazio, o loop não para por esse critério (apenas max-iterations).

.PARAMETER MaxIterations
    Número máximo de iterações (default: 50). Segurança contra loops infinitos.

.PARAMETER LogDir
    Pasta para logs (default: logs/ralph-opencode).

.EXAMPLE
    .\ralph-opencode.ps1
    .\ralph-opencode.ps1 -CompletionPromise "DONE" -MaxIterations 30
    .\ralph-opencode.ps1 -PromptFile ".\docs\ralph\PROMPT.md" -CompletionPromise "COMPLETE"
#>

param(
    [string]$PromptFile = "",
    [string]$CompletionPromise = "DONE",
    [int]$MaxIterations = 50,
    [string]$LogDir = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

if ([string]::IsNullOrEmpty($PromptFile)) {
    $PromptFile = Join-Path $RootDir "docs\ralph\PROMPT.md"
}
$PromptFile = Resolve-Path $PromptFile

if ([string]::IsNullOrEmpty($LogDir)) {
    $LogDir = Join-Path $RootDir "logs\ralph-opencode"
}
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "ralph-opencode-$Timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

if (-not (Test-Path $PromptFile)) {
    Write-Log "Arquivo de prompt nao encontrado: $PromptFile" "ERROR"
    exit 1
}

# Verificar se opencode está instalado
try {
    $null = Get-Command opencode -ErrorAction Stop
} catch {
    Write-Log "OpenCode nao encontrado. Instale: npm install -g opencode-ai" "ERROR"
    exit 1
}

$Iteration = 0
$StartTime = Get-Date

# Banner de inicio
Write-Log "=== RALPH OPENCODE INICIADO ==="
Write-Log "Prompt: $PromptFile"
Write-Log "Completion promise: '$CompletionPromise'"
Write-Log "Max iterations: $MaxIterations"
Write-Log "Log file: $LogFile"
Write-Log ""

Set-Location $RootDir

# Permitir tudo sem aprovacao (bypass de permissoes)
$env:OPENCODE_PERMISSION = '{"*":"allow"}'
$env:OPENCODE_YOLO = "true"
if (-not $env:OPENCODE_CONFIG_CONTENT) {
    $env:OPENCODE_CONFIG_CONTENT = '{"permission":"allow"}'
}
Write-Log "Permissoes: bypass ativado (OPENCODE_PERMISSION + YOLO)"

while ($Iteration -lt $MaxIterations) {
    $Iteration++
    $IterStart = Get-Date

    # Progresso: iteracao atual, tempo decorrido
    $Elapsed = (Get-Date) - $StartTime
    $ElapsedStr = "{0:N0}m {1:N0}s" -f [math]::Floor($Elapsed.TotalMinutes), $Elapsed.Seconds
    Write-Log "[ $Iteration / $MaxIterations ] Tempo total: $ElapsedStr"
    Write-Host "`n>>> Iteracao $Iteration/$MaxIterations (elapsed: $ElapsedStr) - executando opencode..." -ForegroundColor Cyan

    try {
        # OpenCode run: --file passa o prompt completo (igual mylab: Claude recebe via cat|pipe)
        # Adiciona completion promise ao final do conteudo
        $PromptContent = Get-Content -Path $PromptFile -Raw
        $FullPrompt = $PromptContent + "`n`nAo concluir TODAS as microtarefas do PRD, output exatamente: $CompletionPromise"
        $TempPrompt = Join-Path $env:TEMP "ralph-opencode-prompt-$([guid]::NewGuid().ToString('N').Substring(0,8)).md"
        Set-Content -Path $TempPrompt -Value $FullPrompt -NoNewline
        try {
            $Output = & opencode run --file $TempPrompt 2>&1
        } finally {
            Remove-Item -Path $TempPrompt -Force -ErrorAction SilentlyContinue
        }
        $OutputStr = $Output | Out-String
        $ExitCode = if ($LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    } catch {
        $OutputStr = $_.Exception.Message
        $ExitCode = 1
    }

    $IterDuration = (Get-Date) - $IterStart

    # Progresso: resultado da iteracao
    $StatusColor = if ($ExitCode -eq 0) { "Green" } else { "Yellow" }
    Write-Log "Exit code: $ExitCode | Duration: $($IterDuration.TotalSeconds)s"
    Write-Host "    [OK] Exit: $ExitCode | Duracao: $([math]::Round($IterDuration.TotalSeconds))s" -ForegroundColor $StatusColor
    Add-Content -Path $LogFile -Value "`n--- OUTPUT (iteration $Iteration) ---`n$OutputStr`n--- FIM OUTPUT ---`n"

    # Verificar completion promise
    if (-not [string]::IsNullOrEmpty($CompletionPromise) -and $OutputStr -match [regex]::Escape($CompletionPromise)) {
        Write-Log "COMPLETION PROMISE DETECTADO: '$CompletionPromise'"
        Write-Host "`n*** CONCLUIDO em $Iteration iteracoes! ***" -ForegroundColor Green
        Write-Log "=== RALPH OPENCODE CONCLUIDO (iteracao $Iteration) ==="
        exit 0
    }

    # Pausa entre iteracoes (evitar rate limit)
    Write-Log "Aguardando 5s antes da proxima iteracao..."
    Write-Host "    Aguardando 5s..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 5
}

$TotalDuration = (Get-Date) - $StartTime
Write-Log "Max iterations atingido ($MaxIterations). Encerrando."
Write-Log "Total duration: $($TotalDuration.TotalMinutes.ToString('F1')) min"
Write-Log "=== RALPH OPENCODE ENCERRADO (max-iter) ==="
exit 0
