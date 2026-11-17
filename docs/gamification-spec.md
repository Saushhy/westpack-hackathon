# Gamification spec: Credit Dragon

How XP, coins, levels and dragon stages work, and why every rule is credit-health-first.

## 1. Design principle

> Rewards only ever come from behaviours that improve **credit health**: paying on time,
> protecting a debit at risk, and holding off new credit. There is no XP for spending.

Every award is explainable and auditable. It carries a `why_rewards_you` string and is
written to a ledger (see `data-contracts.md` §3).

## 2. Reward table (`data/rewards.json` → `actions`)

| Action | XP | Coins | Cap | Why it rewards you |
|---|---|---|---|---|
| Daily check-in (`daily_checkin`) | 10 | 10 | one per day | Tiny on purpose. It cannot be farmed. |
| Seven days in a row (`checkin_week`) | 120 | 60 | once per 7-day window | A week of checking turns awareness into habit. |
| Set a repayment reminder (`reminder_set`) | 100 | 60 | per finding | The step that makes an on-time payment happen. |
| Cover a debit at risk with a savings buffer (`protected_balance`) | 60 | 40 | per finding | Stops a dishonour becoming a black mark. |
| Track a money pattern (`insight_tracked`) | 40 | 20 | per finding | Lets us watch it and confirm what happens. |
| Completed a plan goal (`goal_completed`) | 100 | 60 | per goal | Only fires when the data says it happened. |
| On-time repayment (`on_time_repayment`) | 150 | 100 | 1 per month | Repayment history is the biggest factor. |
| No new BNPL this month (`no_new_bnpl_month`) | 250 | 150 | 1 per month | Fewer enquiries and less debt. |
| Verified a saving (`saving_verified`) | 120 | 80 | per finding | Reserved for a saving proven by transactions. |
| Shop purchase | 0 | spend | none | Cosmetics never earn XP. |

## 3. Levels and stages

- **Levels**: 10 levels at `0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700` XP.
- **Stages**: three only. egg (0) → **baby (800)** → adult (1500). The baby is the model
  we have. The adult model is still to be supplied, so 🐉 stands in until then.
- The demo opens on **550 XP, still an egg**, and hatches into the baby during the insights
  journey, at 800.

## 4. Goals fill themselves

There are no goal buttons in the app. `syncGoals()` reads a real signal and completes the
goal, and the XP follows:

| Goal | Signal | Target |
|---|---|---|
| Your dragon checks your file daily | `state.checkins` inside the last 7 days | 7 |
| Pay every Afterpay and Zip on time | `bnpl.providers[].paid_on_time` | cycle total |
| Go a month without new BNPL | days since `bnpl.last_facility_date` | 30 |

Because only real payments can move goals 2 and 3, they sit at 2 of 4 and 27 of 30 during
the demo. That is the point: the bar does not lie.

## 5. Dressing your dragon (wardrobe, scenes, food)

- **Hats, shades and scarves** attach to the dragon and scale with its stage.
- **Homes** change the scene behind it (`Starry Cave` → night sky, `Lava Lair` → volcanic).
- **Food** is repeatable and counts `feeds`. It never awards XP.
- The dragon is tappable and answers with a credit-health line.

## 6. Demo click-path (550 → 870 XP, the egg hatches into the baby dragon)

1. **Score**: 612/1200 Equifax, forecast 635 to 650, the goal card, Afterpay and Zip with
   next payment dates, the factors sheet.
2. **On open** the daily check-in and the seven-day goal land: **550 XP, 330 coins**. The
   dragon is still an **egg** here, and the Dragon tab says when it hatches.
3. **Insights**: six findings, each with a **Review** button that opens a sheet with the
   evidence and one action. Working through them takes you to **870 XP, 510 coins**, and the
   egg **hatches into the baby dragon** at 800 XP partway through.
4. **Goals**: three cards that fill themselves from real signals. The daily one is done; the
   other two sit at 2 of 4 instalments and 27 of 30 days.
5. **Dragon and Shop**: spend coins on a hat and a cave and watch it wear them.
6. **AR**: **See it in your room**, live camera, the baby dragon drops onto the table, drag
   it, tap it to hear a line built from the customer's own payments.
7. **Adult (1500 XP)** is the third and final stage. Its model is still to be supplied.
