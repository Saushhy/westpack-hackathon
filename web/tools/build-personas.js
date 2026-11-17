/**
 * Turns Carlos's four personas into the shape this app renders.
 *
 *   npm run build:personas
 *
 * Input  (owned by Carlos):  data/<name>_{transactions,questions,insights}.json
 * Output (generated):        web/personas.js  +  marcus.html / elena.html / david.html
 *
 * Mia keeps her hand-authored data (`data/bills.json` + `data/rewards.json`),
 * because that is the persona the demo and the audit are tuned against. The
 * other three are generated from Carlos's files, so nothing is retyped and the
 * pages cannot drift from his data.
 *
 * Rules carried over from the product:
 *   - no provider the customer does not already pay
 *   - `bureau_explanation` is NOT shown. It is the credit-scoring lecture the
 *     team asked us to drop. The summary is shown, then one piece of advice.
 *   - the forecast is a range with a stated assumption, never a promised number
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const repoRoot = join(webRoot, "..");
const dataDir = join(repoRoot, "data");

const PERSONAS = {
  marcus: {
    goal: "Business loan in 6 months",
    goal_date: "2027-05-17",
    goal_note: "Two things to fix first",
    label: "Sole trader"
  },
  elena: {
    goal: "First credit card approved",
    goal_date: "2027-05-17",
    goal_note: "Building a file from zero",
    label: "Thin file"
  },
  david: {
    goal: "Home loan pre-approval",
    goal_date: "2027-02-17",
    goal_note: "On track",
    label: "Home buyer"
  }
};

/* Providers we already hold a logo for. Anyone else falls back to a GEL icon,
   which is correct: we never fetch art for a business the customer is not
   already paying. */
const LOGOS = {
  afterpay: "assets/brands/afterpay.png",
  zip: "assets/brands/zip.png",
  netflix: "assets/brands/netflix.png",
  stan: "assets/brands/stan.png",
  disney: "assets/brands/disneyplus.png",
  spotify: "assets/brands/spotify.png",
  vodafone: "assets/brands/vodafone.png",
  "aussie broadband": "assets/brands/aussiebroadband.png",
  goodlife: "assets/brands/goodlife.png",
  toyota: "assets/brands/toyota.png",
  anz: "assets/brands/anz.png",
  plenti: "assets/brands/plenti.png"
};

const BRAND_MATCH = {
  Afterpay: "afterpay",
  Zip: "zip",
  Netflix: "netflix",
  Stan: "stan",
  "Disney Plus": "disney",
  Spotify: "spotify",
  Vodafone: "vodafone",
  "Aussie Broadband": "aussie broadband",
  "Goodlife Health Clubs": "goodlife"
};

const CATEGORY_FACTOR = [
  [/repayment/i, "credit"],
  [/enquir|utilisation|credit limits|history length|credit friction|alternative payment/i, "credit"],
  [/default/i, "fees"],
  [/cash flow|liquidity|living expenses|serviceab/i, "cash"]
];

/* One short instruction per family of finding. This is our copy, not Carlos's:
   his `bureau_explanation` is a paragraph about CCR, and the team asked for the
   advice instead. */
const CATEGORY_ADVICE = [
  [/repayment/i, "Set a reminder so the next one lands on time."],
  [/default/i, "Protect the balance before the debit lands."],
  [/enquir|credit limits|utilisation/i, "Hold off new credit until this clears."],
  [/cash flow|liquidity|living expenses|serviceab/i, "Free the cash first, then pay down debt."],
  [/history length|alternative payment|credit friction/i, "Keep reporting the accounts you already pay well."]
];

/* Every credit facility the person actually repays, not just BNPL. Order
   matters: the Westpac products are matched before the generic bank pattern. */
const WESTPAC_MARK = "assets/gel/wbc-logo.svg";

const INSTITUTIONS = [
  { re: /afterpay/i, name: "Afterpay", kind: "bnpl", logo: LOGOS.afterpay, match: "Afterpay" },
  { re: /zip/i, name: "Zip", kind: "bnpl", logo: LOGOS.zip, match: "Zip" },
  { re: /klarna/i, name: "Klarna", kind: "bnpl", logo: null, match: "Klarna" },
  { re: /westpac car loan/i, name: "Westpac Car Loan", kind: "loan", logo: WESTPAC_MARK, match: "Westpac Car Loans" },
  {
    re: /westpac business overdraft/i,
    name: "Business Overdraft",
    kind: "facility",
    logo: WESTPAC_MARK,
    match: "Westpac Business Overdraft"
  },
  { re: /westpac credit card/i, name: "Westpac Credit Card", kind: "card", logo: WESTPAC_MARK, match: "Westpac Credit Cards" },
  { re: /toyota/i, name: "Toyota Finance", kind: "loan", logo: LOGOS.toyota, match: "Toyota Financial Services" },
  { re: /anz/i, name: "ANZ", kind: "loan", logo: LOGOS.anz, match: "ANZ Banking Group" },
  { re: /plenti/i, name: "Plenti", kind: "loan", logo: LOGOS.plenti, match: "Plenti" }
];

const KIND_LABEL = {
  bnpl: "Buy now, pay later",
  card: "Credit card",
  loan: "Loan",
  facility: "Business facility"
};

/* A facility is a row that actually moves money against credit. Enquiries are
   not facilities, so a bureau search never becomes an account. */
const FACILITY_FLAGS = /^(bnpl|credit_repayment|credit_facility|late_payment)$/;

const ICON_FOR = { credit: "card", cash: "target", fees: "shield", none: "receipt" };
const pick = (table, text, fallback) => {
  for (const [re, value] of table) if (re.test(text)) return value;
  return fallback;
};

const asArray = (raw) => (Array.isArray(raw) ? raw : raw.transactions || []);
const daysBetween = (a, b) => Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
const lastDate = (tx) => tx.map((t) => t.date).sort().pop();

/* ---------- read ---------- */
function readPersona(name) {
  const insightsPath = join(dataDir, name + "_insights.json");
  const questionsPath = join(dataDir, name + "_questions.json");
  const txPath = join(dataDir, name + "_transactions.json");
  for (const p of [insightsPath, questionsPath, txPath]) {
    if (!existsSync(p)) {
      console.error("Missing " + p.replace(repoRoot, ""));
      process.exit(1);
    }
  }
  return {
    insights: JSON.parse(readFileSync(insightsPath, "utf8")),
    questions: JSON.parse(readFileSync(questionsPath, "utf8")),
    tx: asArray(JSON.parse(readFileSync(txPath, "utf8")))
  };
}

const baseRewards = JSON.parse(readFileSync(join(dataDir, "rewards.json"), "utf8"));
const AS_OF = "2026-11-17";

/* ---------- helpers ---------- */
function brandOf(merchant) {
  for (const [brand, key] of Object.entries(BRAND_MATCH)) {
    if (new RegExp(key, "i").test(merchant || "")) return { brand, logo: LOGOS[key] };
  }
  return { brand: null, logo: null };
}

function primaryMerchant(tx, related) {
  const hit = related.find((t) => t.type === "debit") || related[0];
  if (!hit) return "Westpac";
  return hit.merchant || "Westpac";
}

function evidenceRows(related) {
  return related
    .filter((t) => t.type === "debit")
    .slice(0, 3)
    .map((t) => ({
      k: (t.merchant || "Payment").slice(0, 26),
      v: "$" + Number(t.amount).toFixed(2) + " · " + t.date.slice(8) + " " + t.date.slice(5, 7)
    }));
}

/* ---------- findings ---------- */
function toFindings(insights, txById) {
  return insights.key_insights.map((ins) => {
    const related = (ins.related_transaction_ids || []).map((id) => txById[id]).filter(Boolean);
    const factor = pick(CATEGORY_FACTOR, ins.category, "credit");
    const brand = brandOf(primaryMerchant(null, related));
    const action =
      factor === "fees" ? "protect" : /repayment/i.test(ins.category) ? "remind" : "track";

    return {
      id: ins.id,
      category: factor === "fees" ? "fees" : factor,
      factor,
      evidence_tier: "westpac_transactions",
      savings_status: "none",
      icon: ICON_FOR[factor],
      logo: brand.logo,
      label: ins.category,
      provider: primaryMerchant(null, related),
      plan: "Last 3 months",
      billing_period: "monthly",
      current_amount: null,
      current_monthly: 0,
      provider_url: null,
      provider_match: brand.brand ? [brand.brand] : [],
      detected_from: ins.related_transaction_ids || [],
      confidence: "high",
      action_type: action,
      advice: pick(CATEGORY_ADVICE, ins.category, "Keep an eye on this one."),
      verification: { checked_at: AS_OF, source: "Westpac transaction history" },
      savings_monthly: 0,
      savings_annual: 0,
      why: "",
      requires_approval: false,
      xp: action === "remind" ? 100 : action === "protect" ? 60 : 40,
      coins: action === "remind" ? 60 : action === "protect" ? 40 : 20,
      finding: ins.title,
      detail: ins.summary,
      severity: ins.severity,
      evidence: evidenceRows(related)
    };
  });
}

/* ---------- credit accounts ----------
   Every facility the person actually repays, not just BNPL: cards, car loans,
   business overdrafts. A bureau search is not a facility, so enquiries never
   become an account here. */
function toAccounts(tx) {
  const rows = tx.filter((t) => (t.flags || []).some((f) => FACILITY_FLAGS.test(f)));
  const groups = new Map();
  for (const t of rows) {
    const inst = INSTITUTIONS.find((i) => i.re.test(t.merchant || ""));
    const key = inst ? inst.name : t.merchant;
    if (!groups.has(key)) groups.set(key, { inst, name: inst ? inst.name : t.merchant, list: [] });
    groups.get(key).list.push(t);
  }
  const months = new Set(tx.map((t) => t.date.slice(0, 7))).size || 1;

  return [...groups.values()]
    .map(({ inst, name, list }) => {
      const total = list.reduce((a, t) => a + t.amount, 0);
      const late = list.some((t) => (t.flags || []).includes("late_payment"));
      const kind = inst ? inst.kind : "credit";
      return {
        id: "acc_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        name,
        kind,
        kind_label: KIND_LABEL[kind] || "Credit",
        logo: inst ? inst.logo : null,
        match: inst ? inst.match : name,
        monthly: Math.round((total / months) * 100) / 100,
        payments: list.length,
        status: late ? "late" : "on_time",
        note:
          kind === "bnpl"
            ? list.length + (list.length === 1 ? " plan open" : " plans open")
            : list.length + (list.length === 1 ? " repayment" : " repayments"),
        last: lastDate(list)
      };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

/* ---------- credit file ---------- */
function toCreditFile(persona, tx, meta) {
  const bnpl = tx.filter((t) => /afterpay|zip|klarna|humm|openpay|laybuy/i.test(t.merchant || ""));
  const byBrand = {};
  for (const t of bnpl) {
    const b = brandOf(t.merchant).brand || "Buy now, pay later";
    byBrand[b] = byBrand[b] || [];
    byBrand[b].push(t);
  }
  const providers = Object.entries(byBrand).map(([name, list]) => {
    const key = BRAND_MATCH[name];
    return {
      name,
      logo: key ? LOGOS[key] : null,
      match: key || name,
      plans: list.length,
      instalments_left: 0,
      next_due: null, // unknown from history, so the row says "payments so far"
      amount_due: Number(list[list.length - 1].amount),
      paid_on_time: list.filter((t) => !(t.flags || []).includes("late_payment")).length,
      instalments_cycle: list.length
    };
  });

  const enquiries = tx.filter((t) => (t.flags || []).some((f) => /enquiry/i.test(f)));
  const creditFacilities = tx.filter((t) => (t.flags || []).includes("credit_facility"));

  return {
    goal: meta.goal,
    goal_date: meta.goal_date,
    goal_note: meta.goal_note,
    accounts: toAccounts(tx),
    bnpl: {
      providers,
      enquiries_6m: enquiries.length,
      active_facilities: creditFacilities.length,
      last_facility_date: bnpl.length ? lastDate(bnpl) : null,
      note: providers.length
        ? "BNPL is credit. It shows on the file lenders see."
        : "No buy now, pay later on this account."
    },
    dishonour: {
      bill_id: null,
      risk: tx.some((t) => (t.flags || []).includes("dishonoured")) ? "high" : "low",
      reason: "",
      action: ""
    }
  };
}

/* ---------- the plan ----------
   The three goals are the same mechanism for everyone, because credit behaves
   the same way for everyone. What changes is the target, which comes from that
   person's own transactions. */
function toGoals(tx) {
  const repayments = tx.filter((t) => (t.flags || []).includes("credit_repayment"));
  const onTime = repayments.filter((t) => !(t.flags || []).includes("late_payment"));
  const enquiries = tx.filter((t) => (t.flags || []).some((f) => /enquiry/i.test(f)));
  const lastEnquiry = enquiries.length ? lastDate(enquiries) : null;
  const daysSince = lastEnquiry ? Math.max(0, daysBetween(AS_OF, lastEnquiry)) : 999;

  return [
    {
      ...baseRewards.goals[0],
      id: "goal_checkin",
      source: "checkin",
      target: 7
    },
    {
      ...baseRewards.goals[1],
      id: "goal_on_time",
      title: repayments.length
        ? "Pay every credit repayment on time"
        : "Make your first on-time repayment",
      description: repayments.length
        ? "Each repayment on or before its due date, checked against your transactions."
        : "Nothing to repay yet. The first one starts your file.",
      source: "on_time",
      target: Math.max(1, repayments.length),
      unit: "repayments",
      watching: "Credit repayments",
      next_check: "Each due date",
      xp: 100,
      coins: 60
    },
    {
      ...baseRewards.goals[2],
      id: "goal_no_new_credit",
      title: "Go 30 days without new credit",
      description: "No new applications or enquiries. Every one stays on your file for 12 months.",
      source: "no_new_credit",
      target: 30,
      unit: "days",
      watching: "Credit enquiries",
      next_check: daysSince < 30 ? "In " + (30 - daysSince) + " days" : "Done",
      xp: 100,
      coins: 60,
      start: daysSince
    }
  ];
}

/* ---------- assemble ---------- */
const out = {};
for (const [name, meta] of Object.entries(PERSONAS)) {
  const { insights, questions, tx } = readPersona(name);
  const txById = Object.fromEntries(tx.map((t) => [t.id, t]));
  const score = insights.credit_score;
  const delta = score.projected_score_after_plan - score.current_score;

  const findings = toFindings(insights, txById);

  out[name] = {
    id: name,
    name: insights.customer_persona || name,
    label: meta.label,
    transactions: tx,
    questions,
    rewards: { ...baseRewards, goals: toGoals(tx) },
    bills: {
      persona: insights.customer_persona || name,
      currency: "AUD",
      as_of: AS_OF,
      data_notice:
        "Sample data for a hackathon demo. The dragon reads Westpac's own transaction data and rewards the habits that move an Australian credit score.",
      score: {
        value: score.current_score,
        scale: "equifax_au",
        max: score.scale_max,
        source: "Equifax",
        band: score.current_band,
        refreshed_at: "2026-11-03",
        consent: true,
        demo_sample: true,
        forecast: {
          range: [Math.round(score.current_score + delta * 0.6), score.projected_score_after_plan],
          horizon_months: score.timeframe_months,
          assumption: "you keep every repayment on time and open no new credit."
        }
      },
      credit_file: toCreditFile(name, tx, meta),
      payday: { frequency: "fortnightly", next: "2026-11-20" },
      totals: { recurring_monthly: 0, potential_cash_freed_monthly: 0, potential_cash_freed_annual: 0, fees_avoided: 0 },
      bills: findings
    }
  };
  console.log(
    `${name.padEnd(7)} ${findings.length} findings · score ${score.current_score}/${score.scale_max} · ` +
      `${out[name].rewards.goals.map((g) => g.target).join("/")} targets · ${tx.length} transactions`
  );
}

const js =
  "// Auto-generated by tools/build-personas.js from data/<name>_*.json (Carlos's mock\n" +
  "// data). Do not edit by hand: run `npm run build:personas`.\n" +
  "window.PERSONAS = " +
  JSON.stringify(out, null, 2) +
  ";\n";
writeFileSync(join(webRoot, "personas.js"), js, "utf8");
console.log("wrote web/personas.js (" + Math.round(js.length / 1024) + " kB)");

/* ---------- one page per persona, generated from index.html ----------
   Generated so they can never drift from the real shell. */
const shell = readFileSync(join(webRoot, "index.html"), "utf8");
for (const [name, p] of Object.entries(out)) {
  let html = shell
    .replace("<body>", '<body data-persona="' + name + '">')
    .replace("<title>Credit Dragon · Westpac</title>", "<title>Credit Dragon · " + p.name + " · Westpac</title>")
    .replace('<script src="./data.js"></script>', '<script src="./data.js"></script>\n  <script src="./personas.js"></script>');
  if (!html.includes('data-persona="' + name + '"')) {
    console.error("Could not inject the persona into index.html for " + name);
    process.exit(1);
  }
  writeFileSync(join(webRoot, name + ".html"), html, "utf8");
  console.log("wrote web/" + name + ".html");
}
