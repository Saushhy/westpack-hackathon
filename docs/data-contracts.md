# Data Contracts — Credit Dragon (Santiago's workstream)

Shared source of truth for the **bill negotiator** and **gamification** data. Shawn (SwiftUI),
Carlos (AI script) and Naomi (design/copy) build against these files.

> **Files owned by Santiago:**
> - `data/bills.json` — bills the negotiator found, with offers + savings + provider links.
> - `data/rewards.json` — XP/coin rules, levels, dragon stages, goals, shop.
>
> **Files owned by Carlos** (at repo root — see "Known mismatches"):
> - `mia_transactions.json`
> - `mia_questions.json`

---

## 1. `data/bills.json`

Top-level:

| Field | Type | Meaning |
|---|---|---|
| `persona` | string | `"Mia"`. |
| `currency` | string | `"AUD"`. |
| `as_of` | string | `"YYYY-MM-DD"` the analysis is current as of. |
| `data_notice` | string | Shown in the UI: prices are sample data; links are real; confirm with provider. |
| `payday.frequency` / `payday.next` | string | Pay cycle. |
| `totals.*` | number | Headline numbers (see below). |
| `recommendations[]` | array | Cross-bill "keep one" recommendations (streaming). |

`totals` — the negotiable recurring set is **phone + internet + streaming**:
`recurring_monthly` 216.97 · `savings_monthly` 92.99 · `savings_annual` 1115.88 ·
`potential_monthly_after_switching` 123.98. Gym and rent are excluded (no cash saving).

### `recommendations[]` (keep-one)

| Field | Meaning |
|---|---|
| `id` | e.g. `rec_streaming`. |
| `kind` | `"keep_one"` — the customer keeps one of `bill_ids`, the AI proposes pausing the rest. |
| `label` / `title` | Panel heading. |
| `bill_ids` | The bills in the group (Netflix, Stan, Disney+). |
| `default_keep` | Which bill is pre-selected (Netflix). |
| `what_we_know` | Transaction-grounded facts only. |
| `what_we_dont_know` | The honesty line — **no viewing claims** (transactions can't see what you watch). |
| `recommendation` | The AI's suggestion. |
| `constraint` | "Nothing is cancelled until you review and approve." |

### Each entry in `bills[]`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable key, e.g. `bill_phone`. |
| `category` | string | `mobile` / `internet` / `streaming` / `fitness` / `housing`. |
| `icon` | string | Emoji fallback only (UI uses GEL SVG icons). |
| `label`, `provider`, `plan` | string | Current plan. |
| `billing_period` | string | `"monthly"` / `"fortnightly"`. |
| `current_amount` | number | Price **per period**. |
| `current_monthly` | number | Monthly equivalent. |
| `provider_url` | string \| null | Link to the current provider (data-integrity check). |
| `detected_from` | string[] | Carlos's transaction ids. |
| `confidence` | string | `high` / `medium`. |
| `streaming` | boolean | Marks the bill as part of a streaming `keep_one` group. |
| `action_type` | string | `switch` / `cancel` / `reschedule` / `keep` / `no_offer`. |
| `offer` | object \| null | Replacement offer (see below). `null` for cancel/keep/no-offer. |
| `cancellation` | object \| null | For `cancel`: `{ commitment, ends, url, url_label }`. |
| `finding` | string | One-line headline shown on the card (≤ ~12 words). |
| `evidence` | array | `[{ k, v }]` label/value facts, transaction-derived — shown as the "how we know" rows. |
| `verification` | object \| null | `{ checked_at, source }` shown in the review sheet. |
| `savings_monthly` / `savings_annual` | number | Saving after approving. |
| `why` | string | Plain-language explanation (kept short; the numbers live in `evidence`). |
| `risk_notes` | string \| null | Caveat shown before approval. |
| `requires_approval` | boolean | Always `true` for actionable bills. |
| `xp` / `coins` | number | Reward for approving. |

`offer` object: `provider`, `plan`, `amount`, `billing_period`, `monthly`, `features`,
`contract`, `setup_days`, plus `commitment`, `includes`, `starts`, and `url` (provider page).

### Action types

| action_type | Meaning | Example |
|---|---|---|
| `switch` | Replace with a cheaper plan. | Vodafone → Belong. |
| `cancel` | Cancel a subscription (individual **or** inside a `keep_one` group). | Stan, Disney+. |
| `reschedule` | Move a debit date (avoids fees, no cash saving). | Goodlife gym. |
| `keep` | Reviewed, no change. | Spotify (already cheapest). |
| `no_offer` | Essential, no cheaper option. | Rent. |

Streaming is modelled as `cancel` bills that belong to the `rec_streaming` **keep-one** group.
The customer picks which one to keep; the other two are the ones offered for cancellation.
Netflix is a `cancel` bill too — it is only "kept" because `default_keep` points at it, so the
customer can choose any of the three.

---

## 2. `data/rewards.json`

Top-level: `version` (`1`), `currency`, `starting_state`, `actions[]`, `levels[]`,
`stages[]`, `goals[]`, `shop[]`.

- `levels[]`: 10 levels at `0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700` XP.
- `stages[]`: `{ id, name, xp_required, emoji, image }` — egg 0 · baby 250 · teen 800 · adult 1500.
  (`image` is a placeholder; the prototype renders the dragon as layered **SVG** so gear can be attached.)
- `goals[]`: `{ id, title, description, xp, coins, progress_source, target? }`.
- `shop[]`: `{ id, name, slot, slot_label, cost, emoji, image, description, locked?, unlock_level?, scene?, repeatable? }`.

Shop `slot` values (each maps to a wear/use behaviour in the Dragon tab):

| slot | Worn / used | Example |
|---|---|---|
| `hat` | Sits on the dragon's head at any stage. | Top Hat, Peak Cap, Gold Crown. |
| `face` | Rests over the eyes. | Sunset Sunnies. |
| `neck` | Wraps the neck. | Westpac Scarf. |
| `home` | Changes the **scene** behind the dragon (`scene`: `lava` / `stars`). | Lava Lair, Starry Cave. |
| `food` | Consumable — feeding it makes the dragon hop (`repeatable: true`). | Dragon Feast. |
| `perk` | Pitch concept, `locked: true`. | 0.25% bonus savings rate. |

`unlock_level` gates an item by level (Gold Crown unlocks at Level 5).

---

## 3. Runtime state (prototype `localStorage`, SwiftUI `@AppStorage`)

```json
{
  "version": 2,
  "xp_total": 320,
  "coins": 120,
  "streak_weeks": 3,
  "bills": { "bill_phone": { "status": "pending" } },
  "goals": { "goal_repay_on_time": { "status": "pending" } },
  "shop": {
    "owned": ["item_tophat"],
    "equipped": { "hat": "item_tophat", "face": null, "neck": null, "home": null },
    "feeds": 0,
    "fed_at": null
  },
  "choices": { "rec_streaming": "bill_netflix" },
  "awarded": ["bill_phone:bill_switch"],
  "ledger": [ { "ts": "…", "action": "bill_switch", "source_id": "bill_phone", "xp": 120, "coins": 80, "reason": "…" } ]
}
```

- **`shop.equipped`** is keyed by `slot` and stores an item `id` (not the item object).
- **`choices`** stores the customer's keep-one pick (the AI recommends, they decide).
- **`feeds` / `fed_at`** track food — food is repeatable and never stored in `owned`.
- **Derived, never stored:** `level`, `stage`.
- **Idempotency key:** `"{source_id}:{action_id}"` in `awarded[]`.
- **Monthly caps** are evaluated against ledger timestamps for the current month.

---

## 4. Known mismatches to reconcile as a team

1. **Carlos's files are at the repo root** (`mia_transactions.json`, `mia_questions.json`).
   Recommend moving to `/data/` and dropping the `mia_` prefix.
2. **Savings headline.** Carlos's `q_005` says "~$75/mo → $900/yr"; the full negotiator is
   **$92.99/mo → $1,115.88/yr**. Pick one phrasing and use it everywhere in the video.
3. **Persona detail.** Brief §3 said "Anytime Fitness"; Carlos's transactions use
   **Goodlife Health Clubs**. `bills.json` follows Carlos (Goodlife).
4. **Streaming framing.** The AI sees only that Mia pays for three streaming services — it
   **cannot** tell what she watches. The demo must say so (it does): "keep one, we pause the
   other two, you decide." Do not claim "Stan hasn't been watched in 6 weeks" anywhere.
