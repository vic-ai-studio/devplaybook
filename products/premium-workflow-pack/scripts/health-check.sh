#!/usr/bin/env bash
# health-check.sh — Check health of all services in an environment
# Usage: ./scripts/health-check.sh [environment] [--watch]
#   ./scripts/health-check.sh production
#   ./scripts/health-check.sh staging --watch   (continuous monitoring)

set -euo pipefail

ENVIRONMENT="${1:-staging}"
WATCH_MODE=false
[[ "${2:-}" == "--watch" ]] && WATCH_MODE=true

INTERVAL=30  # CUSTOMIZE: seconds between checks in watch mode

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS="${GREEN}PASS${NC}"; FAIL="${RED}FAIL${NC}"; WARN="${YELLOW}WARN${NC}"

# ─── Service definitions ─────────────────────────────────────────────────────
# CUSTOMIZE: Add/remove services for your environment

declare -A STAGING_SERVICES=(
  ["API Gateway"]="http://staging.example.com/health"
  ["User Service"]="http://user-svc.staging.internal/health"
  ["Order Service"]="http://order-svc.staging.internal/health"
)

declare -A PRODUCTION_SERVICES=(
  ["API Gateway"]="https://api.example.com/health"
  ["User Service"]="http://user-svc.prod.internal/health"
  ["Order Service"]="http://order-svc.prod.internal/health"
  ["Payment Service"]="http://payment-svc.prod.internal/health"
)

# ─── Individual check ────────────────────────────────────────────────────────

check_service() {
  local name="$1" url="$2"
  local start_ms
  start_ms=$(date +%s%3N)

  local response http_code body
  response=$(curl -s -o /tmp/hc_body -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  body=$(cat /tmp/hc_body 2>/dev/null || echo "")
  local duration_ms=$(( $(date +%s%3N) - start_ms ))

  local status_icon
  if [[ "$response" == "200" ]]; then
    status_icon="$PASS"
  elif [[ "$response" =~ ^[45] ]]; then
    status_icon="$FAIL"
  else
    status_icon="$WARN"
  fi

  printf "  %-22s %b  HTTP %-3s  %4dms\n" "$name" "$status_icon" "$response" "$duration_ms"

  [[ "$response" == "200" ]]
}

# ─── Run all checks ──────────────────────────────────────────────────────────

run_checks() {
  local -n services=$1
  local failed=0

  echo ""
  echo -e "${BLUE}Environment: $ENVIRONMENT${NC}  $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "─────────────────────────────────────────────"
  printf "  %-22s %-6s  %-8s  %s\n" "Service" "Status" "HTTP" "Latency"
  echo "─────────────────────────────────────────────"

  for name in "${!services[@]}"; do
    check_service "$name" "${services[$name]}" || (( failed++ ))
  done

  echo "─────────────────────────────────────────────"
  if (( failed == 0 )); then
    echo -e "  ${GREEN}All ${#services[@]} services healthy${NC}"
  else
    echo -e "  ${RED}$failed / ${#services[@]} services FAILING${NC}"
  fi
  echo ""

  return $failed
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  local services_var
  case "$ENVIRONMENT" in
    production) services_var="PRODUCTION_SERVICES" ;;
    staging)    services_var="STAGING_SERVICES" ;;
    *)          echo "Unknown environment: $ENVIRONMENT"; exit 1 ;;
  esac

  if $WATCH_MODE; then
    echo "Watch mode — checking every ${INTERVAL}s (Ctrl+C to stop)"
    while true; do
      clear
      run_checks "$services_var" || true
      sleep "$INTERVAL"
    done
  else
    run_checks "$services_var"
  fi
}

main "$@"
