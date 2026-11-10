# TakeCare — Implementation Plan

**Project:** TakeCare — AI-powered medicine inventory & replenishment platform
**Goal:** A fully functional, demo-ready hackathon MVP with separate customer and pharmacist experiences on one shared backend.

---

## 1. Current Workspace Assessment

| Item | Status |
| --- | --- |
| Repository | Existing git repo, only `README.md` and `.idea/` present |
| Node.js | v26.5.0 |
| npm | 11.17.0 |
| PostgreSQL | Local PG 18 running on 5432 but password-protected |
| Docker | Available; used to run an isolated PostgreSQL 18 on **port 5433** |
| Application code | None — greenfield build |

**Infrastructure choice:** Dockerized PostgreSQL (`takecare-postgres`) on `localhost:5433` with known credentials so no host DB password is needed. A helper script is provided.

---

## 2. Architecture

```
TakeCare/
├── client/                 Next.js 16 (App Router, JavaScript) + Tailwind CSS v4
│   ├── app/                auth, customer, pharmacist route groups
│   ├── components/         UI primitives, shells, domain components
│   ├── hooks/              auth + toast providers
│   └── lib/                API client, formatting, constants
├── server/                 Express 5 (ESM) + Prisma 7 + PostgreSQL
│   ├── prisma/             schema + seed
│   ├── src/
│   │   ├── config/         env validation
│   │   ├── controllers/    HTTP handlers
│   │   ├── middleware/     auth, RBAC, validation, errors
│   │   ├── routes/         route definitions
│   │   ├── services/       stock engine, inventory, requests, AI, notifications
│   │   ├── utils/          helpers
│   │   └── index.js        server entry
│   └── prisma.config.mjs   Prisma 7 config
├── scripts/                db-up, dev, demo-reset helpers
├── PLAN.md
├── README.md
└── API.md
```

**Frontend → Backend:** `fetch` with `credentials: "include"` to `NEXT_PUBLIC_API_URL`.
**Auth:** JWT (7-day) stored in an **httpOnly, SameSite=Lax cookie**; optional `Authorization: Bearer` supported for API tooling. Passwords hashed with bcryptjs (10 rounds).
**Authorization:** All ownership is derived from `req.user.id` from the JWT. Client-supplied user/pharmacy IDs are never trusted.

---

## 3. Data Model

### User
- id, name, email (unique), passwordHash, role (`CUSTOMER` | `PHARMACIST`), createdAt

### Pharmacy
- id, ownerId (unique → User), name, address, city, pincode, phone, licenseNumber (unique), description, isActive, isApproved
- Only `isActive && isApproved` pharmacies appear in the customer directory.

### FamilyMember (P2 but modelled)
- id, userId, name, relation, createdAt

### Medicine (customer-owned)
- id, userId, familyMemberId?, name, strength, form, unitLabel
- confirmedStock, dailyUnits, dosageSchedule (free text provided by user), reorderThreshold
- lastConfirmedAt, isActive, lowStockNotified, createdAt, updatedAt

### InventoryTransaction (append-only ledger)
- id, medicineId, type (`INITIAL` | `PURCHASE` | `CORRECTION` | `REQUEST_FULFILLMENT`)
- quantityChange, previousStock, newStock, note, replenishmentRequestId? (unique), createdAt

### PharmacyMedicine (catalog)
- id, pharmacyId, name, strength, form, unitLabel, quantityAvailable, price?, isAvailable
- unique(pharmacyId, name, strength, form)

### ReplenishmentRequest
- id, customerId, pharmacyId, medicineId?, pharmacyMedicineId?, medicineName, strength, unitLabel
- quantityRequested, quantityProposed?, status, note?, pharmacistNote?
- timestamps: createdAt, respondedAt, proposalRespondedAt, fulfilledAt, completedAt
- inventoryAppliedAt (idempotency guard)
- relation `inventoryTransaction?`

**Status machine**

```
PENDING ──accept──> ACCEPTED ──fulfil──> FULFILLED ──customer confirm──> COMPLETED
   │  ├──reject──> REJECTED (terminal)
   │  ├──propose─> COUNTER_PROPOSED ──customer accept──> CUSTOMER_ACCEPTED ──fulfil──> FULFILLED
   │  │                              └─customer decline─> CUSTOMER_DECLINED (terminal)
   │  └──cancel──> CANCELLED (terminal)
```

Invalid transitions are rejected server-side with 409.

### Notification
- id, userId, type, title, message, isRead, replenishmentRequestId?, createdAt

### Activity (recent activity feed)
- id, userId, type, message, createdAt

### AiPendingAction
- id, userId, medicineId?, type (`ADD_STOCK` | `CORRECTION`), payload Json, status (`PENDING` | `CONFIRMED` | `CANCELLED`), createdAt, expiresAt
- Confirmation executes server-side from the stored action; client cannot alter the amount.

### ChatMessage (optional persistence)
- id, userId, role (`USER` | `ASSISTANT`), content, createdAt

---

## 4. Stock Estimation Engine

```
elapsedDays = floor((now - lastConfirmedAt) / 1 day)
estimatedStock = max(0, confirmedStock - dailyUnits * elapsedDays)
```

- `confirmedStock` only changes through explicit transactions (initial, purchase, correction, request fulfillment).
- Estimated consumption never writes to the ledger.
- Low stock when `estimatedStock <= reorderThreshold`.
- Notification de-duplication via `lowStockNotified`; reset when stock recovers.

---

## 5. API Surface

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Customer medicines | `GET/POST /medicines`, `GET/PATCH /medicines/:id`, `POST /medicines/:id/deactivate`, `POST /medicines/:id/reactivate`, `GET /medicines/:id/history`, `POST /medicines/:id/transactions` |
| Family | `GET/POST /family-members`, `DELETE /family-members/:id` |
| Pharmacies | `GET /pharmacies?search=`, `GET /pharmacies/:id` |
| Pharmacist pharmacy | `GET/PUT /pharmacist/me` (alias: `/pharmacy/me`) |
| Pharmacist catalog | `GET/POST /pharmacist/catalog`, `PATCH/DELETE /pharmacist/catalog/:id` (alias: `/pharmacy/catalog`) |
| Customer requests | `POST /requests`, `GET /requests`, `GET /requests/:id`, `POST /requests/:id/accept-proposal`, `POST /requests/:id/decline-proposal`, `POST /requests/:id/confirm-receipt`, `POST /requests/:id/cancel` |
| Pharmacist requests | `GET /pharmacist/requests`, `POST /pharmacist/requests/:id/respond`, `POST /pharmacist/requests/:id/fulfill` (alias: `/pharmacy/...`) |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Dashboards | `GET /dashboard/customer`, `GET /dashboard/pharmacist` |
| AI | `POST /ai/chat`, `POST /ai/actions/:id/confirm`, `POST /ai/actions/:id/cancel`, `GET /ai/history` |
| Health | `GET /health` |

All inputs validated with Zod. All mutations authorized by role + ownership.

---

## 6. AI Assistant Strategy

- Dedicated `services/ai.service.js` behind `POST /ai/chat`.
- **Deterministic demo engine** (always available, clearly labelled `mode: "demo"`):
  - stock/quantity queries ("how many tablets do I have left")
  - low-stock queries
  - pending request queries
  - pharmacy search for a medicine
  - inventory updates ("I purchased 10 more tablets") → resolve medicine, detect ambiguity, create `AiPendingAction` requiring explicit confirmation
  - dosage/medical questions → safe refusal + no dosage changes
- Never fabricates quantities or availability; every answer reads live DB data.
- Live model integration is intentionally not enabled; `OPENAI_API_KEY` is reserved for a future provider. The shipped MVP always uses the reliable demo engine and labels it clearly.

---

## 7. Milestones

### M1 — Foundation (P0)
- [x] Docker Postgres on 5433 + helper script
- [x] Server scaffold, env validation, Prisma 7 config/schema/migration/generate
- [x] Seed data (customers, pharmacist, pharmacy, catalog, medicines, history, requests)
- [x] Express app skeleton, health check, error handling, CORS, cookies
- [x] Verify server boots & DB connectivity

### M2 — Auth & Authorization (P0)
- [x] Register (customer/pharmacist with pharmacy profile), login, logout, me
- [x] JWT + bcrypt, role middleware, cookie handling
- [x] Negative tests: missing token, wrong role, cross-user access

### M3 — Customer Core (P0)
- [x] Medicine CRUD + deactivate
- [x] Stock engine + transactions + history
- [x] Low-stock notification service
- [x] Customer dashboard aggregation
- [x] Test estimation and threshold crossing

### M4 — Pharmacy & Replenishment (P0)
- [x] Pharmacy profile management, catalog CRUD
- [x] Directory search/details/catalog
- [x] Request create, respond (accept/reject/propose), fulfil
- [x] Customer accept/decline proposal, confirm receipt with exactly-once inventory write
- [x] Invalid transition tests
- [x] Notifications + activity feed
- [x] Pharmacist dashboard aggregation

### M5 — AI Assistant (P1)
- [x] Intent engine over live data
- [x] Clarification + confirmation actions
- [x] Safety guardrails
- [x] Test confirm/cancel and no-write-before-confirmation

### M6 — Frontend (P0/P1)
- [x] Design system, auth pages, route guards
- [x] Customer shell + dashboard, medicines (+detail/history), pharmacies (+detail/request), requests (+detail), assistant
- [x] Pharmacist shell + dashboard, pharmacy profile, catalog, request management
- [x] Empty/loading/error states, toasts, status badges

### M7 — Testing & Finalization (P0)
- [x] Full end-to-end happy path via API + UI
- [x] Negative/authorization matrix
- [x] README, API.md, `.env.example`, demo script, credentials
- [x] Final lint/build/boot verification

---

## 8. Priorities & Scope

| Priority | Items |
| --- | --- |
| **P0** | Auth/RBAC, medicine management, stock estimation, pharmacy catalog/directory, full replenishment workflow, dual dashboards |
| **P1** | AI assistant, low-stock notifications, activity history, seed data |
| **P2 / postponed** | Socket.IO real-time updates, advanced analytics, live LLM provider |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Prisma 7 new client generates TypeScript | Verify runtime import with Node 26; fallback to a supported JS path (`tsx` loader) without changing app code |
| Port 5432 occupied / password unknown | Isolated Docker Postgres on 5433 with project credentials |
| Double inventory update on repeated confirmation | Conditional `updateMany` on status + `inventoryAppliedAt` inside a DB transaction + unique `replenishmentRequestId` |
| Cross-tenant access | Ownership always resolved from JWT; integration tests for every role |
| AI hallucination | Deterministic data-backed engine; confirmation gate; no dosage advice |
| Time | Ship P0 first, keep P1 tight, leave P2 behind feature-flags/schema only |

---

## 10. Demo Credentials (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Customer | `aarav@takecare.demo` | `Password123!` |
| Customer | `meera@takecare.demo` | `Password123!` |
| Pharmacist | `raghav@takecare.demo` | `Password123!` (CarePlus Pharmacy) |
| Pharmacist | `sana@takecare.demo` | `Password123!` (GreenLeaf Pharmacy) |
| Pharmacist | `vikram@takecare.demo` | `Password123!` (Wellness Chemist — pending approval) |

---

## 11. Milestone Log

_Updated as implementation proceeds._

- M1 Foundation — completed.
- M2 Auth & Authorization — completed.
- M3 Customer Core — completed.
- M4 Pharmacy & Replenishment — completed.
- M5 AI Assistant — completed.
- M6 Frontend — completed.
- M7 Testing & Finalization — completed.

Deliverables: working API + UI, migrations, seed data, `.env.example` files, `README.md`, `API.md`, `DEMO.md`, root scripts, and a clean production build.

Remaining / postponed: Socket.IO live updates, advanced analytics, live LLM provider.
