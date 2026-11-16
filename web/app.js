"use strict";

const { bills, rewards } = window.DATA;
const LS_KEY = "credit-dragon:state";
const STATE_VERSION = 2;

const $ = (sel, root = document) => root.querySelector(sel);
const coin = () => '<span class="gel-coin"></span>';

const fmtAUD = (n) =>
  "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWhole = (n) => Number(n).toLocaleString("en-AU");
const fmtPct = (n) => Math.max(0, Math.min(100, n)).toFixed(0) + "%";
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/* ---------- derived lookups ---------- */
function levelForXp(xp) {
  let cur = rewards.levels[0];
  for (const l of rewards.levels) if (xp >= l.xp_required) cur = l;
  return cur;
}
function stageForXp(xp) {
  let cur = rewards.stages[0];
  for (const s of rewards.stages) if (xp >= s.xp_required) cur = s;
  return cur;
}
function nextLevel(xp) {
  const l = levelForXp(xp);
  return rewards.levels.find((x) => x.level === l.level + 1) || null;
}
function nextStage(xp) {
  const s = stageForXp(xp);
  return rewards.stages.find((x) => x.xp_required > s.xp_required) || null;
}
const actionById = (id) => rewards.actions.find((a) => a.id === id);

/* ---------- GEL icons (pulled from WestpacGEL/GEL-next) ---------- */
function ico(name) {
  const svg = (window.GEL_ICONS || {})[name] || "";
  return '<span class="gel-ico">' + svg + "</span>";
}

const BILL_ICON = {
  bill_card: "card",
  bill_bnpl: "shopping-bag",
  bill_phone: "phone",
  bill_internet: "desktop",
  bill_streaming: "video",
  bill_spotify: "headset",
  bill_gym: "barbell",
  bill_rent: "house"
};

/* GEL FlexiCell adornment: circular icon tile */
function adorn(bill) {
  const name = BILL_ICON[bill.id] || "receipt";
  return '<span class="gel-adorn">' + ico(name) + "</span>";
}

/* The three-bucket label a change feeds: credit score / cash freed / fees avoided. */
const FACTOR_LABEL = { cash: "Cash", fees: "Fees", credit: "Credit", none: "" };
function factorChip(factor) {
  if (!factor || factor === "none") return "";
  return `<span class="gel-factor gel-factor--${factor}">${FACTOR_LABEL[factor] || factor}</span>`;
}

function imgOrEmoji(src, emoji, alt, cls) {
  return (
    '<img src="' + src + '" alt="' + alt + '" class="' + cls + '" loading="lazy" ' +
    'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'">' +
    '<span style="display:none" class="' + cls + ' emoji-fallback">' + emoji + "</span>"
  );
}

/* ---------- micro-animations ---------- */
function animateCount(el, from, to, fmt) {
  if (!el) return;
  if (from === to) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  const dur = 550;
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function sparkles(n) {
  const spots = [[16, 30], [84, 14], [10, 62], [88, 68], [50, 4], [50, 92]];
  let out = "";
  for (let i = 0; i < n; i++) {
    const pos = spots[i % spots.length];
    out +=
      '<span class="gel-sparkle" style="left:' + pos[0] + "%;top:" + pos[1] +
      "%;animation-delay:" + (i * 0.09).toFixed(2) + 's">' + (i % 2 ? "✨" : "⭐") + "</span>";
  }
  return out;
}

/* ---------- state ---------- */
function initialState() {
  return {
    version: STATE_VERSION,
    xp_total: rewards.starting_state.xp_total,
    coins: rewards.starting_state.coins,
    streak_weeks: rewards.starting_state.streak_weeks,
    protected: false, // protected balance set for the at-risk debit
    bills: {},
    goals: {},
    /* wardrobe: equipped[slot] = shop item id (hat / face / neck / home) */
    shop: { owned: [], equipped: { hat: null, face: null, neck: null, home: null }, feeds: 0, fed_at: null },
    /* the customer's own choices — the AI only recommends, they decide */
    choices: defaultChoices(),
    awarded: [],
    ledger: []
  };
}

function defaultChoices() {
  const out = {};
  for (const rec of bills.recommendations || []) {
    if (rec.kind === "keep_one") out[rec.id] = rec.default_keep;
  }
  return out;
}

/* Old saves from a previous build may lack the wardrobe/choices shape. */
function normalise(s) {
  const base = initialState();
  if (s.protected === undefined) s.protected = false;
  s.shop = s.shop || {};
  s.shop.owned = s.shop.owned || [];
  s.shop.equipped = Object.assign({}, base.shop.equipped, s.shop.equipped || {});
  s.shop.feeds = s.shop.feeds || 0;
  s.shop.fed_at = s.shop.fed_at || null;
  s.choices = Object.assign({}, base.choices, s.choices || {});
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === STATE_VERSION) return normalise(s);
    }
  } catch (e) {
    /* ignore corrupt state */
  }
  return initialState();
}
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage may be unavailable */
  }
}

let state = load();

function reset() {
  state = initialState();
  save();
  render();
  toast(coin() + " Demo reset");
}

/* ---------- awarding ---------- */
function monthKey(ts) {
  return new Date(ts).toISOString().slice(0, 7);
}

function award(actionId, sourceId, reason) {
  const action = actionById(actionId);
  if (!action) return null;

  const key = sourceId + ":" + actionId;
  if (state.awarded.includes(key)) return null; // idempotency

  if (action.cap.type === "per_month") {
    const m = monthKey(new Date().toISOString());
    const count = state.ledger.filter((e) => e.action === actionId && monthKey(e.ts) === m).length;
    if (count >= action.cap.limit) return null;
  }

  const beforeStage = stageForXp(state.xp_total);
  const beforeLevel = levelForXp(state.xp_total);

  const xp = action.xp || 0;
  const c = action.coins || 0;

  state.xp_total += xp;
  state.coins += c;
  state.awarded.push(key);
  state.ledger.push({
    ts: new Date().toISOString(),
    action: actionId,
    source_id: sourceId,
    xp,
    coins: c,
    reason
  });

  const afterStage = stageForXp(state.xp_total);
  const afterLevel = levelForXp(state.xp_total);

  save();
  return {
    xp,
    coins: c,
    leveled: afterLevel.level > beforeLevel.level,
    evolved: afterStage.id !== beforeStage.id,
    fromStage: beforeStage,
    toStage: afterStage
  };
}

/* ---------- handlers (exposed for inline onclick) ---------- */
/* Insight actions (actOnInsight / runInsight / dismissInsight / setProtected)
   live in the INSIGHTS section below, next to their renderers. */

function completeGoal(id) {
  const goal = rewards.goals.find((g) => g.id === id);
  if (!goal || state.goals[id]?.status === "completed") return;
  state.goals[id] = { status: "completed", completed_at: new Date().toISOString() };
  const res = award("goal_completed", id, goal.title + " completed");
  save();
  render();
  if (res && (res.xp || res.coins)) {
    toast("+" + res.xp + " XP · +" + res.coins + " " + coin());
    if (res.evolved) showEvolution(res.fromStage, res.toStage);
  }
}

/* ---------- shop + wardrobe ----------
   What you buy is not a receipt on a shelf: it is worn. Hats, shades, scarves and
   homes are attached to the dragon in the Dragon tab, and food is consumed. */
const WEAR_SLOTS = ["hat", "face", "neck", "home"];
const itemById = (id) => rewards.shop.find((s) => s.id === id) || null;
const isWearing = (id) => {
  const it = itemById(id);
  return !!it && state.shop.equipped[it.slot] === id;
};
const wearing = (slot) => itemById(state.shop.equipped[slot]);
const wornItems = () => WEAR_SLOTS.map((s) => wearing(s)).filter(Boolean);

function wearItem(id) {
  const item = itemById(id);
  if (!item || !WEAR_SLOTS.includes(item.slot)) return;
  state.shop.equipped[item.slot] = id;
  save();
  render();
  toast(item.emoji + " " + item.name + " on — see your dragon");
}

function takeOff(id) {
  const item = itemById(id);
  if (!item || !WEAR_SLOTS.includes(item.slot)) return;
  if (state.shop.equipped[item.slot] === id) state.shop.equipped[item.slot] = null;
  save();
  render();
  toast(item.name + " taken off");
}

function buyItem(id) {
  const item = itemById(id);
  if (!item || item.locked) return;

  const lvl = levelForXp(state.xp_total).level;
  if (item.unlock_level && lvl < item.unlock_level) return;

  // food is repeatable: every purchase feeds the dragon again
  if (item.slot === "food") return feedDragon(item);

  // already owned → wearing it is free
  if (state.shop.owned.includes(id)) return wearItem(id);

  if (state.coins < item.cost) return;

  state.coins -= item.cost;
  state.shop.owned.push(id);
  if (WEAR_SLOTS.includes(item.slot)) state.shop.equipped[item.slot] = id; // buy = wear it
  state.ledger.push({
    ts: new Date().toISOString(),
    action: "shop_purchase",
    source_id: id,
    xp: 0,
    coins: -item.cost,
    reason: "Bought " + item.name
  });
  save();
  render();
  toast(item.emoji + " " + item.name + " on — " + fmtWhole(item.cost) + " " + coin());
}

function feedDragon(item) {
  const food = item || itemById("item_feast");
  if (!food || state.coins < food.cost) return;
  state.coins -= food.cost;
  state.shop.feeds += 1;
  state.shop.fed_at = new Date().toISOString();
  state.ledger.push({
    ts: new Date().toISOString(),
    action: "shop_purchase",
    source_id: food.id,
    xp: 0,
    coins: -food.cost,
    reason: "Fed the dragon a " + food.name
  });
  save();
  render();
  toast(food.emoji + " Nom nom! Your dragon is happy.");
  hopDragon();
  hearts();
}

function closeModal() {
  $("#modal-root").innerHTML = "";
}

/* ---------- toast + evolution dialog ---------- */
let toastTimer = null;
function toast(html) {
  const el = $("#toast");
  el.innerHTML = html;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

/* GEL Modal: rounded-3xl dialog, 24px bold title, 16px body, backdrop black/65 */
function showEvolution(from, to) {
  $("#modal-root").innerHTML =
    '<div class="gel-overlay" onclick="if(event.target===this)closeModal()">' +
    '<div class="gel-dialog" role="dialog" aria-modal="true" aria-labelledby="evo-title">' +
    '<button class="gel-dialog-close" type="button" aria-label="Close" onclick="closeModal()">' +
    ico("close") +
    "</button>" +
    '<h2 class="gel-dialog-title" id="evo-title">Your dragon evolved</h2>' +
    '<div class="gel-dialog-body">' +
    '<div class="gel-evo-scene">' +
    sparkles(8) +
    dragonMarkup(to) +
    "</div>" +
    '<p style="text-align:center;margin:12px 0 0">' +
    from.name + " is now a <strong>" + to.name + "</strong></p>" +
    '<p class="gel-muted" style="text-align:center;margin:6px 0 0">' +
    fmtWhole(to.xp_required) + " XP reached. Keep repayments on time to keep growing.</p>" +
    "</div>" +
    '<div class="gel-dialog-actions">' +
    '<button class="gel-btn-primary" type="button" onclick="closeModal()">Continue</button>' +
    "</div>" +
    "</div></div>";
}

/* ==========================================================================
   INSIGHTS — the credit-health findings
   --------------------------------------------------------------------------
   The dragon is a credit-score coach. Each card is a *finding* from Westpac's
   own transaction data, mapped to what actually moves an Australian credit
   score (repayment history, enquiries, limits, defaults), with advice and one
   action. There is no "switch provider", and no brand the customer doesn't
   already pay is ever recommended.
   ========================================================================== */

const insightActionForType = { remind: "reminder_set", track: "insight_tracked", protect: "protected_balance" };

const periodWord = (p) => (p === "fortnightly" ? "fortnight" : "month");
const moneyUnit = (p) => '<span class="gel-money-unit">/' + (p === "fortnightly" ? "fortnight" : "mo") + "</span>";

function billHead(bill, trailing) {
  return `
    <div class="gel-bill-head">
      ${adorn(bill)}
      <div class="gel-cell-body">
        <div class="gel-bill-title">${bill.label}</div>
        <div class="gel-muted">${bill.provider} · ${bill.plan}</div>
      </div>
      <div class="gel-bill-amount">${trailing || ""}</div>
    </div>`;
}

function evidenceRows(bill) {
  const rows = bill.evidence || [];
  if (!rows.length) return "";
  return (
    '<div class="gel-kvs" style="margin-top:9px">' +
    rows
      .map(
        (r) =>
          `<div class="gel-kv"><span class="gel-kv-k">${r.k}</span><span class="gel-kv-v">${r.v}</span></div>`
      )
      .join("") +
    "</div>"
  );
}

/* Neutral source link — the customer checks the market / source themselves. */
function sourceLink(bill) {
  let url = "";
  let label = "";
  if (bill.benchmark && bill.benchmark.source_url) {
    url = bill.benchmark.source_url;
    label = "Check the market · " + (bill.benchmark.source || "neutral source");
  } else if (bill.source_url) {
    url = bill.source_url;
    label = bill.source_label || "Check the source";
  } else if (bill.provider_url) {
    url = bill.provider_url;
    label = "View " + bill.provider + " details";
  }
  if (!url) return "";
  return `<div class="gel-linkrow">
    <a class="gel-link gel-link-sm" href="${url}" target="_blank" rel="noopener noreferrer">
      ${label}${ico("arrow-right")}
    </a>
  </div>`;
}

function isActionable(bill) {
  return ["remind", "protect", "track"].includes(bill.action_type);
}

function actOnInsight(id) {
  const bill = bills.bills.find((b) => b.id === id);
  if (!bill || state.bills[id]?.status === "done") return null;
  state.bills[id] = { status: "done", acted_at: new Date().toISOString() };
  if (bill.action_type === "protect") state.protected = true;
  const actionId = insightActionForType[bill.action_type];
  return actionId ? award(actionId, id, bill.label) : null;
}

function runInsight(id) {
  const res = actOnInsight(id);
  if (!res) return;
  save();
  render();
  if (res.xp || res.coins) {
    toast("+" + res.xp + " XP · +" + res.coins + " " + coin());
    if (res.evolved) showEvolution(res.fromStage, res.toStage);
  }
}

function dismissInsight(id) {
  state.bills[id] = { status: "dismissed", dismissed_at: new Date().toISOString() };
  save();
  render();
}

function doneCopy(bill) {
  if (bill.action_type === "remind") return "Reminder set. On-time repayments are the #1 thing that builds your score.";
  if (bill.action_type === "protect") return "Protected balance set for Thu 19 Nov. No dishonour fee this time.";
  if (bill.action_type === "track") return "We're watching this. We'll confirm any saving when the debit changes.";
  return "Noted.";
}

function insightActionButton(bill) {
  if (state.bills[bill.id]?.status === "done") return `<span class="gel-badge gel-badge--success">Done</span>`;
  if (bill.action_type === "remind")
    return `<button class="gel-btn-primary gel-btn-block" type="button" onclick="runInsight('${bill.id}')">${ico("notification")} Set a reminder</button>`;
  if (bill.action_type === "protect")
    return `<button class="gel-btn-primary gel-btn-block" type="button" onclick="runInsight('${bill.id}')">${ico("shield")} Protect balance</button>`;
  if (bill.action_type === "track")
    return `<button class="gel-btn-primary gel-btn-block" type="button" onclick="runInsight('${bill.id}')">${ico("check")} Track this</button>`;
  return "";
}

function insightCard(bill) {
  const st = state.bills[bill.id]?.status;
  if (st === "dismissed")
    return `<article class="gel-cell gel-bill is-muted" data-bill="${bill.id}">${billHead(bill, `<span class="gel-badge gel-badge--faint">Dismissed</span>`)}</article>`;
  if (st === "done")
    return `<article class="gel-cell gel-bill is-done" data-bill="${bill.id}">${billHead(bill, `<span class="gel-badge gel-badge--success">Done</span>`)}<div class="gel-hr"></div><p class="gel-note gel-note--good">${doneCopy(bill)}</p></article>`;

  const amount = bill.current_amount
    ? `<span class="gel-money">${fmtAUD(bill.current_amount)}</span>${moneyUnit(bill.billing_period)}`
    : "";
  const action = insightActionButton(bill);

  return `
    <article class="gel-cell gel-bill" data-bill="${bill.id}">
      ${billHead(bill, amount)}
      <div class="gel-tagline">
        ${factorChip(bill.factor)}
        <span class="gel-muted">${bill.finding || ""}</span>
      </div>
      <details class="gel-why">
        <summary>How we know this</summary>
        ${evidenceRows(bill)}
        <p class="gel-note">${bill.why}</p>
        ${bill.advice ? `<p class="gel-note gel-note--warn">${bill.advice}</p>` : ""}
        ${sourceLink(bill)}
      </details>
      ${action ? `<div class="gel-card-actions">${action}<button class="gel-btn-text" type="button" onclick="dismissInsight('${bill.id}')">Dismiss</button></div>` : ""}
    </article>`;
}

function billStatusCard(bill) {
  const label = bill.action_type === "keep" ? "Keeping" : "No change";
  return `
    <article class="gel-cell gel-bill is-muted" data-bill="${bill.id}">
      ${billHead(bill, `<span class="gel-money gel-money--muted">${fmtAUD(bill.current_amount)}</span>${moneyUnit(bill.billing_period)}`)}
      <p class="gel-note">${bill.why}</p>
      <div class="gel-tagline"><span class="gel-badge gel-badge--faint">${label}</span>${sourceLink(bill)}</div>
    </article>`;
}

/* Cash the customer could free up — potential only, never claimed as saved. */
function recommendedSavings() {
  return bills.bills.reduce(
    (a, b) => (b.factor === "cash" && b.savings_status === "potential" ? a + b.savings_monthly : a),
    0
  );
}

function westpacProductsPanel() {
  const prods = bills.westpac_products || [];
  if (!prods.length) return "";
  const rows = prods
    .map(
      (p) => `
      <div class="gel-kv">
        <span class="gel-kv-k">${p.name}</span>
        <span class="gel-kv-v" style="color:var(--text-success)">${p.purchase_rate_pct} p.a.</span>
      </div>
      <p class="gel-note" style="margin:6px 0 0">${p.comparison} · ${p.note}</p>
      <div class="gel-linkrow">
        <a class="gel-link gel-link-sm" href="${p.overview_uri}" target="_blank" rel="noopener noreferrer">Check it yourself${ico("arrow-right")}</a>
      </div>
      <div class="gel-verified" style="margin-top:6px">${ico("check")} ${p.source} · checked ${fmtDate(p.checked_at)}</div>`
    )
    .join('<div class="gel-hr"></div>');
  return `
    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Your own bank's products</span>
        <span class="gel-badge gel-badge--hero">Westpac</span>
      </div>
      <div class="gel-hr"></div>
      ${rows}
    </section>`;
}

function insightsSummary() {
  const credit = bills.bills.filter((b) => b.factor === "credit" && isActionable(b)).length;
  const cash = bills.bills.filter((b) => b.factor === "cash" && isActionable(b)).length;
  const fees = bills.bills.filter((b) => b.factor === "fees" && isActionable(b)).length;
  return `
    <section class="gel-panel">
      <div class="gel-panel-head">
        <span class="gel-panel-title">What we found in your transactions</span>
      </div>
      <div class="gel-panel-body">
        <p class="gel-muted" style="margin:0">
          Every finding is mapped to what actually moves an Australian credit score —
          repayment history, enquiries, limits and defaults. Things that only free up cash
          are labelled <strong>Cash</strong>, not credit.
        </p>
        <div class="gel-buckets" style="margin-top:12px">
          <div class="gel-bucket gel-bucket--score"><span class="gel-bucket-label">Credit</span><span class="gel-bucket-val">${credit}</span><span class="gel-bucket-sub">affect your score</span></div>
          <div class="gel-bucket gel-bucket--cash"><span class="gel-bucket-label">Cash</span><span class="gel-bucket-val">${cash}</span><span class="gel-bucket-sub">frees up repayments</span></div>
          <div class="gel-bucket gel-bucket--fees"><span class="gel-bucket-label">Fees</span><span class="gel-bucket-val">${fees}</span><span class="gel-bucket-sub">avoid a black mark</span></div>
        </div>
      </div>
    </section>`;
}

function renderInsights() {
  const order = { remind: 0, protect: 1, track: 2, keep: 3, no_offer: 4 };
  const actionable = bills.bills.filter(
    (b) => isActionable(b) && state.bills[b.id]?.status !== "done" && state.bills[b.id]?.status !== "dismissed"
  ).length;

  const cards = bills.bills
    .slice()
    .sort((a, b) => order[a.action_type] - order[b.action_type])
    .map((b) => (b.action_type === "keep" || b.action_type === "no_offer" ? billStatusCard(b) : insightCard(b)))
    .join("");

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Insights</h1>
        <p class="gel-muted">${actionable} ${actionable === 1 ? "pattern" : "patterns"} to act on</p>
      </div>
      <span class="gel-badge gel-badge--faint">Last 3 months</span>
    </div>
    ${insightsSummary()}
    ${cards}`;
}

function renderGoals() {
  const cards = rewards.goals
    .map((g) => {
      const done = state.goals[g.id]?.status === "completed";
      let progress = 0;
      if (done) progress = 100;
      else if (g.progress_source === "reminder_set") progress = state.bills["bill_card"]?.status === "done" ? 100 : 0;
      else if (g.progress_source === "protected_balance") progress = state.protected ? 100 : 0;

      const ready = !done && progress === 100;
      const sub = done ? "Completed" : ready ? "Ready — mark done" : g.progress_hint || "Tap to mark done";

      return `
        <article class="gel-cell" data-goal="${g.id}">
          <div class="gel-pick-body">
            <div class="gel-bill-title">${g.title}</div>
            <p class="gel-muted" style="margin:0">${g.description}</p>
          </div>
          <div class="gel-bar gel-bar--skinny" style="margin-top:12px">
            <div class="gel-bar-fill" style="width:${fmtPct(progress)}"></div>
          </div>
          <div class="gel-progress-note">
            <span class="gel-muted">${sub}</span>
            <span class="gel-badge ${done ? "gel-badge--success" : "gel-badge--faint"}">
              ${done ? "Completed" : "+" + g.xp + " XP · " + g.coins + " coins"}
            </span>
          </div>
          ${
            done
              ? ""
              : `<div class="gel-card-actions">
                   <button class="gel-btn-primary" type="button" onclick="completeGoal('${g.id}')">
                     ${ready ? "Complete goal" : "Mark done"}
                   </button>
                 </div>`
          }
        </article>`;
    })
    .join("");

  return `<div class="gel-screen-head"><h1 class="gel-title">Credit health plan</h1>${
    `<span class="gel-badge gel-badge--faint">${rewards.goals.length} goals</span>`
  }</div>${cards}`;
}

/* ==========================================================================
   DRAGON
   --------------------------------------------------------------------------
   The dragon keeps the original emoji / PNG-art look (the version you liked),
   but is now interactive: shop items are worn as layered emoji on top of it, a
   "home" changes the scene behind it, food makes it hop, and tapping it gives a
   credit-health tip. Naomi's PNGs drop in at assets/dragon/*.png and
   assets/shop/*.png; until then the emoji stand in.
   ========================================================================== */

/* Where each worn item sits on the dragon emoji, per stage (top % of the box). */
const WEAR_ANCHOR = {
  egg: { hat: 2, face: 34, neck: 60 },
  baby: { hat: 4, face: 37, neck: 62 },
  teen: { hat: 3, face: 37, neck: 62 },
  adult: { hat: 2, face: 36, neck: 60 }
};

function wearGlyph(emoji, slot, top) {
  return `<span class="dragon-wear dragon-wear--${slot}" style="top:${top}%">${emoji}</span>`;
}

/* The dragon itself (emoji / PNG) with whatever it's wearing layered on top. */
function dragonMarkup(stage, equipped) {
  const eq = equipped || state.shop.equipped;
  const hat = itemById(eq.hat);
  const face = itemById(eq.face);
  const neck = itemById(eq.neck);
  const anchor = WEAR_ANCHOR[stage.id] || WEAR_ANCHOR.baby;
  return `
    <div class="gel-dragon-wrap" id="dragon-art">
      ${imgOrEmoji(stage.image, stage.emoji, stage.name, "dragon-img")}
      ${neck ? wearGlyph(neck.emoji, "neck", anchor.neck) : ""}
      ${face ? wearGlyph(face.emoji, "face", anchor.face) : ""}
      ${hat ? wearGlyph(hat.emoji, "hat", anchor.hat) : ""}
    </div>`;
}

function sceneId() {
  const home = itemById(state.shop.equipped.home);
  return (home && home.scene) || "plain";
}

function sceneHtml(extraClass) {
  const stage = stageForXp(state.xp_total);
  return `<div class="gel-scene ${extraClass || ""}" data-scene="${sceneId()}" onclick="pokeDragon()"
               role="button" tabindex="0" aria-label="Your ${stage.name}. Tap to interact.">
    <div class="gel-scene-sky"></div>
    ${dragonMarkup(stage)}
    <div class="gel-bubble" id="dragon-bubble"></div>
    <div class="gel-hearts" id="dragon-hearts"></div>
  </div>`;
}

const DRAGON_LINES = [
  "Rawr. Every repayment on time makes me a little bigger.",
  "I only grow from good money habits — never from shopping.",
  "Review a bill and approve it. I get the XP, you get the savings.",
  "Bills first, snacks later. That's the rule.",
  "A dishonour fee is the only thing that makes me grumpy."
];

let lineIdx = 0;
function pokeDragon() {
  const bubble = $("#dragon-bubble");
  if (bubble) {
    lineIdx = (lineIdx + 1) % DRAGON_LINES.length;
    bubble.textContent = DRAGON_LINES[lineIdx];
    bubble.classList.add("show");
    clearTimeout(pokeDragon.timer);
    pokeDragon.timer = setTimeout(() => bubble.classList.remove("show"), 3200);
  }
  hopDragon();
}

function hopDragon() {
  const art = $("#dragon-art");
  if (!art) return;
  art.classList.remove("is-happy");
  void art.offsetWidth;
  art.classList.add("is-happy");
}

function hearts() {
  const box = $("#dragon-hearts");
  if (!box) return;
  box.innerHTML = Array.from({ length: 5 })
    .map(
      (_, i) =>
        `<span class="gel-heart" style="left:${28 + i * 11}%;animation-delay:${(i * 0.08).toFixed(2)}s">${
          i % 2 ? "💛" : "❤️"
        }</span>`
    )
    .join("");
  setTimeout(() => {
    if (box) box.innerHTML = "";
  }, 1600);
}

function renderDragon() {
  const stage = stageForXp(state.xp_total);
  const lvl = levelForXp(state.xp_total);
  const nxt = nextLevel(state.xp_total);
  const nxtStage = nextStage(state.xp_total);
  const lvlPct = nxt ? ((state.xp_total - lvl.xp_required) / (nxt.xp_required - lvl.xp_required)) * 100 : 100;
  const stagePct = nxtStage
    ? ((state.xp_total - stage.xp_required) / (nxtStage.xp_required - stage.xp_required)) * 100
    : 100;

  const worn = wornItems();
  const wardrobe = worn.length
    ? worn.map((it) => `<span class="gel-worn">${it.emoji} ${it.name}</span>`).join("")
    : `<span class="gel-muted">Nothing on yet — visit the shop to dress your dragon.</span>`;

  const trail = rewards.stages
    .map((s) => {
      const reached = state.xp_total >= s.xp_required;
      return `<span class="gel-stage-dot ${reached ? "is-reached" : ""}">${s.emoji}</span>`;
    })
    .join("");

  const ledgerHtml = state.ledger.length
    ? state.ledger
        .slice()
        .reverse()
        .slice(0, 8)
        .map(
          (e) => `<div class="gel-kv">
            <span class="gel-muted">${e.reason}</span>
            <span class="gel-kv-v">+${e.xp} XP · ${e.coins >= 0 ? "+" : ""}${e.coins}</span>
          </div>`
        )
        .join("")
    : `<p class="gel-muted">No activity yet.</p>`;

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">${stage.name}</h1>
        <p class="gel-muted">Level ${lvl.level} · ${fmtWhole(state.xp_total)} XP · ${state.streak_weeks}-week streak</p>
      </div>
      <span class="gel-coin-pill">${coin()}${fmtWhole(state.coins)}</span>
    </div>

    ${sceneHtml()}

    <article class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Wearing</span>
        <button class="gel-btn-text gel-btn-text--sm" type="button" onclick="setTab('shop')">Change</button>
      </div>
      <div class="gel-wornlist">${wardrobe}</div>
      <div class="gel-hr"></div>
      <div class="gel-row-between">
        <span class="gel-label">Feasts</span>
        <span class="gel-kv-v">${state.shop.feeds}</span>
      </div>
    </article>

    <article class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Level ${lvl.level}</span>
        <span class="gel-label">${nxt ? "Level " + nxt.level : "Max level"}</span>
      </div>
      <div class="gel-bar" style="margin-top:6px">
        <div class="gel-bar-fill" style="width:${fmtPct(lvlPct)}">
          <span class="gel-bar-label">${fmtPct(lvlPct)}</span>
        </div>
      </div>
      <p class="gel-note">${
        nxt ? fmtWhole(nxt.xp_required - state.xp_total) + " XP to Level " + nxt.level : "You've reached the top level."
      }</p>
    </article>

    <article class="gel-cell">
      <div class="gel-stage-trail">${trail}</div>
      <div class="gel-bar gel-bar--skinny">
        <div class="gel-bar-fill" style="width:${fmtPct(stagePct)}"></div>
      </div>
      <p class="gel-note">${
        nxtStage ? fmtWhole(nxtStage.xp_required - state.xp_total) + " XP to evolve into " + nxtStage.name : "Fully grown."
      }</p>
    </article>

    <details class="gel-cell">
      <summary class="gel-summary">Activity log</summary>
      <div style="margin-top:6px">${ledgerHtml}</div>
    </details>

    <button class="gel-btn-ghost gel-btn-block" type="button" onclick="reset()">Reset demo</button>`;
}

function shopCta(item) {
  const owned = state.shop.owned.includes(item.id);
  const unlocked = !item.unlock_level || levelForXp(state.xp_total).level >= item.unlock_level;
  const affordable = state.coins >= item.cost;

  if (item.locked) return `<span class="gel-badge gel-badge--hero">Pitch concept</span>`;
  if (!unlocked)
    return `<span class="gel-badge gel-badge--faint">Unlocks at Level ${item.unlock_level}</span>`;
  if (item.slot === "food")
    return `<button class="gel-btn-primary gel-btn-sm gel-btn-block" type="button" ${affordable ? "" : "disabled"}
              onclick="buyItem('${item.id}')">${affordable ? "Buy &amp; feed" : "Not enough coins"}</button>`;
  if (owned && isWearing(item.id))
    return `<button class="gel-btn-ghost gel-btn-sm gel-btn-block" type="button"
              onclick="takeOff('${item.id}')">Wearing — take off</button>`;
  if (owned)
    return `<button class="gel-btn-primary gel-btn-sm gel-btn-block" type="button"
              onclick="wearItem('${item.id}')">Wear</button>`;
  return `<button class="gel-btn-primary gel-btn-sm gel-btn-block" type="button" ${affordable ? "" : "disabled"}
            onclick="buyItem('${item.id}')">${affordable ? "Buy " + fmtWhole(item.cost) : "Not enough coins"}</button>`;
}

function renderShop() {
  const stage = stageForXp(state.xp_total);
  const worn = wornItems();
  const items = rewards.shop
    .map((item) => {
      const wearingNow = isWearing(item.id);
      return `
        <article class="gel-cell gel-shop-item ${wearingNow ? "is-worn" : ""}" data-item="${item.id}">
          <div class="gel-shop-art">
            ${imgOrEmoji(item.image, item.emoji, item.name, "shop-img")}
            ${wearingNow ? `<span class="gel-shop-worn">${ico("check")}</span>` : ""}
          </div>
          <div class="gel-shop-name">${item.name}</div>
          <div class="gel-shop-price">
            <span class="gel-money gel-money--sm">${fmtWhole(item.cost)}</span>
            ${coin()}
          </div>
          <p class="gel-shop-desc">${item.description}</p>
          ${shopCta(item)}
        </article>`;
    })
    .join("");

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Dragon shop</h1>
        <p class="gel-muted">${worn.length ? worn.length + " items worn · " : ""}${fmtWhole(state.coins)} coins</p>
      </div>
      <span class="gel-badge gel-badge--faint">${stage.emoji} ${stage.name}</span>
    </div>

    ${sceneHtml("gel-scene--mini")}

    <div class="gel-shop-grid">${items}</div>`;
}

/* ==========================================================================
   SCORE — the credit-file trajectory view
   --------------------------------------------------------------------------
   The dragon is a picture of the score's trajectory. This tab shows the
   bureau score (consent-gated, sourced, dated), the forecast as a range with
   a stated assumption, the three honest buckets, the BNPL "credit you don't
   see" panel, the four bureau factors as direction (not points), and the
   predicted-vs-actual accountability loop.
   ========================================================================== */

function protectedBalanceAction() {
  if (state.protected) {
    return `<div class="gel-alert gel-alert--success">
      ${ico("check")} Protected balance set for Thu 19 Nov. We'll confirm when the debit clears.
    </div>`;
  }
  return `<button class="gel-btn-primary gel-btn-block" type="button" onclick="setProtected()">
    ${ico("shield")} Set a protected balance
  </button>`;
}

function renderScore() {
  const score = bills.score || {};
  const cf = bills.credit_file || {};
  const factors = rewards.credit_factors || [];
  const forecast = score.forecast || {};
  const prev = forecast.previous || {};
  const bnpl = cf.bnpl || {};
  const gym = bills.bills.find((b) => b.id === "bill_gym");
  const feesAvoided = (gym && gym.offer && gym.offer.fee_avoided) || 19;

  const factorRows = factors
    .map((f) => {
      const up = f.direction === "up";
      return `
        <div class="gel-factor-row">
          <span class="gel-factor-arrow ${up ? "is-up" : "is-down"}">${up ? "↑" : "↓"}</span>
          <div class="gel-factor-body">
            <div class="gel-row-between">
              <span class="gel-bill-title">${f.label}</span>
              <span class="gel-badge gel-badge--faint">${f.impact}</span>
            </div>
            <p class="gel-muted" style="margin:2px 0 0">${f.what}</p>
          </div>
        </div>`;
    })
    .join("");

  const bnplRows = (bnpl.providers || [])
    .map(
      (p) => `
      <div class="gel-kv gel-bnpl-row">
        <span class="gel-bnpl-name">${p.name}</span>
        <span class="gel-muted">${p.facilities} ${p.facilities === 1 ? "facility" : "facilities"} · ${p.instalments_due} due</span>
        <span class="gel-kv-v">${fmtAUD(p.amount_due)} <span class="gel-money-unit">${fmtDate(p.next_due)}</span></span>
      </div>`
    )
    .join("");

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Your credit</h1>
        <p class="gel-muted">${cf.goal || "Credit health"} · ${cf.goal_date ? "by " + fmtDate(cf.goal_date) : ""}</p>
      </div>
      <span class="gel-badge gel-badge--hero">${score.source || "Equifax"}</span>
    </div>

    <section class="gel-panel gel-score-hero">
      <div class="gel-panel-head">
        <span class="gel-panel-title">Credit score</span>
        <span class="gel-panel-title">${score.consent ? "Shared with consent" : ""}</span>
      </div>
      <div class="gel-panel-body">
        <div class="gel-score-num">${score.value != null ? fmtWhole(score.value) : "—"}<span class="gel-score-max">/${score.max != null ? fmtWhole(score.max) : ""}</span></div>
        <p class="gel-muted" style="margin:4px 0 0">${score.source} · updated ${score.refreshed_at ? fmtDate(score.refreshed_at) : "—"}</p>
        ${score.demo_sample ? '<p class="gel-note gel-note--warn" style="margin:6px 0 0">Sample score for this demo.</p>' : ""}

        <div class="gel-hr"></div>
        <div class="gel-forecast">
          <div class="gel-row-between">
            <span class="gel-label">Forecast in ${forecast.horizon_months || 3} months</span>
            <span class="gel-money gel-money--good">${fmtWhole(forecast.range ? forecast.range[0] : 0)}–${fmtWhole(forecast.range ? forecast.range[1] : 0)}</span>
          </div>
          <p class="gel-note" style="margin:6px 0 0">If: ${forecast.assumption || "you keep repayments on time."}</p>
        </div>
      </div>
    </section>

    <div class="gel-buckets">
      <div class="gel-bucket gel-bucket--score">
        <span class="gel-bucket-label">Credit score</span>
        <span class="gel-bucket-val">${score.value != null ? fmtWhole(score.value) : "—"}</span>
        <span class="gel-bucket-sub">held, not grown</span>
      </div>
      <div class="gel-bucket gel-bucket--cash">
        <span class="gel-bucket-label">Cash freed</span>
        <span class="gel-bucket-val">${fmtAUD(recommendedSavings())}</span>
        <span class="gel-bucket-sub">/month · potential</span>
      </div>
      <div class="gel-bucket gel-bucket--fees">
        <span class="gel-bucket-label">Fees avoided</span>
        <span class="gel-bucket-val">${fmtAUD(feesAvoided)}</span>
        <span class="gel-bucket-sub">dishonour fee</span>
      </div>
    </div>

    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Credit you don't see</span>
        <span class="gel-badge gel-badge--faint">${bnpl.active_facilities || 0} facilities</span>
      </div>
      <p class="gel-note" style="margin:6px 0 0">${bnpl.note || ""}</p>
      <div class="gel-hr"></div>
      ${bnplRows}
      <div class="gel-hr"></div>
      <div class="gel-kv">
        <span class="gel-muted">Credit enquiries</span>
        <span class="gel-kv-v">${bnpl.enquiries_6m || 0} in 6 months</span>
      </div>
    </section>

    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">What moves it</span>
        <span class="gel-muted">direction, not points</span>
      </div>
      <div class="gel-factor-list">${factorRows}</div>
    </section>

    ${westpacProductsPanel()}

    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Last check</span>
        <span class="gel-muted">${prev.refreshed_at ? fmtDate(prev.refreshed_at) : "—"}</span>
      </div>
      <div class="gel-forecast" style="margin-top:8px">
        <div class="gel-row-between">
          <span class="gel-muted">We predicted ${prev.predicted_range ? fmtWhole(prev.predicted_range[0]) + "–" + fmtWhole(prev.predicted_range[1]) : "—"}</span>
          <span class="gel-money">${prev.actual != null ? fmtWhole(prev.actual) : "—"}</span>
        </div>
        <p class="gel-note gel-note--good" style="margin:6px 0 0">You landed inside the range. On-time repayments did the work.</p>
      </div>
    </section>

    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">A debit is at risk</span>
        <span class="gel-badge gel-badge--warning">Payday minus 1</span>
      </div>
      <p class="gel-note" style="margin:6px 0 0">${cf.dishonour ? cf.dishonour.reason : ""}</p>
      <div class="gel-hr"></div>
      ${protectedBalanceAction()}
    </section>`;
}

function setProtected() {
  if (state.protected) { render(); return; }
  state.protected = true;
  const gym = bills.bills.find((b) => b.id === "bill_gym");
  if (gym && state.bills[gym.id]?.status !== "done") {
    state.bills[gym.id] = { status: "done", acted_at: new Date().toISOString() };
    award("protected_balance", gym.id, gym.label);
  }
  save();
  render();
  toast(ico("shield") + " Protected balance set for Thu 19 Nov");
}

/* ---------- shell ---------- */
let activeTab = "score";
let lastCoins = 0;

function render() {
  animateCount($("#header-coins"), lastCoins, state.coins, fmtWhole);
  lastCoins = state.coins;

  const screen = $("#screen");
  if (activeTab === "score") screen.innerHTML = renderScore();
  else if (activeTab === "insights") screen.innerHTML = renderInsights();
  else if (activeTab === "goals") screen.innerHTML = renderGoals();
  else if (activeTab === "dragon") screen.innerHTML = renderDragon();
  else screen.innerHTML = renderShop();
}

function setTab(tab) {
  if (tab === activeTab) return;
  activeTab = tab;
  document.querySelectorAll("#tabbar .gel-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  render();
  const screen = $("#screen");
  screen.classList.remove("screen-enter");
  void screen.offsetWidth; // restart animation
  screen.classList.add("screen-enter");
}

document.querySelectorAll("#tabbar .gel-tab").forEach((b) => {
  b.addEventListener("click", () => setTab(b.dataset.tab));
});

// inject GEL icons into any [data-icon] placeholder
document.querySelectorAll("[data-icon]").forEach((el) => {
  const name = el.getAttribute("data-icon");
  if (window.GEL_ICONS && window.GEL_ICONS[name]) el.innerHTML = window.GEL_ICONS[name];
});

// GEL Header gains a shadow once the screen is scrolled (matches GEL `scrolled`)
const topbar = $("#topbar");
const screenEl = $("#screen");
screenEl.addEventListener("scroll", () => {
  topbar.classList.toggle("scrolled", screenEl.scrollTop > 2);
});

// live status-bar clock
const now = new Date();
const timeEl = $("#status-time");
if (timeEl) timeEl.textContent = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");

render();
