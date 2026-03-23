#!/usr/bin/env bash
# deploy.sh — Production deployment script
# Usage: ./scripts/deploy.sh [environment] [--dry-run]
#
# CUSTOMIZE: Set your environment-specific variables below
# Supports: staging | production

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/deploy_${TIMESTAMP}.log"

# CUSTOMIZE: Set your defaults
ENVIRONMENT="${1:-staging}"
DRY_RUN=false
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=true

# ─── Colors ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[OK]${NC} $*"   | tee -a "$LOG_FILE"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"  | tee -a "$LOG_FILE" >&2; }
die()     { error "$*"; exit 1; }

# ─── Validation ─────────────────────────────────────────────────────────────

validate_environment() {
  case "$ENVIRONMENT" in
    staging|production) info "Target environment: $ENVIRONMENT" ;;
    *) die "Invalid environment: '$ENVIRONMENT'. Use: staging | production" ;;
  esac

  # CUSTOMIZE: Check required env vars for your environment
  local required_vars=("APP_VERSION" "REGISTRY_URL")
  for var in "${required_vars[@]}"; do
    [[ -z "${!var:-}" ]] && die "Required environment variable not set: $var"
  done
}

check_prerequisites() {
  info "Checking prerequisites..."
  local tools=("docker" "git" "curl")
  for tool in "${tools[@]}"; do
    command -v "$tool" &>/dev/null || die "Required tool not found: $tool"
  done

  # Ensure working tree is clean
  if [[ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]]; then
    warn "Working tree has uncommitted changes. Proceeding anyway..."
  fi
}

# ─── Build ───────────────────────────────────────────────────────────────────

build_image() {
  local image_tag="${REGISTRY_URL}/myapp:${APP_VERSION}"
  info "Building Docker image: $image_tag"

  if $DRY_RUN; then
    info "[DRY RUN] Would build: docker build -t $image_tag ."
    return
  fi

  docker build \
    -t "$image_tag" \
    --build-arg APP_VERSION="$APP_VERSION" \
    --build-arg BUILD_DATE="$TIMESTAMP" \
    -f "$PROJECT_ROOT/Dockerfile" \
    "$PROJECT_ROOT" 2>&1 | tee -a "$LOG_FILE"

  docker push "$image_tag" 2>&1 | tee -a "$LOG_FILE"
  success "Image built and pushed: $image_tag"
}

# ─── Deploy ──────────────────────────────────────────────────────────────────

deploy() {
  info "Deploying to $ENVIRONMENT..."

  if $DRY_RUN; then
    info "[DRY RUN] Would deploy version $APP_VERSION to $ENVIRONMENT"
    return
  fi

  # CUSTOMIZE: Replace with your actual deploy command
  # Examples:
  #   kubectl set image deployment/app app="${REGISTRY_URL}/myapp:${APP_VERSION}" -n "$ENVIRONMENT"
  #   aws ecs update-service --cluster my-cluster --service my-service --force-new-deployment
  #   helm upgrade myapp ./helm --set image.tag="$APP_VERSION" -n "$ENVIRONMENT"
  warn "Deploy command not configured. Set in scripts/deploy.sh:deploy()"
}

# ─── Health Check ────────────────────────────────────────────────────────────

health_check() {
  # CUSTOMIZE: Set your health check URL per environment
  local health_url
  case "$ENVIRONMENT" in
    staging)    health_url="${STAGING_URL:-http://staging.example.com}/health" ;;
    production) health_url="${PRODUCTION_URL:-http://example.com}/health" ;;
  esac

  info "Waiting for health check: $health_url"
  local max_attempts=20
  local attempt=0

  while (( attempt < max_attempts )); do
    (( attempt++ ))
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$health_url" 2>/dev/null || echo "000")

    if [[ "$status" == "200" ]]; then
      success "Health check passed (attempt $attempt/$max_attempts)"
      return 0
    fi

    warn "Attempt $attempt/$max_attempts — status $status. Retrying in 10s..."
    sleep 10
  done

  error "Health check failed after $max_attempts attempts"
  return 1
}

# ─── Notify ──────────────────────────────────────────────────────────────────

notify_slack() {
  local status="$1" message="$2"
  [[ -z "${SLACK_WEBHOOK_URL:-}" ]] && return

  local emoji
  [[ "$status" == "success" ]] && emoji="✅" || emoji="🔴"

  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"${emoji} *Deploy ${status}* — ${ENVIRONMENT} — v${APP_VERSION}\\n${message}\"}" \
    &>/dev/null || true
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  info "=== Deployment started ==="
  info "Environment : $ENVIRONMENT"
  info "Version     : ${APP_VERSION:-NOT SET}"
  info "Dry run     : $DRY_RUN"
  info "Log file    : $LOG_FILE"

  $DRY_RUN && warn "DRY RUN MODE — no changes will be made"

  validate_environment
  check_prerequisites
  build_image
  deploy

  if ! health_check; then
    notify_slack "failed" "Health check failed after deploy"
    die "Deployment failed — health check did not pass"
  fi

  notify_slack "success" "Deployed successfully in ${SECONDS}s"
  success "=== Deployment complete in ${SECONDS}s ==="
}

main "$@"
