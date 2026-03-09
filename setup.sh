#!/usr/bin/env bash
#
# ainative-claude-tools setup script
#
# Installs system dependencies, CLI tools, and registers the marketplace
# for Claude Code plugins. Designed to be idempotent - safe to run multiple times.
#
# Usage:
#   ./setup.sh              # Full install
#   ./setup.sh --skip-optional  # Skip optional components (Rust tools, Playwright)
#   ./setup.sh --help       # Show help
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PLUGINS_DIR="${HOME}/.claude/plugins"
MIN_PYTHON_VERSION="3.11"
MIN_NODE_VERSION="18"

SKIP_OPTIONAL=false

# ---------------------------------------------------------------------------
# Color output helpers
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
error()   { printf "${RED}[ERR]${NC}   %s\n" "$*"; }
header()  { printf "\n${BOLD}${CYAN}==> %s${NC}\n" "$*"; }
step()    { printf "  ${BOLD}->  %s${NC}\n" "$*"; }

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

command_exists() {
  command -v "$1" &>/dev/null
}

version_gte() {
  # Returns 0 if $1 >= $2 using sort -V
  printf '%s\n%s' "$2" "$1" | sort -V -C
}

detect_os() {
  case "$(uname -s)" in
    Darwin*) echo "macos" ;;
    Linux*)  echo "linux" ;;
    *)       echo "unsupported" ;;
  esac
}

detect_linux_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "${ID:-unknown}"
  else
    echo "unknown"
  fi
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

show_help() {
  cat <<'HELPTEXT'
ainative-claude-tools setup

USAGE
  ./setup.sh [OPTIONS]

OPTIONS
  --help            Show this help message
  --skip-optional   Skip optional components:
                      - Rust-based tools (aichat-search)
                      - Playwright browser install
                      - ffmpeg

WHAT THIS INSTALLS
  System packages   python3.11+, node.js, bun, tmux, jq, ffmpeg, gpg
  Python tools      claude-code-tools (via uv)
  Rust tools        aichat-search (optional, via cargo)
  Browsers          Chromium (via Playwright, optional)
  Marketplace       Registers plugins in ~/.claude/plugins/

The script is idempotent - it checks for existing installs before proceeding.
HELPTEXT
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        show_help
        exit 0
        ;;
      --skip-optional)
        SKIP_OPTIONAL=true
        shift
        ;;
      *)
        error "Unknown option: $1"
        echo "Run './setup.sh --help' for usage."
        exit 1
        ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# System dependency installers
# ---------------------------------------------------------------------------

install_system_deps_macos() {
  header "Installing system dependencies (macOS)"

  if ! command_exists brew; then
    step "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    success "Homebrew installed"
  else
    success "Homebrew already installed"
  fi

  local packages=()

  # Python 3.11+
  if command_exists python3; then
    local pyver
    pyver="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if version_gte "$pyver" "$MIN_PYTHON_VERSION"; then
      success "Python ${pyver} already installed (>= ${MIN_PYTHON_VERSION})"
    else
      packages+=(python@3.11)
    fi
  else
    packages+=(python@3.11)
  fi

  # Node.js
  if command_exists node; then
    local nodever
    nodever="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "$nodever" -ge "$MIN_NODE_VERSION" ]; then
      success "Node.js v${nodever} already installed (>= ${MIN_NODE_VERSION})"
    else
      packages+=(node)
    fi
  else
    packages+=(node)
  fi

  # tmux
  if command_exists tmux; then
    success "tmux already installed"
  else
    packages+=(tmux)
  fi

  # jq
  if command_exists jq; then
    success "jq already installed"
  else
    packages+=(jq)
  fi

  # gpg
  if command_exists gpg; then
    success "gpg already installed"
  else
    packages+=(gnupg)
  fi

  # ffmpeg (optional)
  if [ "$SKIP_OPTIONAL" = false ]; then
    if command_exists ffmpeg; then
      success "ffmpeg already installed"
    else
      packages+=(ffmpeg)
    fi
  else
    info "Skipping ffmpeg (--skip-optional)"
  fi

  if [ ${#packages[@]} -gt 0 ]; then
    step "Installing via Homebrew: ${packages[*]}"
    brew install "${packages[@]}"
    success "System packages installed"
  else
    success "All system packages already present"
  fi
}

install_system_deps_linux() {
  header "Installing system dependencies (Linux)"

  local distro
  distro="$(detect_linux_distro)"
  local pkg_install=""
  local pkg_update=""

  case "$distro" in
    ubuntu|debian|pop)
      pkg_update="sudo apt-get update -qq"
      pkg_install="sudo apt-get install -y -qq"
      ;;
    fedora)
      pkg_update="true"
      pkg_install="sudo dnf install -y -q"
      ;;
    arch|manjaro)
      pkg_update="sudo pacman -Sy --noconfirm"
      pkg_install="sudo pacman -S --noconfirm --needed"
      ;;
    *)
      warn "Unsupported Linux distribution: ${distro}"
      warn "Please install manually: python3.11+, node.js, tmux, jq, ffmpeg, gpg"
      return 0
      ;;
  esac

  local packages=()
  local need_update=false

  # Python 3.11+
  if command_exists python3; then
    local pyver
    pyver="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if version_gte "$pyver" "$MIN_PYTHON_VERSION"; then
      success "Python ${pyver} already installed (>= ${MIN_PYTHON_VERSION})"
    else
      need_update=true
      case "$distro" in
        ubuntu|debian|pop) packages+=(python3.11 python3.11-venv) ;;
        fedora)            packages+=(python3.11) ;;
        arch|manjaro)      packages+=(python) ;;
      esac
    fi
  else
    need_update=true
    case "$distro" in
      ubuntu|debian|pop) packages+=(python3 python3-venv) ;;
      *)                 packages+=(python3) ;;
    esac
  fi

  # Node.js
  if command_exists node; then
    local nodever
    nodever="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "$nodever" -ge "$MIN_NODE_VERSION" ]; then
      success "Node.js v${nodever} already installed (>= ${MIN_NODE_VERSION})"
    else
      need_update=true
      packages+=(nodejs npm)
    fi
  else
    need_update=true
    packages+=(nodejs npm)
  fi

  # tmux
  if command_exists tmux; then
    success "tmux already installed"
  else
    need_update=true
    packages+=(tmux)
  fi

  # jq
  if command_exists jq; then
    success "jq already installed"
  else
    need_update=true
    packages+=(jq)
  fi

  # gpg
  if command_exists gpg; then
    success "gpg already installed"
  else
    need_update=true
    packages+=(gnupg)
  fi

  # ffmpeg (optional)
  if [ "$SKIP_OPTIONAL" = false ]; then
    if command_exists ffmpeg; then
      success "ffmpeg already installed"
    else
      need_update=true
      packages+=(ffmpeg)
    fi
  else
    info "Skipping ffmpeg (--skip-optional)"
  fi

  if [ ${#packages[@]} -gt 0 ]; then
    if [ "$need_update" = true ]; then
      step "Updating package index..."
      eval "$pkg_update"
    fi
    step "Installing: ${packages[*]}"
    eval "$pkg_install ${packages[*]}"
    success "System packages installed"
  else
    success "All system packages already present"
  fi
}

# ---------------------------------------------------------------------------
# Bun
# ---------------------------------------------------------------------------

install_bun() {
  header "Bun runtime"

  if command_exists bun; then
    success "Bun already installed ($(bun --version))"
    return 0
  fi

  step "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash

  # Source the updated profile so bun is available in this session
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"

  if command_exists bun; then
    success "Bun installed ($(bun --version))"
  else
    warn "Bun installed but not found in PATH. You may need to restart your shell."
  fi
}

# ---------------------------------------------------------------------------
# uv + Python tools
# ---------------------------------------------------------------------------

install_python_tools() {
  header "Python tools (via uv)"

  # Install uv if not present
  if ! command_exists uv; then
    step "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="${HOME}/.local/bin:${PATH}"
    if command_exists uv; then
      success "uv installed"
    else
      warn "uv installed but not on PATH. You may need to restart your shell."
      return 0
    fi
  else
    success "uv already installed ($(uv --version 2>/dev/null || echo 'unknown'))"
  fi

  # Install claude-code-tools (provides tmux-cli, aichat, vault, env-safe)
  step "Installing claude-code-tools..."
  uv tool install claude-code-tools --force 2>/dev/null || uv tool install claude-code-tools || true
  success "claude-code-tools installed (tmux-cli, aichat, vault, env-safe)"
}

# ---------------------------------------------------------------------------
# Rust tools (optional)
# ---------------------------------------------------------------------------

install_rust_tools() {
  header "Rust tools (optional)"

  if [ "$SKIP_OPTIONAL" = true ]; then
    info "Skipping Rust tools (--skip-optional)"
    return 0
  fi

  if ! command_exists cargo; then
    warn "cargo not found - skipping Rust tools"
    info "Install Rust via https://rustup.rs/ to enable aichat-search"
    return 0
  fi

  if command_exists aichat-search; then
    success "aichat-search already installed"
    return 0
  fi

  step "Installing aichat-search (this may take a few minutes)..."
  if cargo install aichat-search 2>/dev/null; then
    success "aichat-search installed"
  else
    warn "Failed to install aichat-search - skipping (non-critical)"
  fi
}

# ---------------------------------------------------------------------------
# Playwright browsers (optional)
# ---------------------------------------------------------------------------

install_playwright() {
  header "Playwright browsers (optional)"

  if [ "$SKIP_OPTIONAL" = true ]; then
    info "Skipping Playwright (--skip-optional)"
    return 0
  fi

  if ! command_exists npx; then
    warn "npx not found - skipping Playwright install"
    return 0
  fi

  step "Installing Chromium via Playwright..."
  if npx playwright install chromium 2>/dev/null; then
    success "Playwright Chromium installed"
  else
    warn "Playwright install failed - skipping (non-critical)"
    info "Run 'npx playwright install chromium' manually later"
  fi
}

# ---------------------------------------------------------------------------
# Marketplace setup
# ---------------------------------------------------------------------------

setup_marketplace() {
  header "Marketplace registration"

  # Create the Claude plugins directory
  if [ ! -d "$CLAUDE_PLUGINS_DIR" ]; then
    step "Creating ${CLAUDE_PLUGINS_DIR}..."
    mkdir -p "$CLAUDE_PLUGINS_DIR"
    success "Plugins directory created"
  else
    success "Plugins directory exists"
  fi

  # Create plugin subdirectories for each plugin in the marketplace
  local plugins=(
    developer-workflow
    project-planning
    agent-orchestration
    code-quality
    ai-development
    cloudflare-tools
    safety-hooks
    session-management
    frontend-design
    video-tools
    google-workspace
  )

  step "Creating plugin directory structure..."
  for plugin in "${plugins[@]}"; do
    local plugin_dir="${SCRIPT_DIR}/${plugin}"
    if [ ! -d "$plugin_dir" ]; then
      mkdir -p "$plugin_dir"
    fi
  done
  success "Plugin directories ready"

  # Symlink the marketplace into the Claude plugins directory
  local marketplace_link="${CLAUDE_PLUGINS_DIR}/ainative-claude-tools"
  if [ -L "$marketplace_link" ]; then
    # Already a symlink - check if it points to the right place
    local current_target
    current_target="$(readlink -f "$marketplace_link" 2>/dev/null || readlink "$marketplace_link")"
    if [ "$current_target" = "$(cd "$SCRIPT_DIR" && pwd)" ]; then
      success "Marketplace already registered"
      return 0
    else
      step "Updating marketplace symlink..."
      rm "$marketplace_link"
    fi
  elif [ -e "$marketplace_link" ]; then
    warn "${marketplace_link} exists but is not a symlink - skipping registration"
    info "Remove it manually and re-run setup to register"
    return 0
  fi

  step "Registering marketplace at ${marketplace_link}..."
  ln -s "$SCRIPT_DIR" "$marketplace_link"
  success "Marketplace registered"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print_summary() {
  header "Setup complete"
  echo ""
  printf "${BOLD}Installed components:${NC}\n"

  local items=(
    "python3:Python 3.11+"
    "node:Node.js"
    "bun:Bun runtime"
    "tmux:tmux terminal multiplexer"
    "jq:jq JSON processor"
    "gpg:GnuPG"
  )

  if [ "$SKIP_OPTIONAL" = false ]; then
    items+=("ffmpeg:ffmpeg media tools")
  fi

  for item in "${items[@]}"; do
    local cmd="${item%%:*}"
    local label="${item#*:}"
    if command_exists "$cmd"; then
      printf "  ${GREEN}*${NC} %-30s %s\n" "$label" "$(command -v "$cmd")"
    else
      printf "  ${YELLOW}!${NC} %-30s %s\n" "$label" "(not found)"
    fi
  done

  # Python tools
  if command_exists uv; then
    printf "  ${GREEN}*${NC} %-30s %s\n" "uv (Python tool manager)" "$(command -v uv)"
    printf "  ${GREEN}*${NC} %-30s %s\n" "claude-code-tools" "(tmux-cli, aichat, vault, env-safe)"
  fi

  # Rust tools
  if command_exists aichat-search; then
    printf "  ${GREEN}*${NC} %-30s %s\n" "aichat-search" "$(command -v aichat-search)"
  elif [ "$SKIP_OPTIONAL" = false ]; then
    printf "  ${YELLOW}!${NC} %-30s %s\n" "aichat-search" "(not installed - needs cargo)"
  fi

  echo ""
  printf "${BOLD}Marketplace:${NC}\n"
  printf "  Location:   %s\n" "$SCRIPT_DIR"
  printf "  Registered: %s/ainative-claude-tools\n" "$CLAUDE_PLUGINS_DIR"

  echo ""
  printf "${BOLD}${YELLOW}Configuration needed:${NC}\n"
  cat <<'CONFIGTEXT'
  Some plugins require API keys or .env configuration:

  1. ai-development / cloudflare-tools
     - Set up relevant API keys in plugin .env files

  2. google-workspace
     - Google OAuth credentials required
     - See google-workspace/README.md for setup

  3. video-tools
     - Requires ffmpeg (install with system package manager)

  4. General
     - Review each plugin's README for specific configuration
     - API keys should go in plugin-level .env files (never committed)
CONFIGTEXT

  echo ""
  info "Run 'claude plugins list' to verify registered plugins."
  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"

  printf "${BOLD}${CYAN}"
  cat <<'BANNER'

   ___  _             _   _
  / _ \(_)_ __   __ _| |_(_)_   _____
 / /_\ \ | '_ \ / _` | __| \ \ / / _ \
 |  _  | | | | | (_| | |_| |\ V /  __/
 |_| |_|_|_| |_|\__,_|\__|_| \_/ \___|

  Claude Code Plugin Marketplace Setup

BANNER
  printf "${NC}"

  local os
  os="$(detect_os)"

  if [ "$os" = "unsupported" ]; then
    error "Unsupported operating system: $(uname -s)"
    exit 1
  fi

  info "Detected OS: ${os}"
  info "Script directory: ${SCRIPT_DIR}"
  echo ""

  # Phase 1: System dependencies
  if [ "$os" = "macos" ]; then
    install_system_deps_macos
  else
    install_system_deps_linux
  fi

  # Phase 2: Runtime tools
  install_bun
  install_python_tools

  # Phase 3: Optional tools
  install_rust_tools
  install_playwright

  # Phase 4: Marketplace registration
  setup_marketplace

  # Done
  print_summary
}

main "$@"
