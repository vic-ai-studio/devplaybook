#!/usr/bin/env bash
# rollback.sh — Revert to a previous deployment version
# Usage: ./scripts/rollback.sh [environment] [version]
#   ./scripts/rollback.sh production v1.2.0
#   ./scripts/rollback.sh staging  (auto-detects previous stable version)

set -euo pipefail

ENVIRONMENT="${1:-staging}"
TARGET_VERSION="${2:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Find rollback target ────────────────────────────────────────────────────

resolve_version() {
  if [[ -n "$TARGET_VERSION" ]]; then
    info "Using specified rollback target: $TARGET_VERSION"
    return
  fi

  info "Auto-detecting previous stable version..."

  # CUSTOMIZE: Adapt this to your deployment state store
  # Option 1: Read from a deploy state file
  if [[ -f ".deploy-state/${ENVIRONMENT}" ]]; then
    TARGET_VERSION=$(tail -n 2 ".deploy-state/${ENVIRONMENT}" | head -n 1)
    info "Found previous stable: $TARGET_VERSION"
    return
  fi

  # Option 2: Use git tags
  TARGET_VERSION=$(git tag -l "deployed-${ENVIRONMENT}-*" --sort=-creatordate | sed -n '2p' | sed "s/deployed-${ENVIRONMENT}-//")
  [[ -z "$TARGET_VERSION" ]] && die "Cannot auto-detect rollback version. Specify manually: ./rollback.sh $ENVIRONMENT <version>"

  info "Auto-detected rollback version: $TARGET_VERSION"
}

# ─── Confirm ────────────────────────────────────────────────────────────────

confirm_rollback() {
  echo ""
  warn "⚠️  ROLLBACK CONFIRMATION"
  warn "Environment : $ENVIRONMENT"
  warn "Rolling back to: $TARGET_VERSION"
  echo ""

  if [[ "${CI:-false}" == "true" ]]; then
    info "CI environment detected — auto-confirming"
    return
  fi

  read -rp "Continue? [y/N] " confirm
  [[ "$confirm" == [yY] ]] || die "Rollback cancelled"
}

# ─── Execute rollback ────────────────────────────────────────────────────────

execute_rollback() {
  info "Executing rollback to $TARGET_VERSION on $ENVIRONMENT..."

  # CUSTOMIZE: Replace with your actual rollback command
  # Kubernetes:
  #   kubectl rollout undo deployment/app -n "$ENVIRONMENT"
  #   kubectl set image deployment/app app="${REGISTRY_URL}/myapp:${TARGET_VERSION}" -n "$ENVIRONMENT"
  #   kubectl rollout status deployment/app -n "$ENVIRONMENT" --timeout=120s

  # ECS:
  #   PREV_TASK=$(aws ecs describe-services --cluster my-cluster --services my-service \
  #     --query 'services[0].taskDefinition' --output text)
  #   aws ecs update-service --cluster my-cluster --service my-service \
  #     --task-definition "$PREV_TASK" --force-new-deployment

  # Docker Compose:
  #   docker compose up -d --no-recreate app=myapp:$TARGET_VERSION

  warn "Rollback command not configured. Set in scripts/rollback.sh:execute_rollback()"
}

# ─── Verify ─────────────────────────────────────────────────────────────────

verify_rollback() {
  info "Verifying rollback..."
  local max_wait=120
  local elapsed=0
  local health_url

  # CUSTOMIZE: Your health check URL
  case "$ENVIRONMENT" in
    production) health_url="${PRODUCTION_URL:-http://example.com}/health" ;;
    staging)    health_url="${STAGING_URL:-http://staging.example.com}/health" ;;
  esac

  while (( elapsed < max_wait )); do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$health_url" 2>/dev/null || echo "000")
    if [[ "$status" == "200" ]]; then
      success "Service healthy after rollback ($elapsed seconds)"
      return 0
    fi
    sleep 5
    (( elapsed += 5 ))
  done

  die "Service not healthy after rollback (waited ${max_wait}s). Manual intervention required."
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  resolve_version
  confirm_rollback
  execute_rollback
  verify_rollback

  success "Rollback complete: $ENVIRONMENT → $TARGET_VERSION"

  # Notify team
  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"⏪ *Rollback complete* — ${ENVIRONMENT} rolled back to ${TARGET_VERSION}\"}" \
      &>/dev/null || true
  fi
}

main "$@"
