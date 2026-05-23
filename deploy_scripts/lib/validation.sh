#!/bin/bash
# validation.sh - Pre-flight checks before deployment

# check_local_environment - Verify local environment is ready
check_local_environment() {
  log_subsection "Local Environment"

  # Check Node.js
  if command -v node >/dev/null 2>&1; then
    local node_version=$(node --version)
    log_success "Node.js $node_version"
  else
    log_error "Node.js not found"
    log_info "Install Node.js from https://nodejs.org/"
    return 1
  fi

  # Check npm
  if command -v npm >/dev/null 2>&1; then
    local npm_version=$(npm --version)
    log_success "npm $npm_version"
  else
    log_error "npm not found"
    return 1
  fi

  # Check git
  if command -v git >/dev/null 2>&1; then
    log_success "git $(git --version | cut -d' ' -f3)"
  else
    log_warn "git not found (optional)"
  fi

  # Check git repository status (if in a git repo)
  if [ -d ".git" ]; then
    if git diff-index --quiet HEAD -- 2>/dev/null; then
      log_success "Git repository clean"
    else
      log_warn "Uncommitted changes in git repository"
    fi
  fi

  return 0
}

# check_build_output - Validate project is ready for deployment
check_build_output() {
  local mode="$1"

  log_subsection "Build Output"

  # Application builds on server, but check package.json exists locally
  if [ -f "package.json" ]; then
    log_success "package.json found"
  else
    log_error "package.json not found"
    return 1
  fi

  return 0
}

# check_ssh_access - Verify SSH connection works
check_ssh_access() {
  log_subsection "SSH Connection"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would test SSH connection to ${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}"
    return 0
  fi

  # Test SSH connection
  if ssh -o BatchMode=yes -o ConnectTimeout=10 "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" 'exit' 2>/dev/null; then
    log_success "SSH connection successful"
  else
    log_error "SSH connection failed to ${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}"
    log_info "Ensure SSH key authentication is set up:"
    log_info "  ./deploy_scripts/setup-ssh.sh ${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST} server-alias"
    return 1
  fi

  return 0
}

# check_server_environment - Verify server environment
check_server_environment() {
  local mode="$1"

  log_subsection "Server Environment"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would check server environment"
    return 0
  fi

  # Check app path exists or can be created
  if ssh "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" "[ -d \"$DEPLOY_APP_PATH\" ] || mkdir -p \"$DEPLOY_APP_PATH\" 2>/dev/null" 2>/dev/null; then
    log_success "App path accessible: $DEPLOY_APP_PATH"
  else
    log_error "Cannot access app path: $DEPLOY_APP_PATH"
    return 1
  fi

  # Check if Node.js is installed on server
  if ssh "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" "command -v node >/dev/null 2>&1" 2>/dev/null; then
    local remote_node_version=$(ssh "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" "node --version" 2>/dev/null)
    log_success "Node.js available on server: $remote_node_version"
  else
    log_warn "Node.js not found on server (required for application)"
  fi

  # Check disk space on server
  local disk_space=$(ssh "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" "df -h ~ | tail -1 | awk '{print \$4}'" 2>/dev/null)
  if [ -n "$disk_space" ]; then
    log_success "Disk space available: $disk_space"
  fi

  return 0
}

# run_all_checks - Run all pre-flight checks
run_all_checks() {
  local mode="$1"

  log_section "PRE-FLIGHT CHECKS"

  local errors=0

  check_local_environment || ((errors++))
  check_build_output "$mode" || ((errors++))
  check_ssh_access || ((errors++))
  check_server_environment "$mode" || ((errors++))

  if [ $errors -gt 0 ]; then
    echo ""
    log_error "Pre-flight checks failed with $errors error(s)"
    log_info "Please resolve the issues above before deploying"
    return 1
  fi

  echo ""
  log_success "All pre-flight checks passed"
  return 0
}
