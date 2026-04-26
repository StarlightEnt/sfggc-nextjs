#!/bin/bash
# SFGGC Deployment Script
#
# Deploys the application (static pages + portal) to production server.
# Everything runs through a single Next.js server managed by PM2.
#
# Usage:
#   ./deploy_scripts/deploy.sh [OPTIONS]
#
# Options:
#   --dry-run         Show what would happen without executing
#   --verbose         Show detailed dry-run output (with --dry-run)
#   --debug           Show full debug output (with --dry-run)
#   --config FILE     Use alternate config file (default: .deployrc)
#   --server HOST     Override SSH host
#   --user USER       Override SSH user
#   -y, --yes         Skip confirmation prompts (auto-confirm deployment)
#   --setup           Force environment reconfiguration (recreates .env.local)
#   --skip-migrations Skip database migrations (not recommended)
#   -h, --help        Show this help
#
# Examples:
#   # Deploy application
#   ./deploy_scripts/deploy.sh
#
#   # Deploy with auto-confirmation
#   ./deploy_scripts/deploy.sh --yes
#
#   # Dry run with details
#   ./deploy_scripts/deploy.sh --dry-run --verbose
#
#   # Force environment reconfiguration (recover from broken .env.local)
#   ./deploy_scripts/deploy.sh --setup

set -euo pipefail

# ─── Get script directory ────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Source function libraries ───────────────────────────────────────────────

source "$SCRIPT_DIR/lib/output.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/ssh.sh"
source "$SCRIPT_DIR/lib/validation.sh"
source "$SCRIPT_DIR/lib/build.sh"
source "$SCRIPT_DIR/lib/deploy-app.sh"

# ─── Default values ──────────────────────────────────────────────────────────

DRY_RUN=false
VERBOSE=false
DEBUG=false
FORCE=false
FORCE_SETUP=false
SKIP_MIGRATIONS=false
CONFIG_FILE=".deployrc"

CLI_SSH_HOST=""
CLI_SSH_USER=""
CLI_APP_PATH=""

# ─── Help function ───────────────────────────────────────────────────────────

show_help() {
  cat << 'EOF'
SFGGC Deployment Script

Usage:
  ./deploy_scripts/deploy.sh [OPTIONS]

Options:
  --dry-run         Show what would happen without executing
  --verbose         Show detailed dry-run output (with --dry-run)
  --debug           Show full debug output (with --dry-run)
  --config FILE     Use alternate config file (default: .deployrc)
  --server HOST     Override SSH host
  --user USER       Override SSH user
  -y, --yes         Skip confirmation prompts (auto-confirm deployment)
  --setup           Force environment reconfiguration (recreates .env.local)
  --skip-migrations Skip database migrations (not recommended)
  -h, --help        Show this help

Examples:
  # Deploy application
  ./deploy_scripts/deploy.sh

  # Deploy with auto-confirmation
  ./deploy_scripts/deploy.sh --yes

  # Dry run with details
  ./deploy_scripts/deploy.sh --dry-run --verbose

  # Force environment reconfiguration (recover from broken .env.local)
  ./deploy_scripts/deploy.sh --setup

Configuration:
  Create .deployrc from .deployrc.example for default settings:
    cp .deployrc.example .deployrc
    # Edit .deployrc with your values
    chmod 600 .deployrc

For more information, see:
  deploy_docs/UNIFIED_DEPLOYMENT.md
EOF
}

# ─── Parse arguments ─────────────────────────────────────────────────────────

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --static)
        log_error "The --static flag is no longer supported."
        log_error "The application now deploys as a unified Next.js server."
        log_error "Just run: ./deploy_scripts/deploy.sh"
        exit 1
        ;;
      --all)
        log_error "The --all flag is no longer supported."
        log_error "The application now deploys as a unified Next.js server."
        log_error "Just run: ./deploy_scripts/deploy.sh"
        exit 1
        ;;
      --portal)
        # Accepted for backward compatibility (app mode is the default)
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --debug)
        DEBUG=true
        VERBOSE=true  # Debug implies verbose
        shift
        ;;
      --config)
        CONFIG_FILE="$2"
        shift 2
        ;;
      --server)
        CLI_SSH_HOST="$2"
        shift 2
        ;;
      --user)
        CLI_SSH_USER="$2"
        shift 2
        ;;
      -y|--yes|--force)
        FORCE=true
        shift
        ;;
      --setup)
        FORCE_SETUP=true
        shift
        ;;
      --skip-migrations)
        SKIP_MIGRATIONS=true
        shift
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
    esac
  done

  # Export for use in sourced scripts
  export DRY_RUN VERBOSE DEBUG FORCE FORCE_SETUP SKIP_MIGRATIONS
}

# ─── Determine deployment mode ───────────────────────────────────────────────

determine_mode() {
  echo "app"
}

# ─── Main execution ──────────────────────────────────────────────────────────

main() {
  local start_time=$(date +%s)

  # Parse command line arguments
  parse_arguments "$@"

  # Determine deployment mode
  local mode=$(determine_mode)
  export DEPLOY_MODE="$mode"

  # Load configuration
  load_config "$CONFIG_FILE"

  # Set defaults for missing values
  set_defaults

  # Apply CLI overrides
  override_from_cli

  # Validate configuration
  validate_config

  # Show deployment plan
  show_deployment_plan "$mode"

  # Show debug config if enabled
  if [ "$DEBUG" = true ]; then
    show_config
  fi

  # Confirm if not forced and not dry-run
  if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
    confirm_deployment || exit 0
  fi

  # Run pre-flight checks
  if [ "$DRY_RUN" != true ]; then
    run_all_checks "$mode" || exit 1
  fi

  # Deploy application
  deploy_app || exit 1

  # Show final summary
  echo ""
  log_section "DEPLOYMENT COMPLETE"
  log_elapsed_time "$start_time"

  if [ -n "${DEPLOY_DOMAIN:-}" ]; then
    echo ""
    log_info "Your deployment is available at:"
    log_info "  https://${DEPLOY_DOMAIN}"
  fi

  echo ""
}

# Run main with all arguments
main "$@"
