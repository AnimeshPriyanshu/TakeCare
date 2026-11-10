# TakeCare

**AI-assisted medicine inventory and replenishment for households and pharmacies.**

TakeCare is a hackathon-ready, full-stack MVP. Customers track a family medicine cabinet with an estimated-stock engine, browse approved pharmacies, and run replenishment requests through a guarded workflow. Pharmacists manage their public catalog and respond to requests. A grounded, deterministic assistant answers questions from live data and never changes inventory without explicit confirmation.

---

## What is implemented

- **Customer workspace**
  - Dashboard with active medicines, estimated units, low-stock signals, active requests and activity.
  - Medicine CRUD, family-member linking, confirmed-stock transactions and full ledger history.
  - Stock estimation from `confirmedStock − dailyUnits × elapsed days`, never below zero.
  - Pharmacy directory with search, detail pages and catalog availability.
  - Replenishment request flow: create → pharmacist response → proposal accept/decline → fulfilment → **customer confirms receipt**.
  - Requests list with status filtering, timeline and duplicate-safe receipt confirmation.
  - Demo assistant: stock, low stock, pending requests, pharmacy search, purchase/correction actions with confirmation.
- **Pharmacist workspace**
  - Onboarding/profile, public listing status, catalog CRUD and availability toggles.
  - Request queue with accept, reject, propose a different quantity, mark fulfilled, notes and detail view.
  - Dashboard with pending queue, fulfilment queue, catalog warnings and activity.
- **Platform**
  - JWT auth in an httpOnly cookie, bcrypt passwords, role-based authorization.
  - Zod input validation, centralized errors, ownership checks on every query.
  - Append-only inventory ledger; receipt confirmation is exactly-once.
  - Seeded demo data, notifications, activity feed, responsive Tailwind UI.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, JavaScript), React 19, Tailwind CSS 4, lucide-react |
| Backend | Node.js, Express 5 (ESM), Prisma ORM 7, Zod 4 |
| Database | PostgreSQL 18 (Docker, host port `5433`) |
| Auth | JWT, bcryptjs, httpOnly SameSite=Lax cookie |
| AI | Deterministic demo engine over live DB data (no live LLM required) |

---

## Quick start

### Prerequisites

- Node.js 20+ (tested on Node 26)
- npm 10+
- Docker Desktop (for the isolated PostgreSQL container)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

If files do not already exist:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

The defaults match the Docker database and local ports:

```dotenv
# server/.env
DATABASE_URL="postgresql://takecare:takecare_dev_password@localhost:5433/takecare"
JWT_SECRET="takecare_local_dev_secret_change_me_please_1234567890"
PORT=3001
CLIENT_ORIGIN="http://localhost:3000"
```

```dotenv
# client/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 3. Start PostgreSQL

```bash
npm run db:up
```

This creates or starts the `takecare-postgres` container with user `takecare`, password `takecare_dev_password`, database `takecare`, on **port 5433**.

### 4. Apply the schema and seed demo data

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

## Demo accounts

All seeded accounts use the password **`Password123!`**.

| Role | Email | Notes |
| --- | --- | --- |
| Customer | `aarav@takecare.demo` | Primary demo user with medicines and requests |
| Customer | `meera@takecare.demo` | Second customer |
| Pharmacist | `raghav@takecare.demo` | CarePlus Pharmacy (approved, catalog, requests) |
| Pharmacist | `sana@takecare.demo` | GreenLeaf Pharmacy (approved) |
| Pharmacist | `vikram@takecare.demo` | Wellness Chemist (pending approval, hidden from directory) |

Reset the demo at any time:

```bash
npm run db:seed
# or
sh scripts/demo-reset.sh
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
- Low stock means `estimatedStock <= reorderThreshold`; notifications are de-duplicated until stock recovers.

---

## AI assistant

The assistant is intentionally a **deterministic demo engine** (`mode: "demo"`) rather than a live LLM. It:

- Reads live medicines, requests and pharmacy catalogs from the database.
- Handles stock counts, low-stock lists, pending requests, pharmacy search and purchase/correction intents.
- Asks for clarification when medicine names are ambiguous.
- Creates a short-lived `AiPendingAction` for inventory changes and requires the user to confirm before anything is written.
- Refuses medical/dosage advice and never recommends a dosage change.
- Never fabricates availability or quantities.

Example prompts:

- “How many tablets do I have left?”
- “Which medicines are running low?”
- “Show my pending requests”
- “I purchased 10 more tablets of Metformin”
- “Set Metformin stock to 44”
- “Find a pharmacy listing Amoxicillin”

The UI clearly labels the demo mode. `OPENAI_API_KEY` is reserved for a future live provider but is not required.

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
│   └── lib/                  fetch client, formatting, status metadata
├── server/                   Express 5 + Prisma 7 API
│   ├── prisma/               schema, migrations, seed
│   ├── src/
│   │   ├── config/           validated environment
│   │   ├── controllers/      HTTP handlers
│   │   ├── middleware/       auth, RBAC, validation, errors
│   │   ├── routes/           API routes
│   │   ├── services/         stock, inventory, requests, AI, notifications
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

See [DEMO.md](./DEMO.md) for a 5–7 minute presenter script that covers both roles, the full request lifecycle and the AI assistant.

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

---

Built for the TakeCare hackathon demo. TakeCare does not provide medical advice, diagnoses or dosage changes.
