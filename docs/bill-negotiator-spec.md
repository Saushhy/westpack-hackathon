# Bill Negotiator — screen spec (for Shawn's SwiftUI)

The states and copy Shawn needs to build the Bill Negotiator screen against `data/bills.json`.

## Screen flow

```
Bill list  →  tap a bill  →  detail / "why"  →  [Approve]  →  confirmation  →  list updates
```

## 1. Bill list

- Header banner: **"Your dragon found $92.99/month in savings — about $1,116 a year."**
- One card per `bills[]` entry, ordered by savings (switch → cancel → reschedule → keep/no_offer).
- Each actionable card shows: icon, label, current price (per period), → offer price, and a
  red **"Save $X/mo"** badge.
- `keep` / `no_offer` cards are muted with a small ✓ and no action button.

### Card copy per `action_type`

| type | badge | CTA |
|---|---|---|
| `switch` | `Save $54/mo` | `Review & switch` |
| `cancel` | `Save $16/mo` | `Review & cancel` |
| `reschedule` | `Avoid $19 in fees` | `Review & move date` |
| `keep` | — | none (shows "Keeping") |
| `no_offer` | — | none (shows "No cheaper option") |

## 2. Detail / "why" view

- **Why am I showing you this?** — the bill's `why` string.
- Offer breakdown: provider, plan, features (bullets), contract, setup time.
- **Risk notes** (`risk_notes`) shown in a GEL warning/info treatment.
- Primary CTA **Approve** + secondary **Not now**.
- A persistent note: *"Nothing happens until you approve."*

## 3. Approval → confirmation

On **Approve**:
1. Card flips to a success state (GEL `surface-success-faint` + `border-success-mild`):
   **"Switched! You're saving $X/month."**
2. A floating **+XP / +coins** toast plays (e.g. `+120 XP · +80 🪙`).
3. The banner total and the dragon's XP bar animate upward.

### Confirmation copy per `action_type`

| type | confirmation |
|---|---|
| `switch` | `Switched! You're saving $54/month.` |
| `cancel` | `Cancelled. You're saving $16/month.` |
| `reschedule` | `Moved to Fridays. Dishonour fees avoided.` |

## 4. Declined / "Not now"

- Card returns to its original state, no award. The AI records the decline (ledger) so it
  won't nag again this month.

## 5. No-action rows (credibility)

- **Netflix** → `keep` → "You watch Netflix weekly, so we're keeping it."
- **Spotify** → `keep` → "Already on the $6.99 student plan."
- **Rent** → `no_offer` → "Rent is a fixed essential — no cheaper option found."

These three are what stop the feature from looking like a savings-invention machine.
