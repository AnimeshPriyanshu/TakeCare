# TakeCare API Reference

Base URL: `http://localhost:3001/api`
Health check: `GET http://localhost:3001/health`

All request and response bodies are JSON. Authentication uses the `takecare_token` httpOnly cookie set by login/register. For API tooling, an `Authorization: Bearer <jwt>` header is also accepted.

Every error uses this shape:

```json
{
  "error": {
    "message": "Human-readable message",
    "details": [{ "path": "field", "message": "Why it failed" }]
  }
}
```

`details` is present for validation errors.

| Status | Meaning |
| --- | --- |
| `200` | OK |
| `201` | Created |
| `400` | Validation or business-rule failure |
| `401` | Missing/invalid session |
| `403` | Wrong role |
| `404` | Not found or not owned by the caller |
| `409` | Invalid state transition, duplicate, or already applied |

---

## Auth

### `POST /auth/register`

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "Password123!",
  "role": "CUSTOMER",
  "pharmacy": {
    "name": "CarePlus Pharmacy",
    "address": "12 Main Road",
    "city": "Bengaluru",
    "pincode": "560095",
    "phone": "+91 98450 11223",
    "licenseNumber": "KA-PH-2024-0192",
    "description": "Optional"
  }
}
```

`pharmacy` is required when `role` is `PHARMACIST`. New demo pharmacies are auto-approved. Sets the auth cookie.

Returns `201 { user }`.

### `POST /auth/login`

```json
{ "email": "aarav@takecare.demo", "password": "Password123!" }
```

Returns `{ user }` and sets the cookie.

### `POST /auth/logout`

Clears the cookie. Returns `{ message }`.

### `GET /auth/me`

Returns the authenticated `{ user }`, including a compact `pharmacy` summary for pharmacists.

---

## Medicines (customer only)

### `GET /medicines`

Returns `{ medicines: [] }`, including inactive medicines and family-member links. Each medicine is serialized with:

| Field | Meaning |
| --- | --- |
| `confirmedStock` | Baseline count from recorded transactions |
| `estimatedStock` | `max(0, confirmedStock − dailyUnits × elapsedDays)` |
| `dailyUnits` | User-provided usage per day |
| `elapsedDays`, `consumed` | Estimation inputs |
| `lowStock` | `estimatedStock <= reorderThreshold` |
| `daysRemaining` | `floor(estimatedStock / dailyUnits)`, or `null` |

### `POST /medicines`

```json
{
  "name": "Metformin",
  "strength": "500 mg",
  "form": "Tablet",
  "unitLabel": "tablet",
  "confirmedStock": 30,
  "dailyUnits": 2,
  "dosageSchedule": "1 after breakfast, 1 after dinner",
  "reorderThreshold": 10,
  "familyMemberId": null
}
```

Returns `201 { medicine }`. An initial stock transaction is written when stock is greater than zero.

### `GET /medicines/:id`

Returns `{ medicine, history }` where `history` is the latest 100 ledger transactions.

### `PATCH /medicines/:id`

Accepts any subset of the create fields. Returns `{ medicine }`.

### `POST /medicines/:id/deactivate`

Hides the medicine from active views. Returns `{ medicine }`.

### `POST /medicines/:id/reactivate`

Returns `{ medicine }`.

### `POST /medicines/:id/transactions`

```json
{ "type": "PURCHASE", "quantity": 30, "note": "Bought from CarePlus" }
```

- `type`: `PURCHASE` or `CORRECTION`.
- `PURCHASE` requires a positive quantity and adds stock.
- `CORRECTION` applies a signed difference and clamps at zero.
- Resets `lastConfirmedAt`, so estimation restarts from the new baseline.

Returns `201 { medicine, transaction }`. Inactive medicines cannot be updated.

### `GET /medicines/:id/history`

Returns `{ medicine, transactions }`.

---

## Family members (customer only)

### `GET /family-members`

Returns `{ familyMembers }`, each with `_count.medicines`.

### `POST /family-members`

```json
{ "name": "Ananya Sharma", "relation": "Mother" }
```

Returns `201 { familyMember }`.

### `DELETE /family-members/:id`

Blocked with `400` while medicines are linked. Returns `{ message }`.

---

## Pharmacy directory (any authenticated user)

### `GET /pharmacies?search=care`

Returns approved, active pharmacies only:

```json
{
  "pharmacies": [
    {
      "id": "...",
      "name": "CarePlus Pharmacy",
      "city": "Bengaluru",
      "address": "...",
      "phone": "...",
      "description": "...",
      "catalogCount": 7,
      "availableCount": 5
    }
  ]
}
```

### `GET /pharmacies/:id`

Returns `{ pharmacy }` with the full catalog. Unapproved/inactive pharmacies return `404`.

---

## Pharmacist profile and catalog (pharmacist only)

> Routes are mounted at both `/pharmacist/*` and `/pharmacy/*`. The frontend uses `/pharmacist/*`.

### `GET /pharmacist/me`

Returns `{ pharmacy }` (or `{ pharmacy: null }`) with catalog and counts, including `requests` and `catalog` counts.

### `PUT /pharmacist/me`

Creates or updates the caller's pharmacy. Same fields as the registration `pharmacy` object plus optional `isActive`.

Returns `{ pharmacy }` (`201` when created).

### `GET /pharmacist/catalog`

Returns `{ catalog }` for the caller's pharmacy.

### `POST /pharmacist/catalog`

```json
{
  "name": "Amoxicillin",
  "strength": "500 mg",
  "form": "Capsule",
  "unitLabel": "capsule",
  "quantityAvailable": 40,
  "price": 8.5,
  "isAvailable": true
}
```

Returns `201 { item }`. `(pharmacyId, name, strength, form)` must be unique.

### `PATCH /pharmacist/catalog/:id`

Accepts any subset. Common uses: toggle `isAvailable`, update `quantityAvailable` or `price`. Returns `{ item }`.

### `DELETE /pharmacist/catalog/:id`

Returns `{ message }`. Existing requests keep their recorded medicine name.

---

## Customer requests (customer only)

### `POST /requests`

```json
{
  "pharmacyId": "...",
  "medicineId": "...",
  "pharmacyMedicineId": "...",
  "quantityRequested": 30,
  "note": "Running low this week"
}
```

`medicineId` must be an active medicine owned by the caller. `pharmacyMedicineId` is optional; when supplied it must belong to the chosen pharmacy.

Returns `201 { request }` with `status: "PENDING"`. Notifies the pharmacist and logs activity.

### `GET /requests`

Returns `{ requests }`, newest first, with customer, pharmacy, medicine and catalog snapshots.

### `GET /requests/:id`

Returns `{ request }`. Cross-customer access returns `404`.

### `POST /requests/:id/accept-proposal`

Only valid from `COUNTER_PROPOSED`. Sets `CUSTOMER_ACCEPTED`. Returns `{ request }`.

### `POST /requests/:id/decline-proposal`

Only valid from `COUNTER_PROPOSED`. Sets `CUSTOMER_DECLINED`. Returns `{ request }`.

### `POST /requests/:id/cancel`

Only valid from `PENDING`. Sets `CANCELLED`. No inventory change. Returns `{ request }`.

### `POST /requests/:id/confirm-receipt`

Only valid from `FULFILLED`. Adds the final quantity (`quantityProposed ?? quantityRequested`) to the medicine's confirmed stock, writes a `REQUEST_FULFILLMENT` ledger row, sets `COMPLETED` and `inventoryAppliedAt`.

The operation is **exactly-once**:

- Conditional claim on `status = FULFILLED` and `inventoryAppliedAt = null`.
- Unique `replenishmentRequestId` on the ledger row.
- A repeat call returns `409`.

Returns `{ request }` with `inventoryAppliedAt` populated.

---

## Pharmacist requests (pharmacist only)

### `GET /pharmacist/requests`

Returns `{ requests }` for the caller's pharmacy, newest first.

### `POST /pharmacist/requests/:id/respond`

Accept:

```json
{ "action": "ACCEPT", "note": "Ready after 5 pm" }
```

Reject:

```json
{ "action": "REJECT", "note": "Out of stock until Monday" }
```

Propose a different quantity:

```json
{ "action": "PROPOSE", "quantity": 10, "note": "Partial strip available" }
```

Only valid from `PENDING`. `PROPOSE` requires `quantity`. Returns `{ request }` and notifies the customer.

### `POST /pharmacist/requests/:id/fulfill`

```json
{ "note": "Handed over at the counter" }
```

Only valid from `ACCEPTED` or `CUSTOMER_ACCEPTED`. Sets `FULFILLED`; inventory is **not** changed until the customer confirms receipt. Returns `{ request }`.

---

## Notifications (authenticated)

### `GET /notifications`

Returns `{ notifications, unread }`, newest first, up to 50.

### `POST /notifications/:id/read`

Returns `{ message }`; `404` if not owned.

### `POST /notifications/read-all`

Returns `{ message }`.

---

## Dashboards

### `GET /dashboard/customer` (customer only)

Returns `{ stats, lowStock, medicines, activeRequests, recentRequests, recentActivity }`.

### `GET /dashboard/pharmacist` (pharmacist only)

Returns `{ needsPharmacy, pharmacy, stats, recentRequests, lowCatalog, recentActivity, statusCounts }`.

When no pharmacy profile exists: `{ needsPharmacy: true, stats: null }`.

---

## AI assistant (customer only)

### `POST /ai/chat`

```json
{ "message": "I purchased 10 more tablets of Metformin" }
```

Returns:

```json
{
  "mode": "demo",
  "reply": "I can record a purchase of **10 tablet(s)** …",
  "action": {
    "id": "...",
    "type": "ADD_STOCK",
    "medicine": { "id": "...", "name": "Metformin 500 mg", "unitLabel": "tablet" },
    "quantity": 10,
    "summary": "Add 10 tablet(s) to Metformin 500 mg"
  },
  "suggestions": [],
  "messageId": "..."
}
```

`action` is `null` when no confirmation is needed. Actions expire after 15 minutes. The amount is stored server-side; the client only sends the action id.

### `POST /ai/actions/:id/confirm`

Applies the stored `ADD_STOCK` or `CORRECTION` exactly once inside a transaction, writes a ledger row and activity, and resets the low-stock notification flag. Returns `{ message, medicine }`; repeat/expired calls return `409`.

### `POST /ai/actions/:id/cancel`

Cancels a pending action without changing inventory. Returns `{ message }`.

### `GET /ai/history`

Returns `{ messages }` — the caller's latest 100 persisted chat messages in chronological order.

Assistant behavior:

- Reads live medicines, requests and catalogs; no invented data.
- Asks for clarification on ambiguous medicine names.
- Refuses dosage/medical advice.
- Never writes inventory before explicit confirmation.

---

## Request status reference

| Status | Meaning |
| --- | --- |
| `PENDING` | Waiting for pharmacist response |
| `ACCEPTED` | Pharmacist accepted the requested quantity |
| `REJECTED` | Pharmacist cannot fulfil (terminal) |
| `COUNTER_PROPOSED` | Pharmacist offered a different quantity |
| `CUSTOMER_ACCEPTED` | Customer accepted the proposal |
| `CUSTOMER_DECLINED` | Customer declined the proposal (terminal) |
| `FULFILLED` | Pharmacist marked it handed over; customer must confirm |
| `COMPLETED` | Customer confirmed receipt; inventory applied |
| `CANCELLED` | Customer cancelled while pending (terminal) |
