# Data Contracts — Credit Dragon (Santiago's workstream)

Shared source of truth for the **credit-score coach** and **gamification** data. Shawn
(SwiftUI), Carlos (AI script) and Naomi (design/copy) build against these files.

> **⚠️ Read `CHANGES.md` first** — it records the pivot from "bill negotiator" to "credit
> trajectory" and the brand / data-integrity rules. This file is the field reference.

> **Files owned by Santiago:** `data/bills.json` · `data/rewards.json`.
> **Files owned by Carlos** (repo root — see §4): `mia_transactions.json` · `mia_questions.json`.

---

## 1. `data/bills.json`

Top-level:

| Field | Type | Meaning |
|---|---|---|
| `persona` / `currency` / `as_of` | string | `"Mia"`, `"AUD"`, `"YYYY-MM-DD"`. |
| `data_notice` | string | The framing line: a credit-score coach, never a broker. |
| `score` | object | Bureau score anchor + forecast (§1a). |
| `credit_file` | object | Goal, BNPL, dishonour risk (§1b). |
| `westpac_products[]` | array | Westpac's own products from CDR PRD (§1c). |
| `payday` | object | `{ frequency, next }`. |
| `totals` | object | Reference numbers (potential cash freed = phone + internet only). |
| `recommendations` | array | `[]` — the old streaming "keep one" is retired. |
| `bills[]` | array | The **findings** — habits/patterns mapped to credit (§1d). |

### 1a. `score`

`value` · `scale` (`"equifax_au"`) · `max` (1200) · `source` (`"Equifax"`) · `refreshed_at` ·
`consent` (true) · `demo_sample` (true) · `forecast` (`{ range:[635,650], horizon_months,
assumption, previous:{ value, refreshed_at, predicted_range, actual } }`).

The forecast is always a **range with a stated assumption**, never a single promised number.

### 1b. `credit_file`

- `goal` / `goal_date` — "Car loan in 12 months" · 2027-11-16.
- `bnpl.providers[]` — `{ name, facilities, instalments_due, next_due, amount_due }`.
- `bnpl.enquiries_6m` · `bnpl.active_facilities` · `bnpl.note` (BNPL *is* credit).
- `dishonour` — `{ bill_id, risk, reason, action }`.

### 1c. `westpac_products[]` (tier 2 — Westpac promoting Westpac)

`{ id, name, category, brand, purchase_rate_pct, comparison, fee_note, source, source_url,
overview_uri, checked_at, note }`. Sourced from Westpac's public CDR PRD endpoint (live).

### 1d. `bills[]` — the findings

| Field | Values / meaning |
|---|---|
| `id` | stable key (`bill_card`, `bill_bnpl`, `bill_gym`, `bill_phone`, …). |
| `factor` | `credit` / `cash` / `fees` / `none` — the three-bucket chip. |
| `evidence_tier` | `westpac_transactions` / `gov_benchmark` / `westpac_prd` / `provider_price`. |
| `savings_status` | `potential` / `none` (and later `pending` / `verified` / `lapsed`). |
| `action_type` | `remind` · `protect` · `track` · `keep` · `no_offer`. **No `switch`/`cancel`.** |
| `advice` | The one action-oriented line. |
| `benchmark` | (phone only) `{ low, high, source, source_url, checked_at, note }`. |
| `finding` | One-line headline. |
| `evidence` | `[{ k, v }]` — transaction-grounded facts. |
| `why` | Why it matters to your score / cash. |
| `risk_notes` | Caveat. |
| `verification` | `{ checked_at, source }`. |
| `savings_monthly` / `savings_annual` | Cash potential (0 for credit/fees/informational). |
| `xp` / `coins` | Reward for acting (mirrors the action's value in `rewards.json`). |

`action_type` → action mapping (a finding is **acted on**, never "approved to switch"):

| action_type | Button | Action (rewards.json) | XP |
|---|---|---|---|
| `remind` | Set a reminder | `reminder_set` | 100 |
| `protect` | Protect balance | `protected_balance` | 60 |
| `track` | Track this | `insight_tracked` | 40 |
| `keep` / `no_offer` | — | — | 0 |

---

## 2. `data/rewards.json`

Top-level: `version`, `currency`, `credit_factors[]`, `starting_state`, `actions[]`,
`levels[]`, `stages[]`, `goals[]`, `shop[]`.

- `credit_factors[]` — `{ id, label, impact, direction, what }` (repayment_history ·
  credit_enquiries · limits_debt · defaults).
- `actions[]` — `question_answered`, `goal_completed`, `on_time_repayment`,
  `no_new_bnpl_month`, `reminder_set`, `protected_balance`, `insight_tracked`,
  `saving_verified`, `savings_streak_4wk`, `shop_purchase`.
- `levels[]` — 10 levels (0 → 2700 XP).
- `stages[]` — egg 0 · baby 250 · teen 800 · adult 1500.
- `goals[]` — `{ id, title, description, xp, coins, progress_source, progress_hint }`,
  where `progress_source` ∈ `reminder_set` / `protected_balance` / `manual`.
- `shop[]` — `{ id, name, slot, slot_label, cost, emoji, image, description, … }`.

Shop `slot`: `hat` / `face` / `neck` / `home` (scene) / `food` (repeatable) / `perk` (locked).

---

## 3. Runtime state (prototype `localStorage`, SwiftUI `@AppStorage`)

```json
{
  "version": 2,
  "xp_total": 320,
  "coins": 120,
  "streak_weeks": 3,
  "protected": false,
  "bills": { "bill_card": { "status": "done" } },
  "goals": { "goal_repay_on_time": { "status": "completed" } },
  "shop": {
    "owned": ["item_tophat"],
    "equipped": { "hat": "item_tophat", "face": null, "neck": null, "home": null },
    "feeds": 0,
    "fed_at": null
  },
  "choices": {},
  "awarded": ["bill_card:reminder_set"],
  "ledger": [ { "ts": "…", "action": "reminder_set", "source_id": "bill_card", "xp": 100, "coins": 60, "reason": "Credit card repayment" } ]
}
```

- `bills[id].status` ∈ `"done"` (acted on) / `"dismissed"` / absent (pending).
- `protected` = whether the protected balance is set (toggles from the gym finding / Score tab).
- `awarded[]` idempotency key = `"{source_id}:{action_id}"`.
- Derived, never stored: `level`, `stage`.

---

## 4. Known mismatches to reconcile as a team

1. **Carlos's files** are at the repo root (`mia_transactions.json`, `mia_questions.json`).
   Recommend moving to `/data/` and dropping the `mia_` prefix.
2. **`detected_from` placeholders** — `bill_card` and `bill_bnpl` have `[]`; Carlos to map
   the late-card and BNPL transaction ids.
3. **Persona detail** — brief §3 said "Anytime Fitness"; Carlos's transactions use
   **Goodlife Health Clubs**. `bills.json` follows Carlos.
4. **Score scale + BNPL status** — verify the Equifax scale and the current BNPL credit
   regime wording before they go on a slide.
