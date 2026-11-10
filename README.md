# TakeCare

**AI-assisted medicine inventory and replenishment for households and pharmacies.**

TakeCare is a full-stack application that helps families track medicine inventory with live estimates, browse approved pharmacies, and run replenishment requests through a guarded workflow. Pharmacists manage their public catalog and respond to requests. A grounded, deterministic assistant answers questions from live data and never changes inventory without explicit confirmation.

---

## Features

- **Customer workspace**
  - Dashboard with active medicines, estimated units, low-stock signals, active requests and activity.
  - Medicine CRUD, family-member linking, confirmed-stock transactions and full ledger history.
  - Stock estimation from `confirmedStock − dailyUnits × elapsed days`, never below zero.
  - Pharmacy directory with search, detail pages and catalog availability.
  - Replenishment request flow: create → pharmacist response → proposal accept/decline → fulfilment → **customer confirms receipt**.
  - Requests list with status filtering, timeline and duplicate-safe receipt confirmation.
  - Deterministic assistant: stock counts, low-stock lists, pending requests, pharmacy search, purchase/correction actions with confirmation.
  - Voice input via Gnani Prisma v2.5 with editable transcripts and review-before-send.
- **Pharmacist workspace**
  - Onboarding/profile, public listing status, catalog CRUD and availability toggles.
  - Request queue with accept, reject, propose a different quantity, mark fulfilled, notes and detail view.
  - Dashboard with pending queue, fulfilment queue, catalog warnings and activity.
- **Platform**
  - JWT auth in an httpOnly cookie, bcrypt passwords, role-based authorization.
  - Zod input validation, centralized errors, ownership checks on every query.
  - Append-only inventory ledger; receipt confirmation is exactly-once.
  - Notifications, activity feed, responsive Tailwind UI.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, JavaScript), React 19, Tailwind CSS 4, lucide-react |
| Backend | Node.js, Express 5 (ESM), Prisma ORM 7, Zod 4 |
| Database | PostgreSQL 18 (Docker, host port `5433`) |
| Auth | JWT, bcryptjs, httpOnly SameSite=Lax cookie |
| AI | Deterministic reasoning over live DB data plus Gnani Prisma v2.5 speech-to-text |

---

## Quick start

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for the isolated PostgreSQL container)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

Copy the example files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

**Required variables:**

| File | Variable | Description |
| --- | --- | --- |
| `server/.env` | `DATABASE_URL` | PostgreSQL connection string |
| `server/.env` | `JWT_SECRET` | Long random string for signing JWTs |
| `server/.env` | `GNANI_API_KEY` | Speech-to-text API key (server-side only) |
| `server/.env` | `PORT` | API port (default: 3001) |
| `server/.env` | `CLIENT_ORIGIN` | Frontend origin for CORS (default: `http://localhost:3000`) |
| `client/.env.local` | `NEXT_PUBLIC_API_URL` | API base URL (default: `http://localhost:3001/api`) |

**Note:** Never commit real secrets. The `.env` files are gitignored. Use strong random values for `JWT_SECRET` in production.

### 3. Start PostgreSQL

```bash
npm run db:up
```

This creates/starts the `takecare-postgres` Docker container on port **5433** with the project's default credentials.

### 4. Apply schema and seed demo data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run both apps

```bash
npm run dev
```

- Client: <http://localhost:3000>
- API: <http://localhost:3001>
- Health: <http://localhost:3001/health>

You can also run them separately:

```bash
npm run dev:server
npm run dev:client
```

---

## Core workflow

```
Customer creates request
        │
        ▼
PENDING ──accept──> ACCEPTED ──fulfil──> FULFILLED ──customer confirms──> COMPLETED
   │  ├──reject──> REJECTED
   │  ├──propose─> COUNTER_PROPOSED ──customer accepts──> CUSTOMER_ACCEPTED ──fulfil──> FULFILLED
   │  │                              └─customer declines─> CUSTOMER_DECLINED
   │  └──cancel──> CANCELLED
```

- Only the owning customer sees and acts on their requests.
- Only the owning pharmacy can respond or fulfil.
- Invalid transitions return **409 Conflict**.
- Receipt confirmation runs inside a transaction with a conditional claim on `status + inventoryAppliedAt` and a unique ledger link, so stock can never be applied twice.
- A request does **not** reserve pharmacy stock; the pharmacist reports availability.

### Stock rules

- `estimatedStock = max(0, confirmedStock − dailyUnits × floor(daysSinceLastConfirmation))`.
- Estimated consumption never writes to the ledger.
- `confirmedStock` changes only through `INITIAL`, `PURCHASE`, `CORRECTION` or `REQUEST_FULFILLMENT` transactions.
- Low stock means `estimatedStock ≤ reorderThreshold`; notifications are de-duplicated until stock recovers.

---

## AI assistant and voice input

The text assistant is an intentionally **deterministic engine** (`mode: "demo"`) rather than a live LLM. It:

- Reads live medicines, requests and pharmacy catalogs from the database.
- Handles stock counts, low-stock lists, pending requests, pharmacy search and purchase/correction intents.
- Asks for clarification when medicine names are ambiguous.
- Creates a short-lived `AiPendingAction` for inventory changes and requires the user to confirm before anything is written.
- Refuses medical/dosage advice and never recommends a dosage change.
- Never fabricates availability or quantities.

Voice input uses the real **Gnani Prisma v2.5** speech-to-text API:

- `POST /api/ai/transcribe` is authenticated and customer-only, accepts `audio_file` with multer memory storage, and forwards the audio to `https://api.vachana.ai/stt/v3` using the server-side `X-API-Key-ID` header.
- Supported languages are English (India) `en-IN` and Hindi `hi-IN`. Hinglish can be transcribed with either language setting.
- Supported upload formats are WAV, MP3, OGG, FLAC, AAC and M4A; audio is limited to 30 seconds and 8 MB.
- Browser recordings are decoded and converted locally to 16 kHz mono WAV before upload, so WebM is never sent to Prisma.
- The transcript is inserted into the chat input for review and editing. It is **not** sent automatically and never changes inventory; any stock update still requires the existing explicit confirmation card.
- `GNANI_API_KEY` is read only on the server via `process.env.GNANI_API_KEY`. It is never exposed to the browser or included in API responses.

Voice input requires `GNANI_API_KEY`. Text chat continues to work without it.

Example prompts:

- "How many tablets do I have left?"
- "Which medicines are running low?"
- "Show my pending requests"
- "I purchased 10 more tablets of Metformin"
- "Set Metformin stock to 44"
- "Find a pharmacy listing Amoxicillin"

---

## Project structure

```
TakeCare/
├── client/                   Next.js 16 app
│   ├── app/
│   │   ├── (auth)/           login, register
│   │   ├── customer/         dashboard, medicines, pharmacies, requests, assistant, family
│   │   └── pharmacist/       dashboard, pharmacy profile, catalog, requests
│   ├── components/           UI primitives + domain components
│   ├── hooks/                Auth, Toast, useApi
│   └── lib/                  fetch client, audio-to-WAV conversion, formatting
├── server/                   Express 5 + Prisma 7 API
│   ├── prisma/               schema, migrations, seed
│   ├── src/
│   │   ├── config/           validated environment
│   │   ├── controllers/      HTTP handlers
│   │   ├── middleware/       auth, RBAC, audio upload, validation, errors
│   │   ├── routes/           API routes
│   │   ├── services/         stock, inventory, requests, AI, transcription, notifications
│   │   ├── schemas/          Zod schemas
│   │   └── utils/            helpers
│   └── prisma.config.mjs
├── scripts/                  db-up, dev, demo-reset
├── API.md                    endpoint reference
├── DEMO.md                   presenter walkthrough
└── PLAN.md                   architecture and implementation plan
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run install:all` | Install server and client dependencies |
| `npm run db:up` | Create/start the Docker PostgreSQL container |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Reset and seed demo data |
| `npm run db:reset` | Drop, migrate and reseed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run dev` | Run API and client together |
| `npm run dev:server` | Run only the API (`3001`) |
| `npm run dev:client` | Run only the Next.js client (`3000`) |
| `npm run build` | Production build of the client |
| `npm run start:server` | Start the API without watch mode |

---

## API

See [API.md](./API.md) for the endpoint reference, payloads and status codes.

Base URL: `http://localhost:3001/api` · Health: `http://localhost:3001/health`

---

## Demo walkthrough

See [DEMO.md](./DEMO.md) for a presenter script that covers both roles, the full request lifecycle and the AI assistant.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot reach the TakeCare API` | Ensure the server is on `3001` and `client/.env.local` points to `http://localhost:3001/api`. |
| Postgres connection refused | Run `npm run db:up`; confirm `docker ps` shows `takecare-postgres` on `5433`. |
| Docker not running | Start Docker Desktop and re-run `npm run db:up`. |
| Login succeeds but requests fail | Use `http://localhost` for both apps so the cookie is shared; the API client sends credentials. |
| Demo data looks inconsistent | Run `npm run db:seed` to reset. |
| Prisma client import error | Run `npm --prefix server run db:generate`. |
| Voice input says transcription is not configured | Set `GNANI_API_KEY` in `server/.env` and restart the API. |
| Microphone access denied or recording unavailable | Allow microphone permission in the browser, or use the audio-upload button. |

---

Built for the TakeCare hackathon demo. TakeCare does not provide medical advice, diagnoses or dosage changes.