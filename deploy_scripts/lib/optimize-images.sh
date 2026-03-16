#!/bin/bash
# optimize-images.sh - Resize oversized source images before build
#
# Since Next.js image optimization is disabled (unoptimized: true for static export),
# source images must be pre-optimized. This script copies images to a build directory
# and resizes oversized copies using macOS built-in sips. Original source images are
# never modified.
#
# Build flow:
#   1. prepare_build_images: copies src/images → .images-build, optimizes copies
#   2. swap_images_for_build: renames src/images → .images-original, .images-build → src/images
#   3. npm run build (imports resolve from src/images as normal)
#   4. restore_images_after_build: restores src/images from .images-original

MAX_IMAGE_WIDTH=800

IMAGE_FILE_PATTERN='-type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \)'

BUILD_IMAGES_DIR=".images-build"
ORIGINAL_IMAGES_BACKUP=".images-original"

# get_image_width - Get pixel width of an image via sips
get_image_width() {
  sips -g pixelWidth "$1" 2>/dev/null | grep pixelWidth | awk '{print $2}'
}

# get_file_size - Get file size in bytes (cross-platform: macOS + Linux)
get_file_size() {
  stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null
}

# optimize_images - Find and resize oversized images in a directory (in-place)
# Usage: optimize_images [image_directory]
optimize_images() {
  local image_dir="${1:-src/images}"

  log_step "Checking for oversized images in $image_dir"

  local resized_count=0
  local total_saved=0

  while IFS= read -r img; do
    local width
    width=$(get_image_width "$img")

    [ -z "$width" ] && continue
    [ "$width" -le "$MAX_IMAGE_WIDTH" ] && continue

    if [ "${DRY_RUN:-false}" = true ]; then
      resized_count=$((resized_count + 1))
      log_dry_run "Would resize: $(basename "$img") (${width}px -> ${MAX_IMAGE_WIDTH}px)"
    else
      local size_before
      size_before=$(get_file_size "$img")

      sips --resampleWidth "$MAX_IMAGE_WIDTH" "$img" >/dev/null 2>&1

      local size_after
      size_after=$(get_file_size "$img")
      local saved=$((size_before - size_after))
      total_saved=$((total_saved + saved))
      resized_count=$((resized_count + 1))

      local saved_kb=$((saved / 1024))
      log_info "Resized: $(basename "$img") (${width}px -> ${MAX_IMAGE_WIDTH}px, saved ${saved_kb}KB)"
    fi
  done < <(eval "find \"$image_dir\" $IMAGE_FILE_PATTERN")

  if [ "$resized_count" -eq 0 ]; then
    log_success "No oversized images found"
  elif [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would resize $resized_count images"
  else
    local total_saved_kb=$((total_saved / 1024))
    log_success "Resized $resized_count images (saved ${total_saved_kb}KB total)"
  fi
}

# prepare_build_images - Copy source images to build dir and optimize copies
# Usage: prepare_build_images [source_dir]
prepare_build_images() {
  local source_dir="${1:-src/images}"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would copy $source_dir to $BUILD_IMAGES_DIR and optimize"
    optimize_images "$BUILD_IMAGES_DIR"
    return 0
  fi

  log_step "Copying images to build directory"

  # Clean previous build images
  rm -rf "$BUILD_IMAGES_DIR"

  # Copy source images preserving directory structure
  cp -R "$source_dir" "$BUILD_IMAGES_DIR"

  log_success "Copied images to $BUILD_IMAGES_DIR"

  # Optimize the copies (never touches originals)
  optimize_images "$BUILD_IMAGES_DIR"
}

# swap_images_for_build - Replace src/images with optimized copies for build
swap_images_for_build() {
  local source_dir="${1:-src/images}"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would swap $source_dir with $BUILD_IMAGES_DIR"
    return 0
  fi

  if [ ! -d "$BUILD_IMAGES_DIR" ]; then
    log_error "Build images directory $BUILD_IMAGES_DIR not found. Run prepare_build_images first."
    return 1
  fi

  log_step "Swapping source images with optimized copies"

  mv "$source_dir" "$ORIGINAL_IMAGES_BACKUP"
  mv "$BUILD_IMAGES_DIR" "$source_dir"

  log_success "Build images in place"
}

# restore_images_after_build - Restore original source images after build
restore_images_after_build() {
  local source_dir="${1:-src/images}"

  if [ "${DRY_RUN:-false}" = true ]; then
    log_dry_run "Would restore original images from $ORIGINAL_IMAGES_BACKUP"
    return 0
  fi

  if [ ! -d "$ORIGINAL_IMAGES_BACKUP" ]; then
    log_warn "No original images backup found at $ORIGINAL_IMAGES_BACKUP — nothing to restore"
    return 0
  fi

  log_step "Restoring original source images"

  # Remove the optimized copies that were in src/images during build
  rm -rf "$source_dir"

  # Restore originals
  mv "$ORIGINAL_IMAGES_BACKUP" "$source_dir"

  # Clean up build dir if it still exists
  rm -rf "$BUILD_IMAGES_DIR"

  log_success "Original images restored"
}
