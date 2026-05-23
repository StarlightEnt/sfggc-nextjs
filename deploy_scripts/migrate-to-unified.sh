#!/bin/bash
# migrate-to-unified.sh - One-time migration from dual-build to unified server mode
#
# This script cleans up stale static site files from the web root that were
# deployed by the old static rsync process. The portal-app directory is left
# untouched — it becomes the sole application directory.
#
# Usage:
#   ./deploy_scripts/migrate-to-unified.sh [--dry-run]
#
# Prerequisites:
#   - .deployrc or .deployrc.example must be configured
#   - portal-app/.env.local must exist on server
#   - New nginx vhost config must be pasted into CloudPanel AFTER this script runs
#
# After running this script:
#   1. Paste new vhost.txt into CloudPanel (cat backend/config/vhost.txt | pbcopy)
#   2. Run: ./deploy_scripts/deploy.sh --yes
#   3. Verify: https://www.goldengateclassic.org/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source required libraries
source "$SCRIPT_DIR/lib/output.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/ssh.sh"

DRY_RUN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

export DRY_RUN VERBOSE

# Load configuration
load_config ".deployrc"
set_defaults

# Backward compat for old .deployrc files
if [ -n "${DEPLOY_PORTAL_PATH:-}" ] && [ -z "${DEPLOY_APP_PATH:-}" ]; then
  DEPLOY_APP_PATH="$DEPLOY_PORTAL_PATH"
fi

# Derive web root from app path (parent of portal-app)
WEB_ROOT=$(dirname "$DEPLOY_APP_PATH")

log_section "MIGRATION: Dual-Build → Unified Server Mode"
echo ""
log_info "Web root:  $WEB_ROOT"
log_info "App path:  $DEPLOY_APP_PATH"
echo ""

if [ "$DRY_RUN" = true ]; then
  log_warn "DRY RUN MODE - No changes will be made"
  echo ""
fi

# Step 1: Verify .env.local exists (safety check)
log_step "Verifying portal-app/.env.local exists"
if [ "$DRY_RUN" = true ]; then
  log_dry_run "Would check ${DEPLOY_APP_PATH}/.env.local"
else
  if ssh_command "[ -f ${DEPLOY_APP_PATH}/.env.local ]" 2>/dev/null; then
    log_success ".env.local found — secrets are safe"
  else
    log_error ".env.local NOT found at ${DEPLOY_APP_PATH}/.env.local"
    log_error "Aborting migration to prevent data loss"
    exit 1
  fi
fi

# Step 2: List stale static files
log_step "Finding stale static site files in web root"
if [ "$DRY_RUN" = true ]; then
  log_dry_run "Would list files in $WEB_ROOT (excluding portal-app/)"
  # Show what would be found
  ssh_command "cd $WEB_ROOT && find . -maxdepth 1 -not -name portal-app -not -name '.' | sort" 2>/dev/null || true
else
  STALE_FILES=$(ssh_command "cd $WEB_ROOT && find . -maxdepth 1 -not -name portal-app -not -name '.' | sort" 2>/dev/null || echo "")
  if [ -z "$STALE_FILES" ]; then
    log_info "No stale files found — web root is already clean"
  else
    log_info "Found stale files:"
    echo "$STALE_FILES" | sed 's/^/  /'
  fi
fi

# Step 3: Back up stale files
log_step "Backing up stale files"
BACKUP_DIR="${WEB_ROOT}_static_backup_$(date +%Y%m%d_%H%M%S)"
if [ "$DRY_RUN" = true ]; then
  log_dry_run "Would create backup at $BACKUP_DIR"
else
  if [ -n "$STALE_FILES" ]; then
    ssh_command "mkdir -p $BACKUP_DIR"
    # Move everything except portal-app to backup
    ssh_command "cd $WEB_ROOT && find . -maxdepth 1 -not -name portal-app -not -name '.' -exec mv {} $BACKUP_DIR/ \;"
    log_success "Backup created at $BACKUP_DIR"
  else
    log_info "Nothing to back up"
  fi
fi

# Step 4: Verify PM2 still running
log_step "Verifying PM2 process"
PM2_APP="${DEPLOY_PM2_APP_NAME:-sfggc-portal}"
if [ "$DRY_RUN" = true ]; then
  log_dry_run "Would check PM2 status for $PM2_APP"
else
  PM2_STATUS=$(ssh_command "pm2 describe $PM2_APP 2>&1 | head -5" || echo "not found")
  if echo "$PM2_STATUS" | grep -q "online"; then
    log_success "PM2 process '$PM2_APP' is online"
  else
    log_warn "PM2 process '$PM2_APP' may not be running"
    log_info "This is OK — the next deploy will start it"
  fi
fi

# Step 5: Summary
echo ""
log_section "MIGRATION COMPLETE"
echo ""
if [ "$DRY_RUN" = true ]; then
  log_info "Dry run finished. No changes were made."
  log_info "Run without --dry-run to execute."
else
  log_success "Stale static files moved to backup"
  log_info ""
  log_info "Next steps:"
  log_info "  1. Paste new nginx config into CloudPanel:"
  log_info "     cat backend/config/vhost.txt | pbcopy"
  log_info "  2. Deploy the unified application:"
  log_info "     ./deploy_scripts/deploy.sh --yes"
  log_info "  3. Verify the site:"
  log_info "     https://${DEPLOY_DOMAIN}"
  log_info ""
  log_info "If something goes wrong, restore the backup:"
  log_info "  ssh ${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST} 'cp -r ${BACKUP_DIR}/* ${WEB_ROOT}/'"
fi
