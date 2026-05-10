# Lambda Backend Packaging Cleanup Summary

**Date**: May 9, 2026  
**Status**: ✅ Complete

## Generated Folders & Artifacts Removed

### Backend Source Cleanup
- **`backend/models.py`** - Legacy duplicate (use `models/` package instead)
- **`backend/requirements-contacts.txt`** - Unused legacy dependency file
- **`backend/scripts/reseed.py`** - MongoDB-specific reseed script (no longer needed)

### Rationale
- `models.py` shadowed the `models/` package; all imports now use the package
- `requirements-contacts.txt` was redundant; replaced by main `requirements.txt`
- `reseed.py` contained MongoDB imports (`pymongo.MongoClient`) and is not part of Lambda runtime

## Build Tooling Added

### Reproducible Backend Build Script
**File**: `infra/terraform/lambda/backend/build_backend.sh`

**Features**:
- Cleans previous build artifacts before each run
- Validates deployment package contents
- Prevents accidental inclusion of MongoDB, cache, or dev files
- Produces consistent, reproducible zips
- Includes built-in validation checks

**Excluded from deployment package**:
```
*.pyc files
__pycache__
.pytest_cache
.venv/, venv/
.env
tests/
scripts/
*.egg-info/
.git/
legacy .zip files
```

**Usage**:
```bash
cd infra/terraform/lambda/backend
bash build_backend.sh
```

## Lambda Deployment Package Contents

### ✅ Included (18 Python files)
```
backend_py.py      - Lambda entrypoint
server.py          - FastAPI app + Mangum handler
core.py            - Shared infrastructure (limiter, logger)
models/
  ├── __init__.py   - Package exports
  ├── club.py       - Club/ClubClaim models
  ├── score.py      - Score models
  └── contact.py    - Contact model
routes/
  ├── __init__.py   - Router aggregator
  ├── contact.py    - POST /api/contact (DynamoDB + SNS)
  ├── score.py      - POST /api/score (DynamoDB leaderboard)
  ├── club_claim.py - POST /api/club-claim
  ├── leaderboard.py- GET /api/leaderboard/{game_type}
  └── meta.py       - GET /api/clubs, /api/game-types
services/
  ├── __init__.py
  ├── dynamodb.py   - DynamoDB table clients
  ├── seed.py       - Startup seeding (DynamoDB)
  └── clubs.py      - Club canonicalization
```

### ❌ NOT Included
- MongoDB or Motor imports
- Python cache (`__pycache__`)
- Virtual environments (`.venv`, `venv`)
- Test files
- Development scripts
- Legacy requirements files

## Verification Results

```
✅ Deployment zip size: 16K (18 Python files)
✅ MongoDB check: 0 matches (clean)
✅ Cache check: 0 matches (clean)
✅ backend_py imports successfully
✅ All routes can initialize
```

## Terraform Integration

The Lambda function terraform continues to use:
- **Source**: `infra/terraform/lambda/backend/playsharp-backend.zip`
- **Handler**: `backend_py.lambda_handler` (from `backend_py.py` → `server.handler`)
- **Layers**: `aws_lambda_layer_version.backend_deps` (from cleaned layer build)

When `terraform apply` is run, it will detect the updated zip hash and deploy the fresh package.

## Rebuilding the Package

To rebuild after code changes:
```bash
cd infra/terraform/lambda/backend
bash build_backend.sh
terraform apply
```

The build script automatically:
1. Removes the old zip
2. Creates a fresh archive from source
3. Validates no unwanted files are included
4. Reports final package contents
