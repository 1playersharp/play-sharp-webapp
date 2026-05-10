# PlaySmart AI Agent Instructions

## Project Overview
PlaySmart is a web app for interactive decision-making games (e.g., soccer penalty kicks) with leaderboards and club management. Built with React frontend, FastAPI backend, MongoDB, and AWS serverless infra.

See [README.md](README.md) for architecture diagram and deployment overview. Product details in [memory/PRD.md](memory/PRD.md).

## Getting Started
- **Frontend**: `cd frontend && yarn install && yarn start` (dev server on :3000). Build with `yarn build`.
- **Backend**: `cd backend && python -m uvicorn server:app --reload` (dev on :8000). Requires MongoDB.
- **Infra**: `cd infra/terraform && terraform init && terraform apply` for AWS deployment.
- **Testing**: `cd backend && pytest` for API tests. Frontend: `yarn test`.
- Set `.env` with `MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`.

## Architecture
- **Backend**: FastAPI with async Motor (MongoDB). Endpoints: `/api/score`, `/api/leaderboard/{type}`, `/api/clubs`. Serverless on Lambda.
- **Frontend**: React SPA with Phaser.js games. Components in `src/components/`, games in `src/games/`.
- **Data**: MongoDB collections: `contacts`, `scores`, `club_claims`. Pydantic models in `backend/models/`.
- **Infra**: Terraform-managed AWS (S3, CloudFront, API Gateway, Lambda).

Key files: [backend/server.py](backend/server.py), [frontend/src/games/DecisionGame.jsx](frontend/src/games/DecisionGame.jsx), [infra/terraform/main.tf](infra/terraform/main.tf).

## Conventions
- **Naming**: PascalCase for React components, snake_case for Python.
- **File Org**: Backend: `models/`, `routes/`, `services/`. Frontend: `src/games/`, `src/components/`, `src/pages/`.
- **Coding**: Python: Black/isort/flake8. React: Functional components with hooks. Phaser scenes for games.
- **Patterns**: Games emit `onComplete` with score data. API responses include ISO timestamps. Free-text club input.

## Common Tasks
- Add new game: Create Phaser scene in `src/games/`, integrate in `src/App.js`.
- New API endpoint: Add router in `backend/routes/`, update `server.py`.
- Update schema: Modify Pydantic model in `backend/models/`, reseed with `python scripts/reseed.py`.
- Deploy: Build frontend, sync to S3; Terraform apply for backend.

## Pitfalls
- Environment vars required for DB and backend URL.
- Demo mode: Set `USE_DB=false` in backend for no-MongoDB testing.
- Phaser coords: [0,1] range, vertical pitch attacking up.
- CORS enabled; test API integration with live endpoints.
- AWS creds needed for Terraform; frontend build must sync to S3.

See [test_result.md](test_result.md) for testing protocol.</content>
<parameter name="filePath">/Users/trevor.a.smith/Documents/PlaySmart/AGENTS.md