> **Think quicker. Move smarter.**
> Browser-based cognitive football training for clubs, schools, academies, and players.

PlaySharp is a lightweight MVP that helps players improve **reaction speed**, **scanning ability**, **decision-making under pressure**, and **football intelligence** through short, interactive, measurable drills.

---

## Overview

PlaySharp is deployed on **Vercel** with a serverless backend architecture designed for low operational overhead and fast iteration.

### Frontend

- **React** single-page application
- Hosted and deployed on **Vercel**
- Production URL: [play-sharp-webapp.vercel.app](https://play-sharp-webapp.vercel.app/)
- Preview URL: [play-sharp-webapp-g0ltraxjc-1playersharps-projects.vercel.app](https://play-sharp-webapp-g0ltraxjc-1playersharps-projects.vercel.app/)

### Backend

- **FastAPI** running inside **AWS Lambda**
- Exposed through **Amazon API Gateway**
- **Mangum** adapts FastAPI for Lambda execution

### Infrastructure

- Backend provisioned with **Terraform**
- Frontend CI/CD managed by **Vercel** (auto-deploys on push to main)

---

## Architecture

```
Browser
   │
   ▼
Vercel (React frontend — SPA routing handled automatically)

Browser
   │
   ▼
AWS Lambda (FastAPI via Mangum)
```

---

## Project Structure

```
playsharp/
├── backend/
│   ├── server.py
│   ├── core.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── requirements.txt
│   └── requirements-contacts.txt
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── pages/
│       ├── games/
│       ├── elite/
│       │   ├── engine/
│       │   ├── games/
│       │   ├── rendering/
│       │   ├── scenario/
│       │   └── ui/
│       ├── components/
│       ├── services/
│       └── App.js
│
└── infra/
    └── terraform/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        ├── lambda.tf
        └── lambda/
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Yarn
- Python 3.11+
- AWS CLI (for backend deployment only)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/playsharp.git
cd playsharp
```

### 2. Frontend — run locally

```bash
cd frontend
yarn install
yarn dev
```

The app will be available at **http://localhost:3000**

To run a production build locally:

```bash
yarn build
yarn preview
```

### 3. Backend — run locally

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

The API will be available at **http://localhost:8000**

### 4. Connect frontend to local backend

Create a `.env.local` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

When this is not set, the frontend defaults to the production Lambda endpoint.

---

## Frontend Deployment (Vercel)

Vercel auto-deploys on every push to `main`. No manual steps required for production.

To deploy manually via the Vercel CLI:

```bash
npm i -g vercel
cd frontend
vercel --prod
```

SPA routing (e.g. `/demo`, `/leaderboard`, `/elite/games/decision`) is handled automatically by Vercel — no custom error page configuration needed.

---

## Backend Deployment

The backend runs as FastAPI inside AWS Lambda.

The Lambda package includes:
- application code
- Python dependencies
- mangum

Deploy via Terraform:

```bash
cd infra/terraform
terraform init
terraform apply
```

---

## Backend Routes

| Method | Route                          | Purpose                          |
|--------|--------------------------------|----------------------------------|
| GET    | `/api/`                        | Health & motto                   |
| GET    | `/api/clubs`                   | List supported clubs             |
| POST   | `/api/contact`                 | Submit a contact / pilot request |
| GET    | `/api/contact`                 | Admin: list contact submissions  |
| POST   | `/api/score`                   | Submit a game score              |
| GET    | `/api/leaderboard/{game_type}` | Leaderboard by game type         |

**Leaderboard query params:** `club=All|<name>`, `period=all|weekly`, `limit=20`.

### Sample seed data

On first startup the backend seeds ~40 sample scores split across three clubs (**South London FC**, **Croydon Juniors**, **Elite Academy**) so leaderboards feel alive for demos.

---

## Game Tiers

### Foundation Games
Built in React. Short, interactive drills targeting core cognitive skills:
- Reaction
- Decision
- Scanning
- Pressing
- Tactical Quiz
- Pass & Move

### Elite Games
Built in Three.js. Immersive 3D versions with realistic pitch visuals and adaptive scenarios based on player age and position:
- Decision — Elite 3D
- Pass & Move — Elite 3D
- Pressing — Elite 3D

---

## Pricing Tiers (UI only — no real billing)

- **Basic — monthly subscription**
  Reaction drills, scanning, decision-making, football intelligence scoring, leaderboard access.
- **Advanced — Contact for price**
  Everything in Basic + expanded drill library, advanced analytics, personalised insights, club challenge tools, and **AI Coaching (Coming Soon)**.

---

## Roadmap

- AI Coaching engine (Advanced tier)
- Stripe billing integration
- Club admin dashboard with multi-team management
- Mobile (iOS/Android) wrapper
- MongoDB persistence layer