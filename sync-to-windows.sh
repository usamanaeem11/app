#!/bin/bash

# ============================================================
# Sync Updated Files to Windows Directory
# ============================================================

SOURCE_DIR="/tmp/cc-agent/62089258/project"
TARGET_DIR="/mnt/c/workmonitor"

echo "🔄 Syncing updated files from project directory to /mnt/c/workmonitor..."
echo ""

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory $TARGET_DIR does not exist"
    exit 1
fi

# Copy .env file
echo "📄 Copying .env file..."
cp "$SOURCE_DIR/.env" "$TARGET_DIR/.env"

# Copy .env.example file
echo "📄 Copying .env.example file..."
cp "$SOURCE_DIR/.env.example" "$TARGET_DIR/.env.example"

# Copy updated package.json
echo "📦 Copying frontend/package.json..."
cp "$SOURCE_DIR/frontend/package.json" "$TARGET_DIR/frontend/package.json"

# Delete stale package-lock.json
echo "🗑️  Deleting stale frontend/package-lock.json..."
rm -f "$TARGET_DIR/frontend/package-lock.json"

# Copy Dockerfiles
echo "🐳 Copying Dockerfile.frontend..."
cp "$SOURCE_DIR/Dockerfile.frontend" "$TARGET_DIR/Dockerfile.frontend"

echo "🐳 Copying Dockerfile.backend..."
cp "$SOURCE_DIR/Dockerfile.backend" "$TARGET_DIR/Dockerfile.backend"

# Copy docker-compose files
echo "🐳 Copying docker-compose.yml..."
cp "$SOURCE_DIR/docker-compose.yml" "$TARGET_DIR/docker-compose.yml"

echo "🐳 Copying docker-compose.override.yml..."
cp "$SOURCE_DIR/docker-compose.override.yml" "$TARGET_DIR/docker-compose.override.yml"

# Copy documentation
echo "📚 Copying documentation..."
cp "$SOURCE_DIR/BUILD_FIX_REPORT.md" "$TARGET_DIR/BUILD_FIX_REPORT.md"
cp "$SOURCE_DIR/DOCKER_BUILD_INSTRUCTIONS.md" "$TARGET_DIR/DOCKER_BUILD_INSTRUCTIONS.md"

echo ""
echo "✅ All files synced successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. cd /mnt/c/workmonitor"
echo "   2. docker compose build --no-cache"
echo "   3. docker compose up -d"
echo ""
echo "🔍 Verify .env file:"
echo "   cat /mnt/c/workmonitor/.env | head -10"
echo ""
