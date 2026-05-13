#!/bin/bash

# Reproducible build script for PlaySharp FastAPI backend Lambda deployment package
# Ensures clean, consistent packaging without stale artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../../../backend" && pwd)"
DEPLOY_ZIP="$SCRIPT_DIR/playsharp-backend.zip"

echo "🔨 Building PlaySharp backend Lambda deployment package..."

# Clean previous build artifacts
if [ -f "$DEPLOY_ZIP" ]; then
  echo "  Removing old deployment zip..."
  rm -f "$DEPLOY_ZIP"
fi

# Move into backend directory
cd "$BACKEND_DIR"

echo "  Cleaning Python cache artifacts..."

# Remove Python cache folders/files before packaging
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

echo "  Packaging backend application code..."

# Create deployment zip
zip -r "$DEPLOY_ZIP" . \
  -x '*.pyc' \
     '*__pycache__*' \
     '.pytest_cache/*' \
     '.venv/*' \
     'venv/*' \
     'tests/*' \
     'scripts/*' \
     '*.egg-info/*' \
     '.git/*' \
     '*.zip' \
  > /dev/null 2>&1

echo "  Verifying package contents..."

# Verify no unwanted artifacts exist
if unzip -l "$DEPLOY_ZIP" | grep -qE '(__pycache__/|\.pytest_cache/|layers/)'; then
  echo ""
  echo "❌ ERROR: Found unwanted artifacts in deployment package"
  echo ""

  unzip -l "$DEPLOY_ZIP" | grep -E '(__pycache__/|\.pytest_cache/|layers/)'

  exit 1
fi

ZIP_SIZE=$(du -h "$DEPLOY_ZIP" | cut -f1)
ZIP_FILES=$(unzip -l "$DEPLOY_ZIP" | grep -c '^')

echo ""
echo "✅ Backend deployment package built successfully!"
echo "   Location: $DEPLOY_ZIP"
echo "   Size: $ZIP_SIZE"
echo "   Files: $ZIP_FILES"
echo ""

echo "📦 Key packaged files:"
unzip -l "$DEPLOY_ZIP" | \
  grep -E '\.py$|routes/|services/|models/' | \
  sed 's/^/   /'

echo ""
echo "🚀 Next steps:"
echo "   1. Deploy updated zip"
echo "   2. Ensure Lambda env vars exist:"
echo "        - MONGODB_URI"
echo "        - DB_NAME"
echo "   3. Trigger API endpoint and inspect CloudWatch logs"
echo ""