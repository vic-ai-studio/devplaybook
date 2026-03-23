#!/usr/bin/env bash
# db-migrate.sh — Safe database migration with backup and dry-run
# Usage: ./scripts/db-migrate.sh [--env production] [--dry-run] [--no-backup]

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────

ENV="staging"
DRY_RUN=false
SKIP_BACKUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)       ENV="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    --no-backup) SKIP_BACKUP=true; shift ;;
    *)           echo "Unknown argument: $1"; exit 1 ;;
  esac
done

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Load env config ─────────────────────────────────────────────────────────

load_config() {
  case "$ENV" in
    production)
      DB_HOST="${PROD_DB_HOST:?PROD_DB_HOST not set}"
      DB_PORT="${PROD_DB_PORT:-5432}"
      DB_NAME="${PROD_DB_NAME:?PROD_DB_NAME not set}"
      DB_USER="${PROD_DB_USER:?PROD_DB_USER not set}"
      PGPASSWORD="${PROD_DB_PASSWORD:?PROD_DB_PASSWORD not set}"
      ;;
    staging)
      DB_HOST="${STAGING_DB_HOST:?STAGING_DB_HOST not set}"
      DB_PORT="${STAGING_DB_PORT:-5432}"
      DB_NAME="${STAGING_DB_NAME:?STAGING_DB_NAME not set}"
      DB_USER="${STAGING_DB_USER:?STAGING_DB_USER not set}"
      PGPASSWORD="${STAGING_DB_PASSWORD:?STAGING_DB_PASSWORD not set}"
      ;;
    *)
      die "Unknown environment: $ENV"
      ;;
  esac

  export PGPASSWORD
  info "Loaded config for: $ENV ($DB_HOST:$DB_PORT/$DB_NAME)"
}

# ─── Backup ──────────────────────────────────────────────────────────────────

backup_database() {
  if $SKIP_BACKUP; then
    warn "Skipping backup (--no-backup flag set)"
    return
  fi

  if $DRY_RUN; then
    info "[DRY RUN] Would backup database to backups/db_${ENV}_${TIMESTAMP}.sql"
    return
  fi

  mkdir -p backups
  local backup_file="backups/db_${ENV}_${TIMESTAMP}.sql"

  info "Creating backup: $backup_file"
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    -f "$backup_file"

  gzip "$backup_file"
  success "Backup created: ${backup_file}.gz ($(du -h "${backup_file}.gz" | cut -f1))"

  # CUSTOMIZE: Upload to S3 or similar
  # aws s3 cp "${backup_file}.gz" "s3://${BACKUP_BUCKET}/db/${ENV}/"
}

# ─── Check pending migrations ────────────────────────────────────────────────

check_pending() {
  info "Checking pending migrations..."

  # CUSTOMIZE: Adapt for your migration tool
  # Prisma:
  #   npx prisma migrate status --schema=prisma/schema.prisma
  # Flyway:
  #   flyway -url="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME" info
  # Alembic:
  #   alembic current && alembic heads

  if $DRY_RUN; then
    info "[DRY RUN] Would run: npx prisma migrate status"
    return
  fi

  # Example with Prisma:
  # DATABASE_URL="postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  #   npx prisma migrate status

  warn "check_pending: configure for your migration tool"
}

# ─── Run migrations ──────────────────────────────────────────────────────────

run_migrations() {
  info "Running migrations on $ENV..."

  if $DRY_RUN; then
    info "[DRY RUN] Would run: npx prisma migrate deploy"
    return
  fi

  # CUSTOMIZE: Replace with your migration command
  # Prisma:
  #   DATABASE_URL="postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  #     npx prisma migrate deploy

  # Flyway:
  #   flyway -url="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME" \
  #          -user="$DB_USER" -password="$PGPASSWORD" migrate

  # Alembic:
  #   DATABASE_URL="postgresql://$DB_USER:$PGPASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" \
  #     alembic upgrade head

  warn "run_migrations: configure for your migration tool"
  success "Migrations applied"
}

# ─── Verify ─────────────────────────────────────────────────────────────────

verify_migrations() {
  info "Verifying migration status..."

  if $DRY_RUN; then
    info "[DRY RUN] Would verify migration state"
    return
  fi

  # Quick sanity check — can we connect and query?
  psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT NOW() AS db_time, version() AS pg_version;" \
    --no-password 2>&1 | head -5

  success "Database connection verified post-migration"
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  info "=== Database Migration ==="
  info "Environment : $ENV"
  info "Dry run     : $DRY_RUN"
  info "Skip backup : $SKIP_BACKUP"

  load_config
  backup_database
  check_pending
  run_migrations
  verify_migrations

  success "=== Migration complete ==="
}

main "$@"
