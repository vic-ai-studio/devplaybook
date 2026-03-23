#!/usr/bin/env bash
# setup-env.sh — Bootstrap local development environment
# Usage: ./scripts/setup-env.sh [--reset]
# Idempotent: safe to run multiple times

set -euo pipefail

RESET=false
[[ "${1:-}" == "--reset" ]] && RESET=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── System prerequisites ────────────────────────────────────────────────────

check_prerequisites() {
  info "Checking prerequisites..."
  local required=("node" "npm" "docker" "git")
  # CUSTOMIZE: Add tools your project needs (python, go, etc.)

  for tool in "${required[@]}"; do
    if ! command -v "$tool" &>/dev/null; then
      die "Missing required tool: $tool. Install it first."
    fi
  done

  # Node version check
  local node_version major
  node_version=$(node --version | tr -d 'v')
  major="${node_version%%.*}"
  if (( major < 18 )); then
    warn "Node.js v$node_version detected. v18+ recommended."
  fi

  success "Prerequisites OK"
}

# ─── Environment file ────────────────────────────────────────────────────────

setup_env_file() {
  if [[ ! -f ".env" ]] || $RESET; then
    if [[ -f ".env.example" ]]; then
      info "Creating .env from .env.example..."
      cp ".env.example" ".env"
      warn "Edit .env and fill in your local secrets before running the app"
    else
      warn ".env.example not found — creating minimal .env"
      cat > .env << 'EOF'
# CUSTOMIZE: Add your environment variables
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
EOF
    fi
    success ".env created"
  else
    info ".env already exists (use --reset to recreate)"
  fi
}

# ─── Docker services ─────────────────────────────────────────────────────────

start_docker_services() {
  if ! docker info &>/dev/null 2>&1; then
    warn "Docker not running — skipping local services"
    return
  fi

  if [[ -f "docker-compose.yml" ]]; then
    info "Starting Docker services..."
    if $RESET; then
      docker compose down -v 2>/dev/null || true
    fi
    docker compose up -d
    success "Docker services started"
  else
    warn "No docker-compose.yml found — skipping"
  fi
}

# ─── Dependencies ────────────────────────────────────────────────────────────

install_dependencies() {
  info "Installing Node.js dependencies..."
  if [[ -f "package-lock.json" ]]; then
    npm ci
  elif [[ -f "pnpm-lock.yaml" ]]; then
    pnpm install --frozen-lockfile
  else
    npm install
  fi
  success "Dependencies installed"
}

# ─── Database ────────────────────────────────────────────────────────────────

setup_database() {
  if [[ -f "prisma/schema.prisma" ]]; then
    info "Setting up database (Prisma)..."

    # Wait for DB to be ready
    local max_wait=30 elapsed=0
    until npx prisma db push --skip-generate &>/dev/null 2>&1 || (( elapsed >= max_wait )); do
      sleep 2
      (( elapsed += 2 ))
    done

    if (( elapsed >= max_wait )); then
      warn "Database may not be ready yet. Run 'npx prisma db push' manually."
    else
      # CUSTOMIZE: Comment out seed if not needed
      if [[ -f "prisma/seed.ts" ]] || [[ -f "prisma/seed.js" ]]; then
        npx prisma db seed 2>/dev/null || warn "Seed failed — may already be seeded"
      fi
      success "Database ready"
    fi
  fi
}

# ─── Verification ────────────────────────────────────────────────────────────

verify_setup() {
  info "Verifying setup..."
  local issues=()

  [[ ! -f ".env" ]] && issues+=("Missing .env file")

  if [[ ${#issues[@]} -gt 0 ]]; then
    warn "Setup warnings:"
    for issue in "${issues[@]}"; do
      echo "  - $issue"
    done
  else
    success "Setup verified"
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo "=== Local Environment Setup ==="
  $RESET && warn "RESET mode — recreating environment"
  echo ""

  check_prerequisites
  setup_env_file
  install_dependencies
  start_docker_services
  setup_database
  verify_setup

  echo ""
  success "=== Setup complete! ==="
  echo ""
  echo "  Start dev server:  npm run dev"
  echo "  Run tests:         npm test"
  echo "  View logs:         docker compose logs -f"
  echo ""
}

main "$@"
