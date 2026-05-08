#!/usr/bin/env node
/**
 * ClimateGuard — AMD/Ollama Dev Launcher
 *
 * Runs setup-ollama.sh first, then starts the normal dev server.
 * Called by:  npm run dev:amd      → qwen2.5:3b  (laptop)
 *             npm run dev:amd72b   → qwen2.5:72b (AMD MI300X)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MODEL = process.env.OLLAMA_MODEL_OVERRIDE || process.argv[2] || 'qwen2.5:1.5b';
const ROOT  = path.resolve(__dirname, '..');
const SETUP = path.join(__dirname, 'setup-ollama.sh');
const SETUP_POWERSHELL = path.join(__dirname, 'setup-ollama.ps1');

function log(msg, color = '\x1b[36m') {
  console.log(`${color}[ClimateGuard]\x1b[0m ${msg}`);
}

// ── Step 1: make the shell script executable ────────────────
try {
  fs.chmodSync(SETUP, 0o755);
} catch {}

// ── Step 2: check if we're on Windows without WSL ───────────
const isWindows = process.platform === 'win32';
const hasWSL    = isWindows && (() => {
  try { execSync('wsl echo ok', { stdio: 'pipe' }); return true; } catch { return false; }
})();

if (isWindows && !hasWSL) {
  console.log('\x1b[33m');
  console.log('══════════════════════════════════════════════════');
  console.log('  Windows detected without WSL.');
  console.log('  Using native PowerShell Ollama setup for local Windows runs.');
  console.log('  If Ollama is missing, this will try winget first.');
  console.log('══════════════════════════════════════════════════');
  console.log('\x1b[0m');
}

// ── Step 3: run the setup script ───────────────────────────
log(`Setting up Ollama with model: \x1b[1m${MODEL}\x1b[0m`);
log('This installs Ollama and downloads the model (first run only)...\n');

const shellCmd = isWindows
  ? (hasWSL
    ? `wsl bash ${SETUP.replace(/\\/g, '/')} ${MODEL}`
    : `powershell -NoProfile -ExecutionPolicy Bypass -File "${SETUP_POWERSHELL}" -Model "${MODEL}" -Port "${process.env.OLLAMA_PORT || '11434'}"`)
  : `bash "${SETUP}" "${MODEL}"`;

try {
  execSync(shellCmd, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, OLLAMA_MODEL_OVERRIDE: MODEL },
  });
} catch (err) {
  console.error('\x1b[31m[ClimateGuard] Ollama setup failed — continuing with the dev server and rule-based fallback.\x1b[0m');
  console.error('  Error:', err.message);
  console.log('\nContinuing with: npm run dev...\n');
}

// ── Step 4: launch the app ──────────────────────────────────
log('\x1b[32mStarting ClimateGuard dev server...\x1b[0m\n');

const env = {
  ...process.env,
  AI_MODE:          'ollama',
  OLLAMA_BASE_URL:  process.env.OLLAMA_BASE_URL  || 'http://localhost:11434',
  OLLAMA_MODEL:     process.env.OLLAMA_MODEL      || MODEL,
  OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || '10m',
  OLLAMA_NUM_CTX:    process.env.OLLAMA_NUM_CTX    || '2048',
  OLLAMA_NUM_PREDICT: process.env.OLLAMA_NUM_PREDICT || '256',
};

const dev = spawn('npm', ['run', 'dev'], {
  cwd:   ROOT,
  stdio: 'inherit',
  shell: true,
  env,
});

dev.on('exit', code => {
  log('Dev server exited.');
  // Clean up Ollama server if we started it
  const pidFile = '/tmp/ollama.pid';
  if (fs.existsSync(pidFile)) {
    try {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      process.kill(Number(pid), 'SIGTERM');
      fs.unlinkSync(pidFile);
      log('Ollama server stopped.');
    } catch {}
  }
  process.exit(code);
});

// Forward signals
['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => dev.kill(sig));
});
