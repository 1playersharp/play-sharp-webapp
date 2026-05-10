#!/bin/bash
set -e

# Get the project root directory (parent of infra/terraform)
ROOT_DIR=$(dirname "$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")")

# Get outputs from Terraform (run from infra/terraform directory)
API_URL=$(cd "$ROOT_DIR/infra/terraform" && terraform output -raw api_gateway_url)
DISTRIBUTION_ID=$(cd "$ROOT_DIR/infra/terraform" && terraform output -raw cloudfront_id)

echo "API URL: $API_URL"
echo "CloudFront Distribution: $DISTRIBUTION_ID"

# Update frontend .env with the API gateway URL
cat > "$ROOT_DIR/frontend/.env" <<EOF
REACT_APP_BACKEND_URL=$API_URL
EOF

# Build and deploy frontend
cd "$ROOT_DIR/frontend"

yarn build

aws s3 sync build/ s3://playsmart-app-frontend --delete

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo "Frontend deployed successfully"