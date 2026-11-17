# Credit Dragon

**Your Westpac dragon grows as your credit health does.**

Credit Dragon is an AI credit coach inside the Westpac app. It reads a customer's own
Westpac transactions, finds the habits that move an Australian credit score, and gives
them one clear action at a time. Acting on them grows and dresses a pet dragon, which
they can place on their table in augmented reality.

Built by **NCKS Solutions** (Griffith University) for the Westpac Innovation & Coding
Competition 2026, theme "AI and what it means for banking".

| | |
|---|---|
| Team | Carlos Torres Palop · Shawn Datta · Santiago Parada · Naomi Numbabus |
| Web prototype | [`web/`](web/) · open `web/index.html`, no install needed |
| iOS app | [`ios/`](ios/) · SwiftUI + ARKit/RealityKit |
| AI pipeline | [`data/*_generate_credit_plan.py`](data/) |
| Product log | [`CHANGES.md`](CHANGES.md) · read this before changing anything |

---

## The problem

Many young Australians don't know what affects their credit score until a rental, car
loan or mortgage application is declined. Buy now, pay later plans, a late card
repayment, a bounced direct debit or too many credit applications can quietly count
against them. Budgeting apps give generic advice, and people stop using them.

Spending less does **not** raise a credit score directly. Credit Dragon is honest about
that. It helps customers keep cash ready so every repayment lands on time, pay down
debt faster and avoid new credit. Those are the habits it rewards.

---

## Features

### The Welcome
A first-run flow. The customer agrees to the scan, the dragon "studies" three months of
transactions, and then asks five personalised questions. Every question says **why it
is asking** and shows the real transactions behind it. Every question can be skipped.

### Score
The customer's credit score (with consent), the band, a **forecast range** with the
condition it depends on, their goal (for example "Car loan in 12 months"), and every
credit account they repay. Each account shows the lender's own logo, the monthly
amount and an **On time** or **Late** tag.

### Insights
What the AI found in the transactions, such as a late card repayment, buy now, pay
later plans or a debit that bounced. Each insight opens a Review sheet with the
evidence, one action and the source. Nothing happens until the customer acts.

### Bill check
For a phone or home internet bill, the AI compares what the customer pays with a
**brand-free Australian average** and suggests they consider a cheaper plan with a
different provider. It never names one. It then shows:

- the potential saving a month, and what it adds up to in a year
- how much sooner that saving would pay off an existing debt, and the interest saved
- what it could mean for the score forecast, as a range with its condition

Example (Mia): $89 a month against a $47 average saves $42 a month, or $504 a year.
Put towards her card, it's paid off in 11 months instead of 14.

### Goals
Three goals that **complete themselves** when the transactions show it happened. There
is no "mark as done" button, so the rewards can't be gamed.

### Dragon and Shop
XP and coins come from real behaviour, such as on-time repayments, setting up a savings
buffer or a month without new credit. The dragon grows from egg to baby to adult.
Coins buy hats, scarves, caves and food, and the dragon wears what is bought. One shop
item is a real perk: a bonus savings rate.

### See it in your room
The dragon appears on the customer's table through the camera. Tap it and it says a
line built from their own payments, for example "Afterpay takes $84.50 on 18 Nov. Keep
cash aside for it." There is no free chat, so it can't make things up.

### Four personas
| Persona | Situation |
|---|---|
| **Mia**, 21 | Student, buy now, pay later, one late card repayment (main demo) |
| **Marcus** | Sole trader with tax debts, a business card and car finance |
| **Elena** | New to Australia, no credit history yet |
| **David** | High card limits, preparing for a mortgage |

---

## Trust rules built into the product

1. **Westpac only acts on Westpac.** A service with another company is the customer's
   contract. The bank never moves a debit date, cancels, switches or negotiates for
   them. When a payment is at risk, it suggests a Westpac savings buffer.
2. **No brand is promoted.** Only companies the customer already pays are named.
3. **No saving is claimed** until a transaction proves it.
4. **No score is promised.** Forecasts are ranges with a stated condition.
5. **Every insight shows its evidence**, and the customer approves every action.

The audit (`npm run audit`) checks these rules automatically.

---

## Run the web prototype

```bash
# Just open it: no server, no build, works offline
open web/index.html            # Mia
open web/marcus.html           # or elena.html, david.html
```

Optional tooling, from `web/`:

```bash
npm install
npm start               # http://localhost:4173, needed for the live AR camera
npm run build           # rebuild data.js, personas.js, icons and styles
npm run audit           # headless checks of the whole journey and the trust rules
npm run shots           # screenshots of the journey
```

The audit and screenshots use the system Microsoft Edge through `playwright-core`.
Edit the `EDGE` path in `web/scripts/*.mjs` if Edge lives elsewhere.

The **Reset demo** and **Replay welcome** buttons on the Dragon tab restart the
journey.

---

## Run the AI pipeline

```bash
cd data
export GEMINI_API_KEY=...      # or OPENAI_API_KEY
python3 mia_generate_credit_plan.py
```

Each script reads a persona's transactions, detects patterns (buy now, pay later, late
repayments, dishonours, subscriptions) and asks an LLM (Gemini 2.5 Flash, or
GPT-4o-mini as a fallback) for personalised questions and insights. The prompt includes
the Australian credit-reporting rules and the Westpac-only rule. The app uses the saved
output, so the demo never depends on a live call.

---

## Repository layout

```
assets/dragon_3d/     Source 3D dragon (OBJ + PBR maps)
data/                 Mock transactions, AI questions and insights, bills, rewards,
                      benchmarks.json (Australian averages) and the AI scripts
docs/                 Data contracts, gamification spec, design tokens, AR handoff,
                      idea summary, research and video storyboard
ios/CreditDragon/     Native SwiftUI app with the AR dragon
web/                  HTML + Tailwind prototype on Westpac's GEL design system
  app.js              State, onboarding, insights, Bill check, goals, dragon, shop, AR
  data.js             Generated: Mia's data (do not edit)
  personas.js         Generated: Marcus, Elena, David (do not edit)
  tools/              Build scripts (data, personas, icons, dragon model and render)
  scripts/            audit.mjs and screenshot.mjs
AGENTS.md             Team brief
CHANGES.md            Product decisions and what changed
```

---

## What is real and what is mocked

| Piece | Status |
|---|---|
| Web and iOS UI, gamification, goals, Bill check maths | Real logic |
| AI questions and insights | Generated by a real LLM call, saved for the demo |
| 3D dragon, GLB build and render, AR placement | Real |
| Transactions, credit scores, balances | Mock data |
| Backend, authentication, bank APIs | Not built |

The Australian averages in `data/benchmarks.json` come from Canstar (mobile, 2026) and
TechRadar (NBN by speed tier). Re-check them before presenting.

---

## Credits

- Design system: [Westpac GEL](https://github.com/WestpacGEL/GEL-next)
- Westpac branding and the Westpac font are used only for this competition entry.
- Provider logos belong to their owners and appear only for accounts the demo
  customer already holds.
