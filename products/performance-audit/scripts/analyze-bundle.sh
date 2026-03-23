#!/usr/bin/env bash
#
# Bundle Size Analysis Script
#
# Analyzes JavaScript and CSS bundle sizes, tracks changes over time,
# and warns when sizes exceed budgets.
#
# Usage:
#   ./analyze-bundle.sh                    # Analyze ./dist or ./build
#   ./analyze-bundle.sh ./out              # Analyze custom directory
#   ./analyze-bundle.sh ./dist --save      # Save results to history
#   ./analyze-bundle.sh ./dist --compare   # Compare with last saved result
#   ./analyze-bundle.sh ./dist --ci        # Exit with error if budget exceeded
#
# Requirements: bash 4+, bc, gzip (or pigz)

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
BUILD_DIR="${1:-./dist}"
MODE="${2:---analyze}"
HISTORY_FILE=".bundle-history.json"

# Budget thresholds (in KB, gzipped)
BUDGET_JS_TOTAL=200
BUDGET_CSS_TOTAL=50
BUDGET_SINGLE_CHUNK=100
BUDGET_TOTAL=500

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================================
# Helpers
# ============================================================
format_bytes() {
  local bytes=$1
  if (( bytes >= 1048576 )); then
    echo "$(echo "scale=2; $bytes / 1048576" | bc) MB"
  elif (( bytes >= 1024 )); then
    echo "$(echo "scale=1; $bytes / 1024" | bc) KB"
  else
    echo "${bytes} B"
  fi
}

get_gzip_size() {
  gzip -c "$1" 2>/dev/null | wc -c | tr -d ' '
}

get_brotli_size() {
  if command -v brotli &>/dev/null; then
    brotli -c "$1" 2>/dev/null | wc -c | tr -d ' '
  else
    echo "N/A"
  fi
}

# ============================================================
# Validation
# ============================================================
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${RED}Error: Build directory '$BUILD_DIR' not found.${NC}"
  echo "Run your build command first (e.g., npm run build)"
  exit 1
fi

# ============================================================
# Analysis
# ============================================================
echo -e "${BOLD}Bundle Size Analysis${NC}"
echo -e "Directory: ${BLUE}$BUILD_DIR${NC}"
echo "────────────────────────────────────────────────────────────"
echo ""

# Collect file data
declare -a JS_FILES=()
declare -a CSS_FILES=()
declare -a IMG_FILES=()
declare -a FONT_FILES=()
declare -a OTHER_FILES=()

TOTAL_RAW=0
TOTAL_GZIP=0
JS_RAW=0
JS_GZIP=0
CSS_RAW=0
CSS_GZIP=0
IMG_RAW=0
FONT_RAW=0
BUDGET_EXCEEDED=false

# Find and categorize files
while IFS= read -r -d '' file; do
  ext="${file##*.}"
  raw_size=$(wc -c < "$file" | tr -d ' ')
  TOTAL_RAW=$((TOTAL_RAW + raw_size))

  case "$ext" in
    js|mjs|cjs)
      gz_size=$(get_gzip_size "$file")
      JS_FILES+=("$file|$raw_size|$gz_size")
      JS_RAW=$((JS_RAW + raw_size))
      JS_GZIP=$((JS_GZIP + gz_size))
      TOTAL_GZIP=$((TOTAL_GZIP + gz_size))
      ;;
    css)
      gz_size=$(get_gzip_size "$file")
      CSS_FILES+=("$file|$raw_size|$gz_size")
      CSS_RAW=$((CSS_RAW + raw_size))
      CSS_GZIP=$((CSS_GZIP + gz_size))
      TOTAL_GZIP=$((TOTAL_GZIP + gz_size))
      ;;
    jpg|jpeg|png|gif|webp|avif|svg|ico)
      IMG_FILES+=("$file|$raw_size")
      IMG_RAW=$((IMG_RAW + raw_size))
      TOTAL_GZIP=$((TOTAL_GZIP + raw_size))
      ;;
    woff|woff2|ttf|otf|eot)
      FONT_FILES+=("$file|$raw_size")
      FONT_RAW=$((FONT_RAW + raw_size))
      TOTAL_GZIP=$((TOTAL_GZIP + raw_size))
      ;;
    *)
      gz_size=$(get_gzip_size "$file")
      OTHER_FILES+=("$file|$raw_size|$gz_size")
      TOTAL_GZIP=$((TOTAL_GZIP + gz_size))
      ;;
  esac
done < <(find "$BUILD_DIR" -type f -print0 | sort -z)

# ============================================================
# JavaScript Report
# ============================================================
echo -e "${BOLD}JavaScript Files${NC}"
echo "────────────────────────────────────────────────────────────"
printf "%-45s %10s %10s\n" "File" "Raw" "Gzipped"
echo "────────────────────────────────────────────────────────────"

# Sort JS files by gzip size (largest first)
IFS=$'\n' sorted_js=($(for f in "${JS_FILES[@]:-}"; do echo "$f"; done | sort -t'|' -k3 -rn))
unset IFS

for entry in "${sorted_js[@]:-}"; do
  [ -z "$entry" ] && continue
  IFS='|' read -r file raw gz <<< "$entry"
  filename=$(basename "$file")
  gz_kb=$(echo "scale=1; $gz / 1024" | bc)

  # Check single chunk budget
  if (( $(echo "$gz_kb > $BUDGET_SINGLE_CHUNK" | bc -l) )); then
    color=$RED
    BUDGET_EXCEEDED=true
    flag=" !! OVER BUDGET"
  elif (( $(echo "$gz_kb > $BUDGET_SINGLE_CHUNK * 0.8" | bc -l) )); then
    color=$YELLOW
    flag=" ! WARNING"
  else
    color=$GREEN
    flag=""
  fi

  printf "${color}%-45s %10s %10s${NC}%s\n" \
    "${filename:0:45}" \
    "$(format_bytes "$raw")" \
    "$(format_bytes "$gz")" \
    "$flag"
done

JS_GZIP_KB=$(echo "scale=1; $JS_GZIP / 1024" | bc)
if (( $(echo "$JS_GZIP_KB > $BUDGET_JS_TOTAL" | bc -l) )); then
  js_color=$RED
  BUDGET_EXCEEDED=true
else
  js_color=$GREEN
fi
echo "────────────────────────────────────────────────────────────"
printf "${js_color}${BOLD}%-45s %10s %10s${NC} (budget: ${BUDGET_JS_TOTAL}KB)\n" \
  "Total JavaScript (${#JS_FILES[@]} files)" \
  "$(format_bytes $JS_RAW)" \
  "$(format_bytes $JS_GZIP)"
echo ""

# ============================================================
# CSS Report
# ============================================================
echo -e "${BOLD}CSS Files${NC}"
echo "────────────────────────────────────────────────────────────"
printf "%-45s %10s %10s\n" "File" "Raw" "Gzipped"
echo "────────────────────────────────────────────────────────────"

for entry in "${CSS_FILES[@]:-}"; do
  [ -z "$entry" ] && continue
  IFS='|' read -r file raw gz <<< "$entry"
  filename=$(basename "$file")
  printf "%-45s %10s %10s\n" "${filename:0:45}" "$(format_bytes "$raw")" "$(format_bytes "$gz")"
done

CSS_GZIP_KB=$(echo "scale=1; $CSS_GZIP / 1024" | bc)
if (( $(echo "$CSS_GZIP_KB > $BUDGET_CSS_TOTAL" | bc -l) )); then
  css_color=$RED
  BUDGET_EXCEEDED=true
else
  css_color=$GREEN
fi
echo "────────────────────────────────────────────────────────────"
printf "${css_color}${BOLD}%-45s %10s %10s${NC} (budget: ${BUDGET_CSS_TOTAL}KB)\n" \
  "Total CSS (${#CSS_FILES[@]} files)" \
  "$(format_bytes $CSS_RAW)" \
  "$(format_bytes $CSS_GZIP)"
echo ""

# ============================================================
# Other Assets
# ============================================================
echo -e "${BOLD}Other Assets${NC}"
echo "────────────────────────────────────────────────────────────"
printf "%-30s %8s %12s\n" "Type" "Count" "Total Size"
echo "────────────────────────────────────────────────────────────"
printf "%-30s %8d %12s\n" "Images" "${#IMG_FILES[@]}" "$(format_bytes $IMG_RAW)"
printf "%-30s %8d %12s\n" "Fonts" "${#FONT_FILES[@]}" "$(format_bytes $FONT_RAW)"
printf "%-30s %8d %12s\n" "Other" "${#OTHER_FILES[@]}" "-"
echo ""

# ============================================================
# Summary
# ============================================================
echo -e "${BOLD}Summary${NC}"
echo "════════════════════════════════════════════════════════════"

TOTAL_GZIP_KB=$(echo "scale=1; $TOTAL_GZIP / 1024" | bc)
if (( $(echo "$TOTAL_GZIP_KB > $BUDGET_TOTAL" | bc -l) )); then
  total_color=$RED
  BUDGET_EXCEEDED=true
else
  total_color=$GREEN
fi

printf "Total page weight (raw):     %12s\n" "$(format_bytes $TOTAL_RAW)"
printf "Total page weight (gzipped): ${total_color}%12s${NC}  (budget: ${BUDGET_TOTAL}KB)\n" "$(format_bytes $TOTAL_GZIP)"
printf "JavaScript (gzipped):        ${js_color}%12s${NC}  (budget: ${BUDGET_JS_TOTAL}KB)\n" "$(format_bytes $JS_GZIP)"
printf "CSS (gzipped):               ${css_color}%12s${NC}  (budget: ${BUDGET_CSS_TOTAL}KB)\n" "$(format_bytes $CSS_GZIP)"
printf "Total files:                 %12d\n" "$((${#JS_FILES[@]} + ${#CSS_FILES[@]} + ${#IMG_FILES[@]} + ${#FONT_FILES[@]} + ${#OTHER_FILES[@]}))"
echo ""

# ============================================================
# Budget Check
# ============================================================
if [ "$BUDGET_EXCEEDED" = true ]; then
  echo -e "${RED}${BOLD}BUDGET EXCEEDED${NC}"
  echo -e "${RED}One or more bundles exceed the performance budget.${NC}"
  echo "Review the items marked '!! OVER BUDGET' above."
  echo ""

  if [ "$MODE" = "--ci" ]; then
    echo "Failing CI build due to budget violation."
    exit 1
  fi
else
  echo -e "${GREEN}${BOLD}ALL BUDGETS PASSED${NC}"
fi

# ============================================================
# Save History
# ============================================================
if [ "$MODE" = "--save" ]; then
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

  entry="{\"timestamp\":\"$timestamp\",\"commit\":\"$commit\",\"js_gzip\":$JS_GZIP,\"css_gzip\":$CSS_GZIP,\"total_gzip\":$TOTAL_GZIP,\"js_files\":${#JS_FILES[@]},\"css_files\":${#CSS_FILES[@]}}"

  if [ -f "$HISTORY_FILE" ]; then
    # Append to existing history
    tmpfile=$(mktemp)
    # Remove trailing ] and add new entry
    sed '$ s/]$/,/' "$HISTORY_FILE" > "$tmpfile"
    echo "$entry]" >> "$tmpfile"
    mv "$tmpfile" "$HISTORY_FILE"
  else
    echo "[$entry]" > "$HISTORY_FILE"
  fi

  echo ""
  echo -e "${GREEN}Results saved to $HISTORY_FILE${NC}"
fi

# ============================================================
# Compare with History
# ============================================================
if [ "$MODE" = "--compare" ] && [ -f "$HISTORY_FILE" ]; then
  echo ""
  echo -e "${BOLD}Comparison with Last Build${NC}"
  echo "────────────────────────────────────────────────────────────"

  # This is a simplified comparison — for production use, consider jq
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys

with open('$HISTORY_FILE') as f:
    history = json.load(f)

if len(history) < 2:
    print('Not enough history to compare. Run with --save first.')
    sys.exit(0)

prev = history[-2]
curr = history[-1]

def fmt(b):
    return f'{b/1024:.1f} KB'

def diff(curr, prev):
    delta = curr - prev
    pct = (delta / prev * 100) if prev > 0 else 0
    sign = '+' if delta > 0 else ''
    color = '\033[0;31m' if delta > 0 else '\033[0;32m'
    return f'{color}{sign}{fmt(delta)} ({sign}{pct:.1f}%)\033[0m'

print(f\"  JS:    {fmt(curr['js_gzip']):>12}  {diff(curr['js_gzip'], prev['js_gzip'])}\")
print(f\"  CSS:   {fmt(curr['css_gzip']):>12}  {diff(curr['css_gzip'], prev['css_gzip'])}\")
print(f\"  Total: {fmt(curr['total_gzip']):>12}  {diff(curr['total_gzip'], prev['total_gzip'])}\")
print(f\"  Comparing: {prev['commit']} -> {curr['commit']}\")
"
  else
    echo "Install Python 3 for historical comparison, or use jq."
  fi
fi

echo ""
echo "Tips:"
echo "  - Run with --save after each build to track history"
echo "  - Run with --compare to see changes since last save"
echo "  - Run with --ci in your CI pipeline to enforce budgets"
echo "  - Use 'npx source-map-explorer dist/main.*.js' for detailed treemap"
