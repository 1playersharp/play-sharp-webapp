#!/bin/bash

# Reproducible build script for PlaySmart FastAPI backend Lambda deployment package
# Ensures clean, consistent packaging without stale artifacts or legacy dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../../../backend" && pwd)"
DEPLOY_ZIP="$SCRIPT_DIR/playsharp-backend.zip"

echo "🔨 Building PlaySmart backend Lambda deployment package..."

# Clean previous build artifacts
if [ -f "$DEPLOY_ZIP" ]; then
  echo "  Removing old deployment zip..."
  rm -f "$DEPLOY_ZIP"
fi

# Create fresh deployment zip from backend source
echo "  Packaging backend application code..."
cd "$BACKEND_DIR"
zip -r "$DEPLOY_ZIP" . \
  -x '*.pyc' \
     '*__pycache__*' \
     '.pytest_cache' \
     '.venv/*' \
     'venv/*' \
     '.env' \
     'tests/*' \
     'scripts/*' \
     '*.egg-info/*' \
     '.git/*' \
     '*.zip' \
  > /dev/null 2>&1

# Verify package contents
echo "  Verifying package contents..."
ZIP_FILES=$(unzip -l "$DEPLOY_ZIP" | grep -c "^" || true)

# Check for legacy/problematic content
MONGO_CHECK=$(unzip -l "$DEPLOY_ZIP" | grep -iE 'pymongo|motor|mongo' | wc -l)
LAYER_CHECK=$(unzip -l "$DEPLOY_ZIP" | grep -E '^.*layers/' | wc -l)
CACHE_CHECK=$(unzip -l "$DEPLOY_ZIP" | grep -E '(__pycache__|\.pytest_cache)' | wc -l)

if [ "$MONGO_CHECK" -gt 0 ]; then
  echo "❌ ERROR: Found MongoDB-related files in deployment package"
  exit 1
fi

if [ "$LAYER_CHECK" -gt 0 ]; then
  echo "❌ ERROR: Found layer artifacts in deployment package"
  exit 1
fi

if [ "$CACHE_CHECK" -gt 0 ]; then
  echo "❌ ERROR: Found cache artifacts in deployment package"
  exit 1
fi

echo ""
echo "✅ Backend deployment package built successfully!"
echo "   Location: $DEPLOY_ZIP"
echo "   Size: $(du -h "$DEPLOY_ZIP" | cut -f1)"
echo "   Files: $ZIP_FILES"
echo ""
echo "Package contents:"
unzip -l "$DEPLOY_ZIP" | grep -E '\.py$|routes/|services/|models/' | sed 's/^/   /'
echo ""
echo "Next steps:"
echo "  1. Verify: unzip -l $DEPLOY_ZIP"
echo "  2. Deploy: terraform apply"
