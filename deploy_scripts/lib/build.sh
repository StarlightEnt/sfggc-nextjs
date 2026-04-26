#!/bin/bash
# build.sh - Build orchestration for Next.js application

# write_server_mode_config - Write next.config.js for server mode
# Extracted to single function to prevent template drift between callers.
# See MEMORY.md: "Deploy Script Server-Mode Config Missing compress:false"
write_server_mode_config() {
  cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
EOF
}

# build_local - Build application locally (for testing)
build_local() {
  log_section "BUILDING APPLICATION"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would run: npm run build"
    return 0
  fi

  log_step "Running npm run build"
  if npm run build; then
    log_success "Build completed successfully"
  else
    log_error "Build failed"
    exit 1
  fi

  validate_next_build
}

# validate_next_build - Check build output
validate_next_build() {
  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would validate .next/ directory"
    return 0
  fi

  if [ ! -d ".next" ]; then
    log_error "Build output directory '.next/' not found"
    return 1
  fi

  log_success "Build output validated"
  return 0
}

# install_dependencies - Run npm install
install_dependencies() {
  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would run: npm install"
    return 0
  fi

  if [ ! -d "node_modules" ]; then
    log_step "Installing dependencies"
    npm install
  else
    log_info "Dependencies already installed"
  fi
}
