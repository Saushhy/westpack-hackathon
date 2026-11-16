# Data Contracts — Credit Dragon (Santiago's workstream)

Shared source of truth for the **bill negotiator** and **gamification** data. Shawn (SwiftUI),
Carlos (AI script) and Naomi (design/copy) build against these files.

> **Files owned by Santiago:**
> - `data/bills.json` — bills the negotiator found, with offers + savings.
> - `data/rewards.json` — XP/coin rules, levels, dragon stages, goals, shop.
>
> **Files owned by Carlos** (already in repo, at root — see "Known mismatches" below):
> - `mia_transactions.json`
> - `mia_questions.json`

---

## 1. `data/bills.json`

Top-level:

| Field | Type | Meaning |
|---|---|---|
| `persona` | string | Demo customer (`"Mia"`). |
| `currency` | string | `"AUD"`. |
| `as_of` | string | `"YYYY-MM-DD"` the analysis is current as of. |
| `payday.frequency` | string | `"fortnightly"`. |
| `payday.next` | string | Next pay date. |
| `totals.recurring_monthly` | number | Monthly total of the *negotiable* recurring set (phone + internet + streaming). Matches Carlos's `q_005` figure: **216.97**. |
| `totals.savings_monthly` | number | Total monthly savings from switch + cancel actions: **92.99**. |
| `totals.savings_annual` | number | `92.99 × 12` = **1115.88**. |
| `totals.potential_monthly_after_switching` | number | `216.97 − 92.99` = **123.98**. |

> Gym and rent are **excluded** from `totals` because they produce no cash saving
> (reschedule / no-offer). They still appear in `bills` so the demo shows the AI is honest.

Each entry in `bills[]`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable key, e.g. `bill_phone`. Used for award idempotency. |
| `category` | string | `mobile` / `internet` / `streaming` / `fitness` / `housing`. |
| `icon` | string | Emoji for the prototype UI only. |
| `label` | string | Human label. |
| `provider` | string | Current provider / merchant. |
| `plan` | string | Current plan name. |
| `billing_period` | string | `"monthly"` or `"fortnightly"`. |
| `current_amount` | number | Price **per billing period**. |
| `current_monthly` | number | Monthly equivalent (for totals & savings). |
| `detected_from` | string[] | **Carlos's transaction ids** this bill was inferred from. |
| `confidence` | string | `high` / `medium`. |
| `action_type` | string | One of `switch`, `cancel`, `reschedule`, `keep`, `no_offer`. |
| `offer` | object \| null | Replacement offer (see below). `null` for `cancel`/`keep`/`no_offer`. |
| `savings_monthly` | number | Monthly saving after approving. |
| `savings_annual` | number | Annual saving. |
| `why` | string | The "why am I asking" explanation shown on the card. |
| `risk_notes` | string \| null | Any caveat shown before approval. |
| `requires_approval` | boolean | Always `true` for actionable bills (human-in-the-loop). |
| `xp` / `coins` | number | Reward for approving this bill. Zero for non-actions. |

`offer` object:

| Field | Type |
|---|---|
| `provider`, `plan` | string |
| `amount` | number (per `billing_period`) |
| `billing_period` | string |
| `monthly` | number (monthly equivalent) |
| `features` | string[] |
| `contract` | string |
| `setup_days` | number |

### The action types

| action_type | Meaning | Example |
|---|---|---|
| `switch` | Replace with a cheaper plan. | Vodafone → Belong. |
| `cancel` | Cancel a redundant subscription. | Stan, Disney+. |
| `reschedule` | Move a debit date (no cash saving, avoids fees). | Goodlife gym. |
| `keep` | Reviewed, no change recommended. | Netflix (used weekly), Spotify (student). |
| `no_offer` | Essential, no cheaper option found. | Rent. |

The `keep` and `no_offer` rows are the credibility signal: the AI does **not** invent
savings or cancel things the customer actually uses.

---

## 2. `data/rewards.json`

Top-level:

| Field | Meaning |
|---|---|
| `version` | Schema version (`1`). |
| `currency` | `"coins"`. |
| `starting_state` | Baseline `{ xp_total, coins, streak_weeks }` for the demo. |
| `actions[]` | Reward rules (see below). |
| `levels[]` | XP thresholds per level. |
| `stages[]` | Dragon evolution thresholds. |
| `goals[]` | The 3 credit-health plan goals. |
| `shop[]` | Items purchasable with coins. |

`actions[]` entries:

| Field | Meaning |
|---|---|
| `id` | Action id (links to `bill.action_type` / goal completion). |
| `label` | Display name. |
| `xp`, `coins` | Reward. `coins: null` = spends an item's `cost` (shop_purchase). |
| `cap` | `{ type, limit }`. Types: `per_bill`, `per_goal`, `per_month`, `none`. |
| `why_rewards_you` | The explainable reason (shown in the UI / used in pitch). |

`levels[]`: `{ level, xp_required }` — 10 levels: 0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700.

`stages[]`: `{ id, name, xp_required, emoji, image }` —
egg (0) → baby (250) → teen (800) → adult (1500).

`goals[]`: `{ id, title, description, xp, coins, progress_source, target? }`.
`progress_source` is `manual` or `bill_savings` (the "cut bills" goal auto-tracks savings vs `target`).

`shop[]`: `{ id, name, slot, cost, emoji, image, locked?, description }`.
The `item_perk` (0.25% bonus savings rate) is `locked: true` — a pitch hook, not purchasable.

---

## 3. Runtime state (for Shawn's SwiftUI + our prototype)

Persisted locally (prototype uses `localStorage` key `credit-dragon:state`). SwiftUI should
persist the same shape (e.g. `UserDefaults`/`@AppStorage` as JSON):

```json
{
  "version": 1,
  "xp_total": 320,
  "coins": 120,
  "streak_weeks": 3,
  "bills": { "bill_phone": { "status": "pending", "approved_at": null } },
  "goals": { "goal_repay_on_time": { "status": "pending", "completed_at": null } },
  "shop": { "owned": ["item_feast"], "equipped": {} },
  "awarded": ["bill_phone:bill_switch"],
  "ledger": [
    {
      "ts": "2026-11-16T13:00:00Z",
      "action": "bill_switch",
      "source_id": "bill_phone",
      "xp": 120,
      "coins": 80,
      "reason": "Switched Vodafone → Belong"
    }
  ]
}
```

- **Derived, never stored:** `level` (highest `levels[]` where `xp_required ≤ xp_total`),
  `stage` (highest `stages[]` where `xp_required ≤ xp_total`).
- **Idempotency key:** `"{source_id}:{action_id}"` — e.g. `bill_phone:bill_switch`,
  `goal_repay_on_time:goal_completed`. Stored in `awarded[]` so nothing ever double-pays.
- **Monthly caps** (`per_month`) are evaluated against the ledger timestamps for the
  current calendar month.

---

## 4. Known mismatches to reconcile as a team

1. **Carlos's files are at the repo root**, named `mia_transactions.json` and
   `mia_questions.json`. The brief (`AGENTS.md` §4) expected `transactions.json` +
   `questions.json` under `/data/`. *Recommend moving them into `/data/` and dropping the
   `mia_` prefix so all AIs agree on one path — but that's Carlos's call.*
2. **Savings headline.** Carlos's `q_005` says "~$75/month → $900/year" as a first-pass
   estimate. The full negotiator lands at **$92.99/month → $1,115.88/year** (phone −$54,
   internet −$9, Stan −$16, Disney+ −$13.99). In the video, frame it as "the AI's quick
   estimate was ~$75; the full negotiator found $93". Don't let the two numbers appear as a
   contradiction — pick one phrasing and use it everywhere.
3. **Persona detail.** The brief §3 persona said "Anytime Fitness"; Carlos's transactions
   use **Goodlife Health Clubs** ($34/fortnight, dishonoured 15 Oct). `bills.json` follows
   Carlos (Goodlife). Update the brief/pitch to Goodlife.
