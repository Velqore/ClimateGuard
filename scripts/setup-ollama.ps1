param(
  [string]$Model = 'qwen2.5:1.5b',
  [string]$Port = '11434'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$Message) { Write-Host "[ClimateGuard] $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "  OK $Message" -ForegroundColor Green }

$BaseUrl = "http://localhost:$Port"

Write-Step 'Checking Ollama installation...'
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step 'Installing Ollama with winget...'
    winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements | Out-Host
  } else {
    throw 'Ollama is not installed and winget is unavailable. Install Ollama from https://ollama.com/download and rerun.'
  }
} else {
  Write-Ok 'Ollama already installed'
}

Write-Step "Starting Ollama server on port $Port..."
try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "$BaseUrl/api/tags" | Out-Null
  Write-Ok 'Ollama server already running'
} catch {
  $env:OLLAMA_HOST = "0.0.0.0:$Port"
  $env:OLLAMA_KEEP_ALIVE = '10m'
  $env:OLLAMA_NUM_CTX = '2048'
  $env:OLLAMA_NUM_PREDICT = '256'
  Start-Process -WindowStyle Hidden -FilePath 'ollama' -ArgumentList 'serve' | Out-Null
  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "$BaseUrl/api/tags" | Out-Null
      Write-Ok 'Ollama server ready'
      break
    } catch {
      Start-Sleep -Seconds 1
      if ($i -eq 29) {
        throw 'Ollama server failed to start.'
      }
    }
  }
}

Write-Step "Ensuring model $Model is available..."
$tags = Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 -Uri "$BaseUrl/api/tags"
if ($tags.Content -notmatch [regex]::Escape($Model)) {
  & ollama pull $Model
  Write-Ok "Model '$Model' ready"
} else {
  Write-Ok "Model '$Model' already downloaded"
}