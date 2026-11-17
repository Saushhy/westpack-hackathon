# Westpac Credit Dragon · Enterprise Architecture & Data Workflow

**Event:** Westpac Innovation & Coding Competition 2026  
**Team:** Shawn · Carlos · Santiago · Naomi  
**Target Environment:** AWS Sydney Region (`ap-southeast-2`) · Sovereign Banking Cloud  
**Design System:** Westpac GEL (`data-brand="wbc"`, `#DA1710` Red, `#1F1C4F` Navy)  

---

## 1. Architectural Philosophy: Dual-Speed Hybrid Model

To satisfy the hackathon's judging criteria—maximizing **Innovation (25%)**, **Creativity (25%)**, **Feasibility (20%)**, **Impact (20%)**, and **Technical Excellence (10%)**—while accounting for corporate network firewalls, Credit Dragon is built on a **Dual-Speed Hybrid Architecture**:

1. **The Hackathon Demo Layer (Zero-Latency Local Execution):**  
   The frontend (SwiftUI + RealityKit AR / HTML GEL Prototype) binds directly to pre-validated local JSON contracts (`/data/*.json`) in `<2ms`, guaranteeing a flawless, network-independent demo during our 10-minute video submission and Friday's live pitch. Meanwhile, `/ai/generate_credit_plan.py` executes the real LLM pipeline in the terminal to prove technical authenticity.
2. **The Production Enterprise Blueprint (Sovereign AWS Cloud):**  
   In production inside the Westpac Mobile Banking App, the system operates across five isolated security zones within the **AWS Sydney (`ap-southeast-2`)** region, enforcing **APRA CPS 234**, **Privacy Act 1988 (Part IIIA)**, and **ASIC RG 209 (Human-in-the-Loop)**.

---

## 2. The 5 Color-Coded Technical Flows (From the Flowchart)

Our architecture diagram (`westpac_credit_dragon_architecture_clean.html`) maps five distinct end-to-end flows across the system:

| Flow # | Color in Diagram | Flow Name | Source $\rightarrow$ Destination | Purpose & Technical Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Flow 1** | **Purple** (`#7C3AED`) | **Goal & Attest Flow** | Customer App $\rightarrow$ Perimeter Gateway | Sends the user's selected **Anchor Goal** (`goals.json`), an **Apple App Attest** hardware signature over `TLS 1.3`, and an OAuth 2.0 **Part IIIA Opt-In** token. |
| **Flow 2** | **Orange** (`#EA580C`) | **Ledger Ingestion Flow** | Amazon RDS Replica $\rightarrow$ Heuristic Engine | Streams 90 days of read-only transactions through the **APRA CPS 234 PII Scrubber Lambda**, replacing names, BSBs, and account numbers with synthetic session UUIDs. |
| **Flow 3** | **Blue** (`#0284C7`) | **Regulated AI Reasoning** | Heuristic Engine $\rightarrow$ ZDR AI Sandbox | Passes deterministic Python metrics (BNPL counts, late fees, median gaps) through the **Portkey AI Gateway** to **Gemini 2.5 Flash / Bedrock** with **Zero Data Retention (ZDR)**. |
| **Flow 4** | **Green** (`#059669`) | **Fast Hydration Flow** | Amazon DynamoDB $\rightarrow$ Westpac GEL UI | Caches validated `questions.json` and `insights.json` payloads in DynamoDB and hydrates the mobile app in `<50ms`. |
| **Flow 5** | **Westpac Red** (`#DA1710`) | **Human-in-the-Loop Approval** | Customer App $\rightarrow$ Execution & Rewards | User manually taps **"Approve"** (`ASIC RG 209`) on bill switches, Payday Bill-Shield shifts, or buffer sweeps, triggering XP/Coin payouts (`rewards.json`) and evolving the AR Dragon. |

---

## 3. End-to-End 5-Stage Workflow (Behind the Scenes)

```text
[Stage 1: Westpac GEL Client & AR Engine]
   │  • User selects Anchor Goal (Home Loan / Car / Clean CCR Slate)
   │  • Apple App Attest signs request + Part IIIA Consent verified
   ▼
[Stage 2: Perimeter & PII Isolation Shield (APRA CPS 234)]
   │  • AWS WAF filters traffic in Sydney Region (ap-southeast-2)
   │  • PII Scrubber Lambda strips names, BSBs, Acct #s -> Synthetic UUID
   │  • Strips illegal demographics (age, visa status, nationality)
   ▼
[Stage 3: Deterministic Pre-Processor, Medians & Bill-Shield]
   │  • Python Engine computes exact BNPL totals, late days & fee counts (<5ms)
   │  • Unbranded Median Index compares bills vs. ACCC/ABS national medians
   │  • Payday Bill-Shield detects direct debits hitting 24-48h before payday
   │  • Punctuality Buffer Sweep models $22/fn micro-transfers to Westpac Life
   ▼
[Stage 4: Regulated AI Sandbox (Zero Data Retention)]
   │  • Portkey Gateway routes scrubbed facts to Gemini 2.5 Flash / Bedrock
   │  • Equifax CCR + APRA RAG rules enforce accurate Australian credit logic
   │  • Competitor Brand Suppression enforces neutral tier recommendations
   │  • Outputs validated questions.json & insights.json to Amazon DynamoDB
   ▼
[Stage 5: Human-in-the-Loop Execution & AR Dragon Evolution]
      • UI renders "Why am I asking?" cards citing exact transaction_ids
      • User taps "Approve" (ASIC RG 209) -> Disburses XP & Coins
      • RealityKit evolves 3D Dragon (.usdz) & unlocks Westpac Life perks
```

### Stage 1: Client Layer — Goal Selection & Cryptographic App Attest
* **Westpac GEL Integration:** Styled natively using `@westpac/ui` and `@westpac/style-config` tokens (`#DA1710` Westpac Red, `#1F1C4F` Westpac Navy).
* **Anchor Goal Selection (`goals.json`):** Before scanning, the customer selects their primary financial quest (*First Home Loan Approval*, *Car Loan Pre-Approval*, or *Clean CCR Slate & Zero BNPL*). This tells the downstream AI which credit bureau levers to prioritize.
* **Apple App Attest & Consent:** The iOS Secure Enclave signs the payload via `Apple App Attest` (via **App AI Gateway**) so spoofed apps or bots cannot query the LLM. An OAuth 2.0 / OIDC token records explicit **Privacy Act Part IIIA** consent.

### Stage 2: Perimeter & Privacy — Zero-Trust PII Shield (APRA CPS 234)
* **Sovereign Hosting:** All traffic terminates inside the **AWS Sydney (`ap-southeast-2`)** VPC behind Amazon CloudFront and AWS WAF.
* **PII Tokenization Lambda:** In strict compliance with **APRA Prudential Standard CPS 234**, raw personal identifiers (Customer Name, BSB, Account Number, Address) are stripped *before* any data reaches the AI layer. "Mia" becomes an anonymized session token (`usr_99481a`).
* **Demographic Neutrality:** Under the Australian Credit Reporting Privacy Code, social demographics (age, visa subclass, passport, nationality) cannot influence credit scores and are stripped at the perimeter.

### Stage 3: Core Banking & Heuristics — Deterministic Engine, Medians & Bill-Shield
* **Why Deterministic Python First?** LLMs are prone to arithmetic errors when summing 100+ raw transactions. Carlos's Python engine (`generate_credit_plan.py`) ingests the read-only Amazon RDS ledger replica (plus optional **Open Banking CDR** feeds) and computes 100% accurate facts in `<5ms`.
* **Unbranded National Median Benchmark (`benchmarks.json`):** Compares the user's recurring utility, telco, and streaming spend against national Australian medians (ACCC / ABS data).
  * *Example (Mia):* Flags her `$89.00/mo` Vodafone plan (`tx_015`, `tx_049`, `tx_085`) against the `$45.00/mo` Australian median for comparable 5G data, identifying a **`$44.00/mo` (`$528/yr`)** saving.
* **Payday Bill-Shield Engine:** Cross-references recurring direct debit dates against incoming salary credits.
  * *Example (Mia):* Detects that her `$34.00` Goodlife Gym debit bounced on Thursday 15 Oct (`tx_063`), triggering `$19.00` in combined bank and merchant dishonour fees (`tx_064`, `tx_068`), literally **24 hours before** her `$950.00` Cotton On salary landed on Friday 16 Oct (`tx_065`). Prepares a one-tap **PayTo / Direct Debit Friday Realignment**.
* **Punctuality Buffer Sweep:** Models an automated `$22.00/fortnight` sweep (funded from half of her telco savings) into a locked **"Credit Card Protection Stash"** inside her Westpac Life savings account so minimum card repayments never bounce.

### Stage 4: Regulated AI Sandbox — ZDR Reasoning & Debt Reallocation
* **Zero Data Retention (ZDR):** Scrubbed heuristic facts are sent via the **Portkey AI Gateway** to an enterprise LLM (**Gemini 2.5 Flash / Amazon Bedrock**) with ZDR enabled—meaning zero customer data is retained or used to train public models.
* **Competitor Brand Suppression Guardrail:** To prevent Westpac from advertising competitors or non-affiliated third parties, the System Prompt strictly forbids naming external telco/utility brands. Savings are presented neutrally as an *"Optimized Market-Rate Tier-1 Plan"* or *"Westpac Partner Tier"*.
* **Debt Reallocation Vector:** The AI connects bill savings directly to Australian credit bureau mechanics:
  > *"Spending less does not directly raise your Equifax score. However, reallocating your $44/month telco saving into your Westpac Flex Card autopay clears your revolving balance 4 months faster and projects a +35 point Comprehensive Credit Reporting (CCR) improvement."*
* **Schema Validation & DynamoDB Cache:** A validator verifies that every generated question includes valid `related_transaction_ids`, a `"why_asking"` trace, and a `"Skip question"` option before writing to **Amazon DynamoDB** for `<50ms` client hydration.

### Stage 5: Execution & Gamification — Human-in-the-Loop & AR Dragon
* **ASIC RG 209 / RG 248 Compliance:** The AI **never** executes unilateral account debits, plan switches, or direct debit date changes. Every recommendation is staged as a pending action card requiring an explicit customer **"Approve"** tap.
* **Gamification & RealityKit AR:** Approving actions and answering context cards dispatches events to Santiago's `rewards.json` engine, awarding **XP** and **Dragon Coins**. Shawn's `ARKit + RealityKit` view renders the 3D Westpac Dragon (`.usdz`) on the table, triggering level-up animations (*Egg $\rightarrow$ Baby $\rightarrow$ Teen $\rightarrow$ Adult*) and unlocking real Westpac perks (bonus Westpac Life savings interest or fee waivers).

---

## 4. How the Data Files Connect Across Team Roles

Every component in the architecture maps directly to a JSON contract in our `/data` folder so Frontend, Backend/AI, Gamification, and Pitch stay 100% synchronized:

```text
/data/goals.json ──────────────┐
/data/benchmarks.json ─────────┼──► [ /ai/generate_credit_plan.py (Carlos) ]
/data/transactions_*.json ─────┘                 │
                                                 ├──► Generates /data/questions.json
                                                 └──► Generates /data/insights.json
                                                                 │
/data/bills.json (Santiago) ─────────────────────────────────────┼──► [ Frontend UI & AR (Shawn) ]
/data/rewards.json (Santiago) ───────────────────────────────────┘
```

| File Path | Owner | Consumed By | Key Fields & Role in the Solution |
| :--- | :--- | :--- | :--- |
| `/data/transactions.json` *(+ David, Elena, Marcus)* | **Carlos** | Python Engine & UI History View | `id, date, description, merchant, category, amount, type, flags` (`bnpl`, `late_payment`, `dishonoured`, `subscription`). |
| `/data/goals.json` | **Carlos / Naomi** | Stage 1 Goal Selector & AI Prompt | `goal_id, name, target_horizon_months, primary_bureau_metric, ai_focus, dragon_perk`. Calibrates the AI to the user's life goal. |
| `/data/benchmarks.json` | **Carlos / Santiago** | Stage 3 Median Comparator | `category, national_median_monthly, market_high_threshold, benchmark_label, average_monthly_saving_opportunity`. Powers unbranded comparisons. |
| `/data/questions.json` | **Carlos (AI Output)** | Stage 5 Swipeable Question Cards (Screen 2) | `id, question, why_asking, related_transaction_ids, answer_options, impact`. Uncovers personal context behind spending anomalies. |
| `/data/insights.json` | **Carlos (AI Output)** | Stage 5 Credit Health Plan (Screen 3) | `credit_score` (`615` $\rightarrow$ `705`), `key_insights` (CCR explanations), `recommended_goals` (`xp_reward`, `coin_reward`, `estimated_score_delta`). |
| `/data/bills.json` | **Santiago** | Stage 5 Bill Negotiator (Screen 4) | Current merchant charges vs. unbranded market-rate tiers, monthly/annual savings, and Debt Reallocation target. |
| `/data/rewards.json` | **Santiago** | Stage 5 Dragon Home & Shop (Screens 5–7) | XP thresholds for Dragon evolution stages (*Egg, Baby, Teen, Adult*), Coin payouts per action, and Dragon Shop items. |

---

## 5. Multi-Persona Scalability (How the Same Architecture Serves All Customers)

During the **Impact & Feasibility (7:30–9:00)** section of our video, we use this table to show judges that our architecture isn't hardcoded for just one student—it dynamically adapts across Westpac's entire customer base:

| Persona | Tx Volume | Selected Anchor Goal | Primary Heuristic Detected in Stage 3 | Stage 4 AI Reallocation & Credit Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Mia (21)** *Hero Demo* | `100 tx` | **Clean CCR Slate & Zero BNPL** | 5 Oct BNPL debits (`$204.95`), 3-day late Flex Card (`tx_058`), Thursday bounced gym debit (`tx_063`), `$89/mo` telco vs `$45` median. | **Payday Bill-Shield** shifts gym debit to Friday; switches telco to `$45` median tier; routes `$44/mo` saving into **Punctuality Buffer Sweep** (`615` $\rightarrow$ `705` score). |
| **David (38)** *Family / Home* | `120 tx` | **First Home Loan Approval** | `$35,000` combined credit card limits (`tx_d009`, `tx_d027`) with `<10%` utilization; `$620/mo` auto loan; `$875.95/mo` lifestyle subscriptions. | Flags **APRA 3% serviceability rule** (`$35k` limit = `$1,050/mo` liability drag); recommends reducing card limit to `$6k` to unlock **`~$95,000` in mortgage borrowing power** (`785` $\rightarrow$ `860` score). |
| **Elena (29)** *Skilled Migrant* | `85 tx` | **Initial Credit Footprint** | `$7,150/mo` net tech salary & `$12k+` savings, but **0 credit facilities** ("Credit Invisible"); `$250` energy deposit (`tx_e014`) & `$250` prepaid SIM (`tx_e003`). | Recommends `$1,000` limit starter card with 100% auto-pay to initiate positive **Equifax CCR** reporting; triggers `$250` Origin deposit refund & exports **Verified Rent Certificate** (`530` $\rightarrow$ `725` score). |
| **Marcus (45)** *SME Director* | `150 tx` | **Clean Business & Personal Separation** | `$12,450` ATO BAS drain (`tx_m056`) causing a 2-day late corporate card payment (`tx_m061`); `$14,750` trade supplies stacked on card; commingled drawings. | Protects personal Equifax file from **Director Personal Guarantee** contagion; activates **15% Automated ATO Tax Sweep**; migrates wholesale trade spend to 30-day supplier terms (`670` $\rightarrow$ `780` score). |

---

## 6. Regulatory & Compliance Matrix (Judge Q&A Reference)

| Regulatory Framework | Banking Mandate | How Credit Dragon Enforces Compliance |
| :--- | :--- | :--- |
| **APRA CPS 234** *(Information Security)* | Banks must protect customer financial assets and prevent PII leakage to third-party vendors. | **Stage 2 PII Scrubber Lambda** strips names, BSBs, and account numbers into synthetic UUIDs before any payload leaves the core ledger subnet. Hosted in AWS Sydney (`ap-southeast-2`). |
| **Privacy Act 1988 (Part IIIA)** *(Credit Reporting Code)* | Strict opt-in consent required for credit reporting; prohibits demographic discrimination. | **Stage 1 OAuth Consent Gate** requires explicit opt-in; **Stage 2 Scrubber** strips age, visa status, passport, and nationality so they never enter credit calculations. |
| **ASIC RG 209 & RG 248** *(Responsible Lending & Advice)* | Prohibits unlicensed automated financial decisions or predatory product switching. | **Stage 4 Brand Suppression** bans naming external competitors (uses neutral median benchmarks); **Stage 5 Human-in-the-Loop** requires an explicit user **"Approve"** tap for every action. |
| **AU Voluntary AI Safety Standard** *(Guardrails 1–10)* | Requires explainability, human agency, and immutable audit trails for high-impact AI. | Every question card renders a **"Why am I asking?"** trace citing exact `related_transaction_ids`, includes a **"Skip question"** button, and logs all I/O to **Amazon CloudWatch** via Portkey. |