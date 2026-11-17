# Data Contracts: Credit Dragon (Santiago's workstream)

Shared source of truth for the **credit-score coach** and **gamification** data. Shawn
(SwiftUI), Carlos (AI script) and Naomi (design and copy) build against these files.

> **Read `CHANGES.md` first.** It records the pivot away from the bill negotiator and the
> rules behind the UI. This file is the field reference.

> **Files owned by Santiago:** `data/bills.json` · `data/rewards.json`.
> **Files owned by Carlos:** `mia_transactions.json` · `mia_questions.json` (repo root).

---

## 1. `data/bills.json`

Top level:

| Field | Type | Meaning |
|---|---|---|
| `persona` / `currency` / `as_of` | string | `"Mia"`, `"AUD"`, `"2026-11-17"`. `as_of` is the **demo clock**. |
| `data_notice` | string | The framing line: a coach, never a broker. |
| `score` | object | Bureau score and forecast (§1a). |
| `credit_file` | object | Goal, BNPL, dishonour risk (§1b). |
| `payday` | object | `{ frequency, next }`. |
| `totals` | object | `{ recurring_monthly, potential_cash_freed_monthly, potential_cash_freed_annual, fees_avoided }`. |
| `bills[]` | array | The **findings** (§1c). |

### 1a. `score`

`value` · `scale` (`"equifax_au"`) · `max` (1200) · `source` (`"Equifax"`) · `refreshed_at` ·
`consent` · `demo_sample` · `forecast: { range: [635, 650], horizon_months, assumption }`.

The forecast is always a **range with a stated assumption**, never a promised number.
There is deliberately no forecast history in the UI.

### 1b. `credit_file`

- `goal` / `goal_date` / `goal_note`: "Car loan in 12 months", 2027-11-17, "On track".
- `bnpl.providers[]`: `{ name, logo, match, plans, instalments_left, next_due, amount_due,
  paid_on_time, instalments_cycle }`.
  - `logo` is a path under `web/assets/brands/`.
  - `match` is the case-insensitive pattern used to find the real payments in the
    transaction file, so the Movements sheet is always checkable.
  - `paid_on_time` / `instalments_cycle` drive the "pay every Afterpay and Zip on time" goal.
- `bnpl.enquiries_6m` · `active_facilities` · `last_facility_date` (drives the "no new BNPL"
  goal) · `note`.
- `dishonour`: `{ bill_id, risk, reason, action }`.

### 1c. `bills[]`, the findings

| Field | Values / meaning |
|---|---|
| `id` | stable key (`bill_card`, `bill_bnpl`, `bill_gym`, ...). |
| `factor` | `credit` / `cash` / `fees` / `none`, the chip on the card. |
| `evidence_tier` | `westpac_transactions` / `gov_benchmark` / `provider_price`. |
| `savings_status` | `potential` / `none` (later `pending` / `verified` / `lapsed`). |
| `action_type` | `remind` · `protect` · `track` · `keep` · `no_offer`. |
| `logo` | path to a brand logo, or `null` for a GEL icon. |
| `provider_match` | `["Afterpay", "Zip"]`, the merchants this finding covers. |
| `benchmark` | (phone only) `{ low, high, source, source_url, checked_at, note }`. |
| `finding` | One short headline, under 12 words. |
| `evidence` | `[{ k, v }]`, transaction-grounded facts, 2 or 3 rows. |
| `why` | Why it matters. One sentence. |
| `advice` | The action line. One short sentence. |
| `verification` | `{ checked_at, source }`. |
| `savings_monthly` / `savings_annual` | Cash potential, 0 for credit and fees. |
| `xp` / `coins` | Mirrors the action in `rewards.json`. |

`action_type` to action:

| action_type | Button in the sheet | Action id | XP |
|---|---|---|---|
| `remind` | Set a reminder | `reminder_set` | 100 |
| `protect` | Protect balance | `protected_balance` | 60 |
| `track` | Track this | `insight_tracked` | 40 |
| `keep` / `no_offer` | none | none | 0 |

**Copy rule:** no em dashes or en dashes, and `why` stays under about 14 words. The audit
enforces the dash rule on every screen.

---

## 2. `data/rewards.json`

Top level: `version`, `currency`, `credit_factors[]`, `starting_state`, `actions[]`,
`levels[]`, `stages[]`, `goals[]`, `shop[]`.

- `credit_factors[]`: `{ id, label, impact, direction, what }`.
- `starting_state`: `{ xp_total: 320, coins: 200, streak_weeks: 3, checkins: [6 dates] }`.
  The six dates plus demo day make seven, so the weekly goal completes on first open.
- `actions[]`: `daily_checkin`, `checkin_week`, `question_answered`, `goal_completed`,
  `on_time_repayment`, `no_new_bnpl_month`, `reminder_set`, `protected_balance`,
  `insight_tracked`, `saving_verified`, `savings_streak_4wk`, `shop_purchase`.
- `levels[]`: 10 levels, 0 to 2700 XP.
- `stages[]`: egg 0 · baby 250 · teen 800 · adult 1500.
- `goals[]`: `{ id, title, description, xp, coins, source, target, unit, watching, next_check }`.

| Goal | `source` | `target` | Completes when |
|---|---|---|---|
| Your dragon checks your file daily | `checkin` | 7 | 7 check-ins in the last 7 days |
| Pay every Afterpay and Zip on time | `bnpl_on_time` | 4 | `paid_on_time` reaches the cycle total |
| Go a month without new BNPL | `no_new_bnpl` | 30 | 30 days since `last_facility_date` |

- `shop[]`: `{ id, name, slot, slot_label, cost, emoji, image, description, ... }`, where
  `slot` is `hat` / `face` / `neck` / `home` / `food` / `perk`.

---

## 3. Runtime state (`localStorage` in the prototype, `@AppStorage` in SwiftUI)

```json
{
  "version": 2,
  "xp_total": 550,
  "coins": 330,
  "streak_weeks": 3,
  "checkins": ["2026-11-11", "...", "2026-11-17"],
  "protected": false,
  "bills": { "bill_card": { "status": "done" } },
  "goals": { "goal_checkin": { "status": "completed" } },
  "shop": {
    "owned": ["item_cap"],
    "equipped": { "hat": "item_cap", "face": null, "neck": null, "home": null },
    "feeds": 0,
    "fed_at": null
  },
  "awarded": ["2026-11-17:daily_checkin", "..."],
  "ledger": [
    { "ts": "...", "action": "reminder_set", "source_id": "bill_card", "xp": 100, "coins": 60, "reason": "Credit card repayment" }
  ]
}
```

- `bills[id].status` is `"done"` (acted on) or `"dismissed"`, otherwise absent.
- `checkins[]` holds ISO local dates. `checkinsInWindow()` counts the last 7.
- `goals[id].status` is `"completed"`. Only `syncGoals()` may set it.
- `awarded[]` idempotency key is `"{source_id}:{action_id}"`.
- Derived, never stored: `level`, `stage`.

---

## 4. Known mismatches to reconcile as a team

1. **Carlos's files** sit at the repo root. `web/tools/build-data.js` reads
   `data/transactions.json` first and falls back to `mia_transactions.json`, so he can move
   it whenever he likes.
2. **`detected_from`** on `bill_card` is still `[]`. Carlos should map the late-repayment and
   card transactions once his file settles. `bill_bnpl` is already mapped.
3. **Persona detail**: brief §3 says "Anytime Fitness", the transactions say **Goodlife**.
   `bills.json` follows the transactions.
4. **Score scale and BNPL status** need a second pair of eyes before they go on a slide.
