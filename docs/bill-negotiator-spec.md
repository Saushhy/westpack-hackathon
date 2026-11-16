# Bill Negotiator — screen spec (for Shawn's SwiftUI)

The states and copy Shawn needs to build the Bill Negotiator screen against `data/bills.json`.

## Screen flow

```
Bill list  →  Review sheet (BottomSheet)  →  [Approve]  →  confirmation  →  list updates
                 ↑ shows the change overview + a link to the provider's own page
```

Nothing is approved from the list. Every change opens a **review sheet** first — the
customer sees the change overview and can open the real provider page before accepting.

## 1. Bill list

- **Savings panel** (navy header, GEL Panel): big figure `$92.99 /month`, `$1,115.88 a year`,
  and a progress bar of "switched vs available".
- **Streaming panel** (the keep-one recommendation) — see §2.
- One card per remaining `bills[]` entry. Each actionable card:
  - icon tile, title, `provider · plan`, and the current amount right-aligned in tabular figures.
  - a `finding` one-liner + a red **"Save $X/mo"** badge.
  - a **Now → Recommended** comparison (amounts + labels + a savings strip).
  - a `How we know this` disclosure: `evidence` label/value rows, `why`, `risk_notes`,
    and a provider link.
  - CTA **Review change** + **Not now**.

### Card copy per `action_type`

| type | badge | CTA |
|---|---|---|
| `switch` | `Save $54/mo` | `Review change` |
| `cancel` | `Save $16/mo` | `Review change` |
| `reschedule` | `Avoid $19 in fees` | `Review change` |
| `keep` | — | none (muted, shows "Keeping") |
| `no_offer` | — | none (muted, shows "No change") |

## 2. Streaming — "keep one" panel

The three streaming bills (Netflix, Stan, Disney+) are one recommendation, not three cards:

- Header: `Streaming services · 3 services · $52.98 / month`.
- Figure: the saving if the other two are paused.
- A **pick list** — one row per service with a radio. The customer picks which to **keep**;
  the other two become the ones offered for cancellation.
- An honesty note: *"Bank transactions show what you pay for, not what you watch."*
- A constraint note: *"Only the services you review and approve are cancelled."*
- CTA: `Review 2 cancellations` → one review sheet covering both.

`state.choices.rec_streaming` stores the keeper. Default is Netflix.

## 3. Review sheet (BottomSheet)

- Title `Review this change` (or `Review these changes` for the group).
- Header row: headline + `Save $X/mo` badge.
- **Key/value rows** for the change (current → new, what's included, commitment, start date,
  total saved). For the group, one block per service plus a `Total you save` row.
- **Provider link** (opens in a new tab) — the customer checks the plan and price themselves.
- A `Checked <date> · Provider price page` verification line.
- A note: *"Sample pricing for this demo. Confirm the plan and price on the provider's site."*
- Actions: **Approve switch / Approve cancellation / Approve new date / Approve both
  cancellations** + **Cancel**.

The sheet body scrolls independently (`min-height: 0` so long reviews don't clip).

## 4. Approval → confirmation

1. Card flips to a success state: `Switched! You're saving $54/month.` /
   `Cancelled. Saving $16/month.` / `Debit moved to Friday. No more dishonour fees.`
2. A floating **+XP / +coins** toast plays.
3. The savings banner and the dragon's XP bar animate upward.

## 5. Declined / "Not now"

Card returns to its original state, no award. The decline is ledgered so the AI won't nag
again this month.

## 6. No-action rows (credibility)

- **Spotify** → `keep` → "Already on the $6.99 student plan — the cheapest."
- **Rent** → `no_offer` → "Fixed essential — no cheaper option found."

These are what stop the feature from looking like a savings-invention machine.
