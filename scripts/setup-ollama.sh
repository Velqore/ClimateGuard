#!/usr/bin/env bash
# ============================================================
#  ClimateGuard — Auto Ollama Setup
#  Installs Ollama, pulls model, starts server
#  Usage: bash scripts/setup-ollama.sh [model]
#  Default model: qwen2.5:3b  (laptop-friendly, ~2GB)
#  AMD model:     qwen2.5:72b (requires AMD MI300X)
# ============================================================

set -e

MODEL="${1:-qwen2.5:3b}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║   ClimateGuard AI — AMD Ollama Setup     ║${RESET}"
  echo -e "${CYAN}${BOLD}║   Model: ${MODEL}$(printf '%*s' $((34 - ${#MODEL})) '')║${RESET}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${RESET}"
  echo ""
}

step() { echo -e "${GREEN}▶ $1${RESET}"; }
info() { echo -e "${CYAN}  $1${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${RESET}"; }
ok()   { echo -e "${GREEN}  ✓ $1${RESET}"; }
fail() { echo -e "${RED}  ✗ $1${RESET}"; exit 1; }

# ── 1. Detect OS ────────────────────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "mac"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "linux"
  elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ -n "$WSL_DISTRO_NAME" ]]; then
    echo "windows"
  else
    echo "unknown"
  fi
}

OS=$(detect_os)

# ── 2. Install Ollama if missing ────────────────────────────
install_ollama() {
  step "Checking Ollama installation..."

  if command -v ollama &>/dev/null; then
    INSTALLED_VER=$(ollama --version 2>/dev/null | head -1 || echo "unknown")
    ok "Ollama already installed ($INSTALLED_VER)"
    return
  fi

  step "Installing Ollama..."

  case "$OS" in
    mac)
      if command -v brew &>/dev/null; then
        info "Installing via Homebrew..."
        brew install ollama
      else
        info "Downloading Ollama for macOS..."
        curl -L https://ollama.com/download/ollama-darwin -o /tmp/ollama
        chmod +x /tmp/ollama
        sudo mv /tmp/ollama /usr/local/bin/ollama
      fi
      ;;
    linux)
      info "Installing via official script..."
      curl -fsSL https://ollama.com/install.sh | sh
      ;;
    windows)
      warn "On Windows, please download Ollama from: https://ollama.com/download"
      warn "Then re-run this script."
      fail "Automatic install not supported on Windows — please install manually."
      ;;
    *)
      fail "Unsupported OS: $OSTYPE. Visit https://ollama.com to install manually."
      ;;
  esac

  ok "Ollama installed!"
}

# ── 3. Start Ollama server ──────────────────────────────────
start_ollama_server() {
  step "Starting Ollama server on port $OLLAMA_PORT..."

  if curl -s "http://localhost:$OLLAMA_PORT/api/tags" &>/dev/null; then
    ok "Ollama server already running"
    return
  fi

  OLLAMA_HOST="0.0.0.0:$OLLAMA_PORT" ollama serve &>/tmp/ollama-server.log &
  OLLAMA_PID=$!
  echo $OLLAMA_PID > /tmp/ollama.pid

  info "Waiting for server to be ready..."
  for i in $(seq 1 20); do
    if curl -s "http://localhost:$OLLAMA_PORT/api/tags" &>/dev/null; then
      ok "Ollama server ready (PID $OLLAMA_PID)"
      return
    fi
    sleep 1
    echo -n "."
  done

  echo ""
  fail "Ollama server failed to start. Check /tmp/ollama-server.log"
}

# ── 4. Pull model if not cached ─────────────────────────────
pull_model() {
  step "Checking model: $MODEL..."

  MODELS_JSON=$(curl -s "http://localhost:$OLLAMA_PORT/api/tags" 2>/dev/null || echo '{}')
  if echo "$MODELS_JSON" | grep -q "\"$MODEL\""; then
    ok "Model '$MODEL' already downloaded — skipping pull"
    return
  fi

  step "Pulling model '$MODEL' (this only happens once)..."

  # Show size hint
  case "$MODEL" in
    qwen2.5:3b)    info "Download size: ~2 GB — runs on any modern laptop" ;;
    qwen2.5:7b)    info "Download size: ~5 GB — recommended for 16GB+ RAM" ;;
    qwen2.5:14b)   info "Download size: ~9 GB — recommended for 32GB+ RAM" ;;
    qwen2.5:72b)   info "Download size: ~47 GB — AMD MI300X / high-end GPU required" ;;
    llama3.2:3b)   info "Download size: ~2 GB — runs on any modern laptop" ;;
    *)             info "Pulling custom model..." ;;
  esac

  ollama pull "$MODEL"
  ok "Model '$MODEL' ready!"
}

# ── 5. Write .env patch ─────────────────────────────────────
patch_env() {
  step "Configuring ClimateGuard to use Ollama..."

  ENV_FILE=".env"

  set_var() {
    local key="$1"
    local val="$2"
    if [ -f "$ENV_FILE" ] && grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
      # Update existing
      if [[ "$OS" == "mac" ]]; then
        sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
      else
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
      fi
    else
      echo "${key}=${val}" >> "$ENV_FILE"
    fi
  }

  set_var "AI_MODE" "ollama"
  set_var "OLLAMA_BASE_URL" "http://localhost:${OLLAMA_PORT}"
  set_var "OLLAMA_MODEL" "$MODEL"

  ok ".env updated: AI_MODE=ollama, OLLAMA_MODEL=$MODEL"
}

# ── Main ────────────────────────────────────────────────────
banner
install_ollama
start_ollama_server
pull_model
patch_env

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  ✓ Ollama is running with: $MODEL${RESET}"
echo -e "${GREEN}${BOLD}  ✓ ClimateGuard AI assistant is powered up${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
