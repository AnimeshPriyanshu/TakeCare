# TakeCare Demo Walkthrough

A 5–7 minute script that shows both roles, the full replenishment lifecycle, exactly-once inventory updates and the grounded assistant.

## Before you present

```bash
npm run db:up     # ensure Postgres is running on 5433
npm run db:seed   # reset the seeded demo state
npm run dev       # API :3001 + client :3000
```

Voice input also needs `GNANI_API_KEY` in `server/.env`; restart the API after changing it. Text chat works without the key.

Open <http://localhost:3000> and use the **Demo quick fill** buttons on the login page, or these accounts (password for all: **`Password123!`**):

| Role | Email |
| --- | --- |
| Customer | `aarav@takecare.demo` |
| Pharmacist | `raghav@takecare.demo` |

> Run `npm run db:seed` again after the demo to restore the starting state.

---

## 1. Customer overview (45 seconds)

Sign in as **`aarav@takecare.demo`**.

- The dashboard shows **6 active medicines**, **1 low-stock item** (Amlodipine, estimated 3 tablets), **4 active requests** and recent activity.
- Point out the estimation disclaimer: estimated stock is derived from the last confirmed baseline and daily usage; it never writes to the ledger.
- Open **Medicines → Amlodipine 5 mg**:
  - Confirmed 12, estimated 3, threshold 5.
  - Show the **stock history** ledger (`INITIAL`, purchases/corrections).
  - Open **Update stock**, explain purchase vs correction, then close without saving.

**Talking point:** confirmed stock changes only through recorded transactions; estimation is read-only.

---

## 2. Pharmacy discovery and requests (60 seconds)

- Open **Pharmacies**:
  - Only approved, active pharmacies appear: **CarePlus** and **GreenLeaf**.
  - Wellness Chemist (`vikram@takecare.demo`) is pending approval and hidden.
- Open **CarePlus Pharmacy** and point out the catalog and “availability is pharmacist-reported” note.
- Go to **Requests**:
  - `PENDING` Amlodipine, `ACCEPTED` Amoxicillin, `FULFILLED` Cetirizine, `COMPLETED` Atorvastatin, plus a `COUNTER_PROPOSED` Metformin from GreenLeaf.
- Open the **Metformin** request (counter proposal):
  - Show the request timeline.
  - Point out “Accept offer” / “Decline offer” and the proposed quantity (20 instead of 30).
  - Accept the offer. Status becomes **CUSTOMER_ACCEPTED**; no inventory changes yet.

---

## 3. Pharmacist queue (90 seconds)

Sign out and sign in as **`raghav@takecare.demo`** (CarePlus).

- Dashboard: pending queue, fulfilment queue and catalog warnings.
- Open **Requests**:
  - `PENDING` Amlodipine from Aarav.
  - Click **Accept** → confirm. Status becomes **ACCEPTED**. The customer gets a notification.
- Open **Catalog**:
  - Show the availability table.
  - Toggle one item off/on (e.g. Cetirizine) and explain that unavailable items are hidden from customers.
  - Optionally add a catalog item and delete it.
- Back in **Requests**, click **Mark fulfilled** on the accepted Amlodipine request and add a handover note.
- Also mark the already-accepted **Amoxicillin** request fulfilled.

**Talking point:** the pharmacist can accept, reject, or propose a different quantity. Fulfilment still does **not** change the customer's inventory.

---

## 4. Confirm receipt — exactly once (60 seconds)

Sign out, sign back in as **`aarav@takecare.demo`**.

- The dashboard now shows requests **ready to confirm**.
- Open **Requests → Amoxicillin (FULFILLED)**:
  - Show the confirmation warning: this will add 21 capsules to confirmed stock.
  - Click **Confirm receipt** and confirm.
  - Status becomes **COMPLETED**; the medicine page shows confirmed stock increased by exactly 21 and a new `REQUEST_FULFILLMENT` ledger row.
- Open the completed request again: there is no confirm action. (The API also returns `409` on any repeat attempt.)

**Talking point:** the inventory write is guarded by a conditional status claim, an `inventoryAppliedAt` timestamp and a unique ledger link — double confirmation cannot double-count stock.

---

## 5. AI assistant (60–90 seconds)

Stay signed in as Aarav and open **Assistant**.

1. Ask: **“Which medicines are running low?”**
   - It reads live data and lists Amlodipine.
2. Ask: **“How many tablets do I have left?”**
   - Per-medicine estimates from the live database.
3. Ask: **“I purchased 10 more tablets of Metformin”**
   - It shows the current stock and the proposed new stock.
   - Point out the **Confirm / Cancel** card: nothing is saved until confirmed.
   - Click **Confirm**; the medicine stock updates and a purchase ledger row is created.
4. Ask: **“Should I double my Metformin dose?”**
   - It refuses medical/dosage advice and redirects to a clinician.
5. Ask: **“Set Metformin stock to 44”**
   - Show the correction confirmation gate, then cancel it to demonstrate no-write-before-confirm.
6. Voice input:
   - Choose **English (India)** or **हिन्दी / Hinglish** next to the microphone.
   - Click the microphone, say **“I need ten tablets of Metformin”** (or upload a WAV/MP3/M4A file), then stop.
   - Show the live **Prisma v2.5** transcript appearing in the chat input. It is editable and is **not sent automatically**.
   - Edit if needed and press Send; the existing assistant handles the approved text.
   - Point out that the transcript alone never changes stock — an inventory action still shows the same Confirm/Cancel gate.

**Talking point:** text reasoning is the deterministic demo engine (`mode: "demo"`) over live data, while voice input is a real Gnani Prisma v2.5 transcription call. Recordings are converted locally to WAV, the API key stays server-side, and no transcript can bypass the inventory confirmation gate.

---

## 6. Wrap-up (30 seconds)

- Two role-specific dashboards on one shared backend.
- Full replenishment state machine with server-side authorization and invalid-transition protection.
- Append-only inventory ledger with exactly-once receipt confirmation.
- Grounded assistant with confirmation gates and safety guardrails.
- Real Gnani Prisma v2.5 voice transcription with review-before-send.
- Seeded demo data, notifications, activity feed and a responsive UI.

Reset for the next audience:

```bash
npm run db:seed
```

---

## Useful routes

| Route | Purpose |
| --- | --- |
| `/login`, `/register` | Auth with demo quick fill |
| `/customer` | Customer dashboard |
| `/customer/medicines` | Inventory + estimates |
| `/customer/medicines/:id` | Detail + ledger history |
| `/customer/pharmacies` | Directory + request creation |
| `/customer/requests` | Request list and actions |
| `/customer/requests/:id` | Timeline, proposal response, receipt confirmation |
| `/customer/assistant` | Demo assistant + Prisma voice input |
| `/customer/family` | Family-member profiles |
| `/pharmacist` | Pharmacist dashboard |
| `/pharmacist/pharmacy` | Profile and listing status |
| `/pharmacist/catalog` | Catalog CRUD |
| `/pharmacist/requests` | Accept / reject / propose / fulfil |

---

## If something looks off

| Symptom | Fix |
| --- | --- |
| Stock numbers changed during rehearsal | Run `npm run db:seed` |
| Login redirects back to `/login` | Confirm the API is on `3001` and both apps use `http://localhost` |
| API unreachable | `npm run dev:server`, check `http://localhost:3001/health` |
| Database connection error | `npm run db:up`, then `npm run db:seed` |
| Duplicate confirmation rejected | Expected: receipt confirmation is exactly-once |
