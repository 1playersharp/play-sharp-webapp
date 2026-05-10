# PlaySharp — PRD

> **Motto:** Think quicker. Move smarter.

## Original Problem Statement (verbatim summary)

Build a fully working browser-based football cognitive training platform called **PlaySharp** — a startup-grade MVP demo + early SaaS foundation for football clubs, schools, and players. Helps players improve reaction speed, scanning ability, decision-making under pressure, and football intelligence through interactive cognitive football drills. **V1 — no real AI Coaching, no real Stripe, no real CRM** (all UI placeholders only).

## Architecture

- **Backend:** FastAPI + Motor (async MongoDB) at `/api/*`
- **Frontend:** React 19 + Phaser.js 4 + Tailwind + Shadcn/UI + framer-motion
- **DB:** MongoDB (collections: `contacts`, `scores`)

## User Personas

1. **Player** — wants to train cognitively, see ms-precision data, climb leaderboard.
2. **Coach** — wants to track tactical IQ, monitor squad progression, run warm-ups.
3. **Club admin** — wants weekly squad-wide challenges, internal competition, leaderboard.
4. **School / Academy** — wants structured cognitive PE drills, classroom-ready, browser-only.
5. **Parent / Visitor** — wants to understand product in <60 s, contact for pilot.

## Core Requirements (static)

- Hero with brand + motto + CTAs (Start Demo / View Pricing / Contact Us)
- Product explanation, audience cards (Players/Coaches/Clubs/Schools)
- Reaction game (10 rounds, false-start detection, ms timing)
- Decision game (5 freeze-frame scenarios — pass/shoot/dribble)
- Leaderboard (global + club filter + weekly view)
- Pricing (Basic £19/mo, Advanced "Contact for price" + AI Coaching coming-soon badge)
- Contact form (Name, Email, Club optional, Message) → POST /api/contact, stored in Mongo
- 3 clubs: South London FC, Croydon Juniors, Elite Academy
- Demo mode under 60s flow: Reaction → Decision → Leaderboard
- Dark sports-tech UI, Barlow Condensed + JetBrains Mono

## What's Implemented (2026-02 — V1 → V1.1)

### V1.1 changes (this iteration)
- ✅ Shifted to red/black/white football-club editorial theme (Atleticos-inspired)
- ✅ Added Sofia Sans Extra Condensed display font alongside Barlow Condensed
- ✅ Hero redesigned: stadium photography, editorial headline with red-box highlight on "quicker." and italic red "smarter.", match-day HUD card with red top strip and diagonal corner
- ✅ Demo setup now collects **Player name + Age (6-99) + Club/School (free text)** — no more hardcoded clubs
- ✅ Reaction/Decision standalone game pages also moved to free-text club + age inputs
- ✅ Backend: Score model accepts optional `age`, `club` is free-text (no allow-list); empty club rejected with 400
- ✅ `/api/clubs` now returns distinct clubs from the scores collection (so leaderboard filter dynamically reflects real data)
- ✅ Leaderboard component fetches club options dynamically
- ✅ League-table leaderboard header strip in brand red

### V1 (original)
- ✅ FastAPI backend with `/api/contact`, `/api/score`, `/api/leaderboard/{type}`, `/api/clubs`
- ✅ Auto-seed of 40 sample scores across 3 sample clubs on first startup
- ✅ Home page (Hero, Product Explainer, Audience Cards, Demo Preview, Leaderboard preview, Pricing, Contact CTA)
- ✅ /pricing page with feature comparison table
- ✅ /contact page with validated form + Sonner toasts
- ✅ /demo flow (Setup → Reaction → Decision → Leaderboard)
- ✅ /games/reaction & /games/decision standalone pages
- ✅ /leaderboard page with club + weekly filters and Reaction/Decision tabs
- ✅ Phaser ReactionGame (10 rounds, false-start, ms precision, score 0-1000)
- ✅ Phaser DecisionGame (5 scenarios, pass/shoot/dribble, time-bar timeout)
- ✅ All elements use `data-testid`
- ✅ README with structure + run instructions

## P0 / P1 / P2 Backlog

### P0 (next session if asked)
- Persist player identity across the demo (currently per-page form input)
- Add "share my score" link / OG image

### P1
- AI Coaching (real LLM integration on Advanced tier)
- Stripe checkout for Basic plan
- Club admin dashboard with multi-team management
- Weekly challenge auto-rotation + push notifications
- Scanning drill (3rd game type)

### P2
- Mobile wrapper (PWA / Capacitor)
- Coach analytics: per-player progression charts (Recharts)
- Email notifications on contact form (Resend integration)
- OAuth login (Google / Apple)

## Next Action Items

1. Validate end-to-end flow with testing agent.
2. (Optional) Wire revenue-driver: pricing modal with capture form on Advanced "Contact for Price".
3. (Optional) Add OG / share image for completed demo run.
