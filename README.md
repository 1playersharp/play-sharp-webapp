> **Think quicker. Move smarter.**  
> Browser-based cognitive football training for clubs, schools, academies, and players.

PlaySharp is a lightweight MVP that helps players improve **reaction speed**, **scanning ability**, **decision-making under pressure**, and **football intelligence** through short, interactive, measurable drills built with **Phaser.js**.

---

## Overview

PlaySharp is deployed on **AWS** using a serverless architecture designed for low operational overhead, low prototype cost, and fast iteration.

### Frontend

- **React** single-page application
- Hosted in **Amazon S3**
- Delivered globally through **Amazon CloudFront**
- CloudFront handles HTTPS delivery, caching, and SPA route fallback

### Backend

- **FastAPI** running inside **AWS Lambda**
- Exposed through **Amazon API Gateway**
- **Mangum** adapts FastAPI for Lambda execution

### Infrastructure

- Provisioned with **Terraform**

---

## Architecture

```
Browser
   │
   ▼
CloudFront
   │
   ▼
S3 (React frontend)

Browser
   │
   ▼
API Gateway
   │
   ▼
Lambda (FastAPI)

```

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
│       ├── components/
│       ├── services/
│       └── App.js
│
└── infra/
    └── terraform/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        ├── s3.tf
        ├── cloudfront.tf
        ├── lambda.tf
        ├── api-gateway.tf
        └── lambda/
```

---

## Frontend Deployment

The frontend is built into static assets and deployed to Amazon S3.

- Build
- cd frontend
- yarn install
- yarn build

- **Upload**
- aws s3 sync build/ s3://YOUR_FRONTEND_BUCKET --delete

---
## CloudFront

CloudFront serves the application and handles client-side React routes such as:

- /demo
- /leaderboard
- /games/scanning

SPA routing is supported through CloudFront custom error responses that return index.html.

## Backend Deployment

The backend runs as FastAPI inside Lambda.

The Lambda package includes:

- application code
- Python dependencies
- mangum

API Gateway exposes the Lambda as public HTTP endpoints.

## Backend Routes

| Method | Route                              | Purpose                           |
|--------|------------------------------------|-----------------------------------|
| GET    | `/api/`                            | Health & motto                    |
| GET    | `/api/clubs`                       | List supported clubs              |
| POST   | `/api/contact`                     | Submit a contact / pilot request  |
| GET    | `/api/contact`                     | Admin: list contact submissions   |
| POST   | `/api/score`                       | Submit a game score               |
| GET    | `/api/leaderboard/{game_type}`     | Leaderboard (`reaction`/`decision`) |

**Leaderboard query params:** `club=All|<name>`, `period=all|weekly`, `limit=20`.

### Sample seed data

On first startup the backend seeds ~40 sample scores split across the three clubs (**South London FC**, **Croydon Juniors**, **Elite Academy**) so the leaderboards feel alive for demos.

---

## Pricing tiers (UI only — no real billing)

- **Basic — monthly subscription**
  Reaction drills, scanning, decision-making, football intelligence scoring, leaderboard access.
- **Advanced — Contact for price**
  Everything in Basic + expanded drill library, advanced analytics dashboard, personalised insights, club challenge tools, and **AI Coaching (Coming Soon)**.

---

## MongoDB Setup

TBA in future 

---

## Roadmap

- AI Coaching engine (Advanced tier)
- Stripe billing integration
- Club admin dashboard with multi-team management
- Scanning + spatial-awareness drills
- Mobile (iOS/Android) wrapper
