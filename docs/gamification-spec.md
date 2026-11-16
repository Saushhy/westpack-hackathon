# Gamification spec — Credit Dragon

How XP, coins, levels and dragon stages work, and why the rules are credit-health-first
(not engagement-farming).

## 1. Design principle

> Rewards only ever come from behaviours that improve **credit health** — paying on time,
> avoiding new credit, and freeing up cash so repayments never bounce. There is **no XP for
> spending**, opening the app, or the volume of transactions.

Every award is **explainable** and **auditable**: each one carries a `why_rewards_you`
string and is written to a ledger (see `data-contracts.md` §3). This feeds the judging
criterion "opt-in, explainable, user approves every action".

## 2. Reward table (`data/rewards.json` → `actions`)

| Action | XP | Coins | Cap | Why it rewards you |
|---|---|---|---|---|
| On-time repayment | 150 | 100 | 1 / month | Repayment history is the #1 factor in an AU credit score. |
| No new BNPL this month | 250 | 150 | 1 / month | Fewer enquiries & debts protects the credit file. |
| Switch a bill | 120 | 80 | once / bill | Frees cash for on-time repayments. |
| Complete a plan goal | 100 | 60 | once / goal | A verifiable step toward better credit health. |
| Cancel a subscription | 80 | 50 | once / bill | Cuts recurring spend to pay down debt. |
| Reschedule a payment | 60 | 40 | once / bill | Avoids dishonour fees & keeps the account in good standing. |
| 4-week savings streak | 200 | 120 | 1 / month | Consistency is what moves a score. |
| Answer a question | 25 | 10 | 5 / month | Engaging personalises the plan — kept tiny so it can't be farmed. |
| Shop purchase | 0 | −cost | — | Spending coins never earns XP. |

## 3. Level curve (`levels`)

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
`0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700` XP.

## 4. Dragon stages (`stages`)

| Stage | XP to reach | Emoji |
|---|---|---|
| Egg | 0 | 🥚 |
| Baby | 250 | 🐣 |
| Teen | 800 | 🐲 |
| Adult | 1500 | 🐉 |

## 5. Anti-farm rules

1. **Idempotency** — an award key is `"{source_id}:{action_id}"`; a source can only ever
   pay once (you can't re-approve the same bill for XP).
2. **Monthly caps** — credit-relevant actions (repayment, no-BNPL, streak) pay at most once
   per calendar month.
3. **Questions pay the least** (25 XP) — prevents tapping randomly to level up.
4. **No XP for spending** — shop purchases only spend coins.
5. **No refunds / no arbitrage** — bought items can't be sold back.
6. **Everything is ledgered** with a timestamp + reason → auditable.

## 6. Worked demo session (this is what Santiago clicks on stage)

Start: **320 XP, 120 coins, level 3, Baby dragon, 3-week streak.**

| # | Action | +XP | +coins | XP after | Note |
|---|---|---|---|---|---|
| 1 | Approve phone switch (Vodafone → Belong) | 120 | 80 | 440 | |
| 2 | Approve internet switch (NBN 100 → 50) | 120 | 80 | 560 | → Level 4 |
| 3 | Cancel Stan | 80 | 50 | 640 | |
| 4 | Cancel Disney+ | 80 | 50 | 720 | → Level 5 |
| 5 | Reschedule gym debit to Fridays | 60 | 40 | 780 | |
| 6 | Complete "Cut $90+ bills" goal | 100 | 60 | 880 | **🐲 Evolves to Teen** |
| 7 | Complete "Pay card on time" goal | 100 | 60 | 980 | |
| 8 | Complete "No new BNPL" goal | 100 | 60 | 1080 | → **Level 6** |

**End: 1080 XP, level 6, Teen dragon, 600 coins.** Enough to buy the Lava Lair (450) +
Dragon Feast (60), with 90 left over — or save toward the 1200-coin perk.

> The evolution lands at step 6 *on purpose*: the dragon grows the moment Mia hits her
> "cut bills" savings goal, tying the gamification to the money outcome rather than to
> random clicks.

## 7. Pitch lines (judge-facing)

- "The dragon only grows when your credit health does — every reward maps to a behaviour
  the credit bureaus actually measure."
- "We deliberately pay **less** for answering questions than for switching a bill, so the
  game can't be farmed and the incentives point at real behaviour change."
- "Every coin is earned through a ledgered, explainable action. Nothing is granted for
  opening the app or spending money."
- "Coins can later unlock **real Westpac perks** (e.g. a bonus savings rate), giving the
  bank a commercial reason to build it and the customer a reason to stay healthy."
