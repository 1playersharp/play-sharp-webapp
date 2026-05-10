#!/bin/bash

# Build Lambda layer with Linux-compatible binaries for Python 3.12
# This script ensures pydantic_core and other binary packages are compiled for
# AWS Lambda (Amazon Linux 2) environment, not for the local macOS/Windows platform.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYER_DIR="$SCRIPT_DIR/layer"
PYTHON_DIR="$LAYER_DIR/python"
ZIP_FILE="$SCRIPT_DIR/playsharp-backend-layer.zip"
REQUIREMENTS_FILE="$SCRIPT_DIR/lambda-requirements.txt"

echo "🔨 Building Lambda layer for Python 3.12..."

# Clean up any existing layer directory and zip file
if [ -d "$LAYER_DIR" ]; then
  echo "  Cleaning up existing layer directory..."
  rm -rf "$LAYER_DIR"
fi

if [ -f "$ZIP_FILE" ]; then
  echo "  Removing old zip file..."
  rm -f "$ZIP_FILE"
fi

# Create the python directory structure
echo "  Creating layer/python/ directory..."
mkdir -p "$PYTHON_DIR"

# Install packages with Linux-compatible binaries
echo "  Installing dependencies for Linux (manylinux2014_x86_64)..."
python3 -m pip install \
  --no-cache-dir \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --target "$PYTHON_DIR" \
  -r "$REQUIREMENTS_FILE"

# Verify critical packages are installed
if [ ! -d "$PYTHON_DIR/pydantic_core" ]; then
  echo "❌ ERROR: pydantic_core was not installed correctly"
  exit 1
fi

# Create zip with python/ at top level (not layer/python/)
echo "  Zipping layer contents..."
cd "$LAYER_DIR"
zip -r "$ZIP_FILE" python/ -q
cd - > /dev/null

# Verify zip structure
echo "  Verifying zip structure..."
WRONG_PATH=$(unzip -l "$ZIP_FILE" | grep "^Archive:" -A 20 | grep "layer/python" | wc -l || true)
if [ "$WRONG_PATH" -gt 0 ]; then
  echo "❌ ERROR: Zip contains 'layer/python/' instead of just 'python/'"
  exit 1
fi

# Clean up temporary directory
echo "  Cleaning up temporary layer directory..."
rm -rf "$LAYER_DIR"

echo ""
echo "✅ Lambda layer built successfully!"
echo "   Location: $ZIP_FILE"
echo "   Size: $(du -h "$ZIP_FILE" | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Run: unzip -l $ZIP_FILE | head -20"
echo "  2. Verify paths start with 'python/' not 'layer/python/'"
echo "  3. Run: terraform apply"
