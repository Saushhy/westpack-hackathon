"use strict";

/* A persona page sets data-persona on <body>. index.html is Mia, whose data is
   hand-authored in data/bills.json. The other pages load personas.js, generated
   from Carlos's mock data. */
const PERSONA = (document.body.dataset.persona || "").toLowerCase();
const PACK = (PERSONA && window.PERSONAS && window.PERSONAS[PERSONA]) || null;
const { bills, rewards } = PACK || window.DATA;
const TX = (PACK && PACK.transactions) || (window.DATA && window.DATA.transactions) || [];
const LS_KEY = "credit-dragon:state" + (PACK ? ":" + PERSONA : "");
const STATE_VERSION = 2;

const $ = (sel, root = document) => root.querySelector(sel);
const coin = () => '<span class="gel-coin"></span>';

const fmtAUD = (n) =>
  "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWhole = (n) => Number(n).toLocaleString("en-AU");
const fmtPct = (n) => Math.max(0, Math.min(100, n)).toFixed(0) + "%";
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
/* Local calendar day, not UTC: a Brisbane evening must not roll back a date. */
const localDay = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");

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

/* One disclosure, used wherever a card would otherwise carry a paragraph:
   goals, shop items, and the score factors. Native <details>. */
function disc(label, text, opts) {
  const cls = "gel-disc" + (opts && opts.lg ? " gel-disc--lg" : "");
  return `<details class="${cls}">
    <summary class="gel-disc-row">
      <span class="gel-disc-label">${label}</span>
      <span class="gel-disc-icon">${ico("add-circle")}</span>
    </summary>
    <div class="gel-disc-body"><p class="gel-disc-text">${text}</p></div>
  </details>`;
}

/* A disclosure whose body is markup, not one sentence. */
function discRaw(label, inner) {
  return `<details class="gel-disc">
    <summary class="gel-disc-row">
      <span class="gel-disc-label">${label}</span>
      <span class="gel-disc-icon">${ico("add-circle")}</span>
    </summary>
    <div class="gel-disc-body">${inner}</div>
  </details>`;
}

/* The demo runs on one fixed day so every recording behaves the same. */
const TODAY = bills.as_of;

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

/* Brands Mia already pays get their own logo on the tile. If the file is
   missing we fall back to the GEL icon rather than invent art. */
function brandFallback(img) {
  const name = img.getAttribute("data-icon") || "receipt";
  const tile = img.closest(".gel-adorn");
  if (!tile) return;
  tile.classList.remove("gel-adorn--brand");
  tile.innerHTML = ico(name);
}

function brandTile(logo, iconName) {
  if (!logo) return '<span class="gel-adorn">' + ico(iconName) + "</span>";
  return (
    '<span class="gel-adorn gel-adorn--brand">' +
    '<img class="gel-brand-img" src="' + logo + '" alt="" loading="lazy" ' +
    'data-icon="' + iconName + '" onerror="brandFallback(this)">' +
    "</span>"
  );
}

function adorn(bill) {
  return brandTile(bill.logo, BILL_ICON[bill.id] || "receipt");
}

/* The tag word doubles as the label in the sheet header, and matches the three
   counts in the summary exactly: affect your score / free up cash / avoid a fee. */
const FACTOR_LABEL = { cash: "Cash", fees: "Fee", credit: "Score", none: "" };
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
    checkins: (rewards.starting_state.checkins || []).slice(),
    protected: false, // protected balance set for the at-risk debit
    bills: {},
    goals: {},
    /* wardrobe: equipped[slot] = shop item id (hat / face / neck / home) */
    shop: { owned: [], equipped: { hat: null, face: null, neck: null, home: null }, feeds: 0, fed_at: null },
    awarded: [],
    ledger: []
  };
}

/* Old saves from a previous build may lack the wardrobe / check-in shape. */
function normalise(s) {
  const base = initialState();
  if (s.protected === undefined) s.protected = false;
  if (!Array.isArray(s.checkins)) s.checkins = base.checkins;
  if (!Array.isArray(s.awarded)) s.awarded = [];
  if (!Array.isArray(s.ledger)) s.ledger = [];
  s.bills = s.bills || {};
  s.goals = s.goals || {};
  s.shop = s.shop || {};
  s.shop.owned = s.shop.owned || [];
  s.shop.equipped = Object.assign({}, base.shop.equipped, s.shop.equipped || {});
  s.shop.feeds = s.shop.feeds || 0;
  s.shop.fed_at = s.shop.fed_at || null;
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
/* Insight, goal and sheet actions live next to their renderers below
   (openInsight / runInsight / syncGoals / openSheet / setProtected). */

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
  toast(item.emoji + " " + item.name + " on, see your dragon");
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
  toast(item.emoji + " " + item.name + " on, " + fmtWhole(item.cost) + " " + coin());
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
   SHEETS
   --------------------------------------------------------------------------
   One slide-up sheet (GEL BottomSheet) for every detail view: how we know
   this, what moves your score, the movements behind a BNPL plan. The screen
   stays short, the detail opens over it, and the action is in the sheet.
   ========================================================================== */

function sheetKeyHandler(e) {
  if (e.key === "Escape") closeSheet();
}

function openSheet(opts) {
  const root = $("#modal-root");
  if (!root) return;
  const head =
    opts.head || '<h2 class="gel-sheet-title" id="sheet-title">' + opts.title + "</h2>";
  root.innerHTML =
    '<div class="gel-sheet-overlay" onclick="if (event.target === this) closeSheet()">' +
    '<div class="gel-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
    '<button class="gel-sheet-close" type="button" aria-label="Close" onclick="closeSheet()">' +
    ico("close") +
    "</button>" +
    head +
    '<div class="gel-sheet-body">' +
    opts.body +
    "</div>" +
    (opts.actions ? '<div class="gel-sheet-actions">' + opts.actions + "</div>" : "") +
    "</div></div>";
  document.addEventListener("keydown", sheetKeyHandler);
}

function closeSheet() {
  const root = $("#modal-root");
  if (root) root.innerHTML = "";
  document.removeEventListener("keydown", sheetKeyHandler);
}

/* ==========================================================================
   INSIGHTS
   --------------------------------------------------------------------------
   Each card is a finding from Westpac's own transaction data, mapped to what
   actually moves an Australian credit score (repayment history, enquiries,
   limits, defaults). The card stays short. Tapping it opens the evidence and
   the one action.
   ========================================================================== */

const insightActionForType = {
  remind: "reminder_set",
  track: "insight_tracked",
  protect: "protected_balance"
};

const moneyUnit = (p) =>
  '<span class="gel-money-unit">/' + (p === "fortnightly" ? "fortnight" : "mo") + "</span>";

function billHead(bill, trailing) {
  return `
    <div class="gel-bill-head">
      ${adorn(bill)}
      <div class="gel-cell-body">
        <div class="gel-bill-title">${bill.label}</div>
        <div class="gel-muted">${bill.provider}</div>
      </div>
      <div class="gel-bill-amount">${trailing || ""}</div>
    </div>`;
}

function evidenceRows(bill) {
  const rows = (bill.evidence || []).slice(0, 2);
  if (!rows.length) return "";
  return (
    '<div class="gel-kvs">' +
    rows
      .map(
        (r) =>
          `<div class="gel-kv"><span class="gel-kv-k">${r.k}</span><span class="gel-kv-v">${r.v}</span></div>`
      )
      .join("") +
    "</div>"
  );
}

/* Neutral source link. The customer checks the source themselves. */
function sourceLink(bill) {
  let url = "";
  let label = "";
  if (bill.benchmark && bill.benchmark.source_url) {
    url = bill.benchmark.source_url;
    label = "Check the market · " + (bill.benchmark.source || "neutral source");
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
  const goalResults = syncGoals();
  save();
  render();

  const all = [res].concat(goalResults);
  const xp = all.reduce((a, r) => a + r.xp, 0);
  const coins = all.reduce((a, r) => a + r.coins, 0);
  if (xp || coins) toast("+" + xp + " XP · +" + coins + " " + coin());
  const evolved = all.find((r) => r.evolved);
  if (evolved) showEvolution(evolved.fromStage, evolved.toStage);
}

function dismissInsight(id) {
  state.bills[id] = { status: "dismissed", dismissed_at: new Date().toISOString() };
  save();
  render();
}

const ACTION_COPY = {
  remind: { label: "Set a reminder", icon: "notification" },
  protect: { label: "Protect balance", icon: "shield" },
  track: { label: "Track this", icon: "check" }
};

function doneCopy(bill) {
  if (bill.action_type === "remind") return "Reminder set. Your next repayment should land on time.";
  if (bill.action_type === "protect") return "Protected balance set for Thu 19 Nov.";
  if (bill.action_type === "track") return "We're watching this and will report back.";
  return "Noted.";
}

/* The sheet: what we saw, what to do about it, and where it came from.
   No lecture about credit scoring. The advice is the point. */
function openInsight(id) {
  const bill = bills.bills.find((b) => b.id === id);
  if (!bill) return;
  const copy = ACTION_COPY[bill.action_type] || ACTION_COPY.track;

  const head = `
    <div class="gel-sheet-head">
      ${adorn(bill)}
      <div class="gel-sheet-head-body">
        <h2 class="gel-sheet-title" id="sheet-title">${bill.label}</h2>
        <p class="gel-sheet-sub">${[bill.provider, FACTOR_LABEL[bill.factor]].filter(Boolean).join(" · ")}</p>
      </div>
    </div>`;

  /* What to do, then the proof on request. The finding, the evidence and the
     provenance all sit inside one disclosure instead of filling the sheet. */
  const proof = `
    ${bill.finding ? `<p class="gel-disc-text" style="margin-top:0">${bill.finding}</p>` : ""}
    ${bill.detail ? `<p class="gel-disc-text">${bill.detail}</p>` : ""}
    ${evidenceRows(bill)}
    <div class="gel-verified" style="margin-top:12px">
      ${ico("check")}
      ${
        bill.verification
          ? bill.verification.source + " · " + fmtDate(bill.verification.checked_at)
          : "From your transactions"
      }
    </div>`;

  const body = `
    ${
      bill.advice
        ? `<div class="gel-callout">
             ${ico(copy.icon)}
             <p class="gel-callout-text">${bill.advice}</p>
           </div>`
        : ""
    }
    ${discRaw("Dragon review", proof)}
    ${sourceLink(bill)}`;

  const actions = `
    <button class="gel-btn-primary gel-btn-block" type="button" onclick="actFromSheet('${bill.id}')">
      ${ico(copy.icon)} ${copy.label}
    </button>
    <button class="gel-btn-text" type="button" onclick="dismissFromSheet('${bill.id}')">Not now</button>`;

  openSheet({ title: bill.label, head, body, actions });
}

function actFromSheet(id) {
  closeSheet();
  runInsight(id);
}

function dismissFromSheet(id) {
  closeSheet();
  dismissInsight(id);
}

function insightCard(bill) {
  const st = state.bills[bill.id]?.status;

  if (st === "dismissed")
    return `<article class="gel-cell gel-bill is-muted" data-bill="${bill.id}">
      ${billHead(bill, `<span class="gel-badge gel-badge--faint">Dismissed</span>`)}
    </article>`;

  if (st === "done")
    return `<article class="gel-cell gel-bill is-done" data-bill="${bill.id}">
      ${billHead(bill, `<span class="gel-badge gel-badge--success">Done</span>`)}
      <div class="gel-hr"></div>
      <p class="gel-note gel-note--good">${doneCopy(bill)}</p>
    </article>`;

  const amount = bill.current_amount
    ? `<span class="gel-money gel-money--sm">${fmtAUD(bill.current_amount)}</span>${moneyUnit(bill.billing_period)}`
    : "";

  /* The fuller card: logo, what it is, who provides it, the one line that
     explains it, and the tag that ties it to the summary counts. */
  return `
    <article class="gel-cell gel-bill gel-bill--tap" data-bill="${bill.id}"
             role="button" tabindex="0" aria-label="${bill.label}. ${bill.finding || ""} Review."
             onclick="openInsight('${bill.id}')"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openInsight('${
               bill.id
             }')}">
      ${billHead(bill, amount)}
      <div class="gel-tagline">
        ${factorChip(bill.factor)}
        <span class="gel-muted gel-tagline-text">${bill.finding || ""}</span>
        ${ico("arrow-right")}
      </div>
    </article>`;
}

function insightsSummary() {
  const credit = bills.bills.filter((b) => b.factor === "credit" && isActionable(b)).length;
  const cash = bills.bills.filter((b) => b.factor === "cash" && isActionable(b)).length;
  const fees = bills.bills.filter((b) => b.factor === "fees" && isActionable(b)).length;
  const cashFree = bills.bills.reduce(
    (a, b) => (b.factor === "cash" && b.savings_status === "potential" ? a + b.savings_monthly : a),
    0
  );
  const feesAvoided = (bills.totals && bills.totals.fees_avoided) || 0;

  return `
    <section class="gel-found">
      <div class="gel-found-top">
        <span class="gel-found-eyebrow">What we found</span>
        <span class="gel-badge gel-badge--faint">Last 3 months</span>
      </div>
      <div class="gel-found-stats">
        <div class="gel-found-stat">
          <span class="gel-found-num gel-found-num--credit">${credit}</span>
          <span class="gel-found-label">affect your score</span>
        </div>
        <div class="gel-found-stat">
          <span class="gel-found-num gel-found-num--cash">${cash}</span>
          <span class="gel-found-label">free up cash</span>
        </div>
        <div class="gel-found-stat">
          <span class="gel-found-num gel-found-num--fees">${fees}</span>
          <span class="gel-found-label">avoid a fee</span>
        </div>
      </div>
      <div class="gel-found-money">
        <div class="gel-money-tile gel-money-tile--good">
          <span class="gel-money-tile-label">Cash you could free</span>
          <span class="gel-money-tile-value">${fmtAUD(cashFree)}</span>
          <span class="gel-money-tile-unit">a month</span>
        </div>
        <div class="gel-money-tile">
          <span class="gel-money-tile-label">Fees you could avoid</span>
          <span class="gel-money-tile-value">${fmtAUD(feesAvoided)}</span>
          <span class="gel-money-tile-unit">a month</span>
        </div>
      </div>
    </section>`;
}

/* Cards that need nothing from you are one row each inside a single card,
   rather than two full cards that say almost nothing. */
function statusGroup(list) {
  if (!list.length) return "";
  const rows = list
    .map(
      (b) => `
      <div class="gel-status-row" data-bill="${b.id}">
        <span class="gel-status-name">${b.label}</span>
        <span class="gel-muted">${b.action_type === "keep" ? "Keeping" : "No change"}</span>
        <span class="gel-money gel-money--sm gel-money--muted">${fmtAUD(b.current_amount)}</span>
      </div>`
    )
    .join("");
  return `
    <article class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Nothing to change</span>
        <span class="gel-badge gel-badge--faint">${list.length}</span>
      </div>
      <div style="margin-top:4px">${rows}</div>
    </article>`;
}

function renderInsights() {
  const order = { remind: 0, protect: 1, track: 2, keep: 3, no_offer: 4 };
  const sorted = bills.bills.slice().sort((a, b) => order[a.action_type] - order[b.action_type]);
  const actionable = sorted.filter((b) => isActionable(b));
  const quiet = sorted.filter((b) => !isActionable(b));

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Insights</h1>
      </div>
    </div>
    ${insightsSummary()}
    ${actionable.map(insightCard).join("")}
    ${statusGroup(quiet)}`;
}

/* ==========================================================================
   MOVEMENTS
   --------------------------------------------------------------------------
   The rows behind a provider come straight from Carlos's transaction file, so
   "Afterpay costs you $X" is always checkable against real payments.
   ========================================================================== */

const monthLabel = (ym) =>
  new Date(ym + "-01T00:00:00").toLocaleDateString("en-AU", { month: "short", year: "numeric" });

function movementsFor(match) {
  const re = new RegExp(match, "i");
  return TX.filter((t) => re.test(t.merchant || "") || re.test(t.description || "")).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
}

function openMovements(name, match) {
  const rows = movementsFor(match);
  if (!rows.length) return;

  const total = rows.reduce((a, t) => (t.type === "debit" ? a + t.amount : a), 0);

  const groups = {};
  for (const t of rows) {
    const ym = t.date.slice(0, 7);
    (groups[ym] = groups[ym] || []).push(t);
  }

  const body =
    `<div class="gel-kv">
      <span class="gel-kv-k">${rows.length} payments</span>
      <span class="gel-kv-v gel-money">${fmtAUD(total)}</span>
    </div>` +
    Object.keys(groups)
      .sort()
      .reverse()
      .map((ym) => {
        const list = groups[ym];
        const sub = list.reduce((a, t) => a + t.amount, 0);
        return `<div class="gel-move-month">
          <div class="gel-row-between">
            <span class="gel-label">${monthLabel(ym)}</span>
            <span class="gel-muted">${fmtAUD(sub)}</span>
          </div>
          ${list
            .map(
              (t) => `<div class="gel-move">
                <span class="gel-move-day">${t.date.slice(8)}</span>
                <span class="gel-cell-body">
                  <span class="gel-move-desc">${t.description}</span>
                  <span class="gel-muted">${t.merchant}</span>
                </span>
                <span class="gel-money gel-money--sm">${fmtAUD(t.amount)}</span>
              </div>`
            )
            .join("")}
        </div>`;
      })
      .join("");

  openSheet({
    title: name,
    body,
    actions: '<button class="gel-btn-ghost" type="button" onclick="closeSheet()">Close</button>'
  });
}

/* ==========================================================================
   GOALS
   --------------------------------------------------------------------------
   Goals fill themselves. There is no "mark as done" button: each one reads a
   real signal (your check-ins, your instalments, your new facilities) and
   completes when the data says it happened.
   ========================================================================== */

function checkinsInWindow() {
  const window7 = [];
  const base = new Date(TODAY + "T00:00:00").getTime();
  for (let i = 0; i < 7; i++) {
    window7.push(localDay(new Date(base - i * 86400000)));
  }
  return (state.checkins || []).filter((d) => window7.includes(d)).length;
}

function bnplPaidOnTime() {
  return (bills.credit_file?.bnpl?.providers || []).reduce((a, p) => a + (p.paid_on_time || 0), 0);
}

function daysSinceNewFacility() {
  const last = bills.credit_file?.bnpl?.last_facility_date;
  if (!last) return 0;
  const ms = new Date(TODAY + "T00:00:00") - new Date(last + "T00:00:00");
  return Math.max(0, Math.round(ms / 86400000));
}

/* Persona goals read flags from that person's own transactions, so the same
   three goals work for a student with BNPL and a business owner with an ATO
   bill. */
function onTimeRepayments() {
  const repay = TX.filter((t) => (t.flags || []).includes("credit_repayment"));
  return repay.filter((t) => !(t.flags || []).includes("late_payment")).length;
}

function daysSinceLastEnquiry() {
  const rows = TX.filter((t) => (t.flags || []).some((f) => /enquiry/i.test(f)));
  if (!rows.length) return 999; // no applications at all: nothing to wait out
  const last = rows.map((t) => t.date).sort().pop();
  return Math.max(
    0,
    Math.round((new Date(TODAY + "T00:00:00") - new Date(last + "T00:00:00")) / 86400000)
  );
}

function goalValue(g) {
  if (g.source === "checkin") return checkinsInWindow();
  if (g.source === "bnpl_on_time") return bnplPaidOnTime();
  if (g.source === "no_new_bnpl") return daysSinceNewFacility();
  if (g.source === "on_time") return onTimeRepayments();
  if (g.source === "no_new_credit") return daysSinceLastEnquiry();
  return 0;
}

const goalPct = (g) => Math.min(100, (goalValue(g) / g.target) * 100);
const goalDone = (g) => state.goals[g.id]?.status === "completed";

/* Called after any award and once at boot: a goal completes itself, and the
   XP follows it. Returns the award results so the caller can celebrate. */
function syncGoals() {
  const results = [];
  for (const g of rewards.goals) {
    if (goalDone(g)) continue;
    if (goalValue(g) >= g.target) {
      state.goals[g.id] = { status: "completed", completed_at: new Date().toISOString() };
      const r = award("goal_completed", g.id, g.title);
      if (r) results.push(r);
    }
  }
  return results;
}

/* Where a goal stands, in one word. Nothing is invented: it is the same value
   the bar is drawn from. */
function goalStatus(g) {
  if (goalDone(g)) return "Completed";
  return goalValue(g) > 0 ? "In progress" : "Not started";
}

/* Each goal gets the icon for what it actually watches, so three panels do not
   read as three copies of the same card. */
/* What is left to do first, and within that the goal closest to done, because
   the next win is the one worth surfacing. Completed goals sink to the bottom. */
function orderedGoals() {
  return rewards.goals.slice().sort((a, b) => {
    const da = goalDone(a) ? 1 : 0;
    const db = goalDone(b) ? 1 : 0;
    if (da !== db) return da - db;
    return goalPct(b) - goalPct(a);
  });
}

function completedOn(g) {
  const at = state.goals[g.id]?.completed_at;
  if (!at) return "Done";
  return "Done " + dayMonth(at.slice(0, 10));
}

/* The goal, as the same kind of panel the score uses: the state and the reward
   live in the navy head, the number and the bar in the body, and the reasoning
   waits behind Review. */
function renderGoals() {
  const cards = orderedGoals()
    .map((g) => {
      const complete = goalDone(g);
      const value = Math.min(goalValue(g), g.target);
      const when = complete
        ? `<span class="gel-when is-done">${ico("check")}${completedOn(g)}</span>`
        : `<span class="gel-when">${ico("notification")}Next check ${g.next_check}</span>`;
      return `
        <article class="gel-panel gel-goal" data-goal="${g.id}">
          <div class="gel-panel-head">
            <span class="gel-band ${complete ? "is-done" : ""}">${goalStatus(g)}</span>
            <span class="gel-goal-xp">+${g.xp} XP</span>
          </div>
          <div class="gel-panel-body">
            <div class="gel-goal-title">${g.title}</div>
            <div class="gel-goal-meta">
              <span class="gel-goal-count"><b>${value}</b><span>/ ${g.target} ${g.unit}</span></span>
              ${when}
            </div>
            <div class="gel-bar gel-bar--skinny" style="margin-top:6px">
              <div class="gel-bar-fill ${complete ? "is-done" : ""}" style="width:${fmtPct(goalPct(g))}"></div>
            </div>
            <button class="gel-row-link" type="button" onclick="openGoal('${g.id}')">
              <span>Review</span>${ico("arrow-right")}
            </button>
          </div>
        </article>`;
    })
    .join("");

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Your goals</h1>
      </div>
    </div>
    ${cards}`;
}

/* What the goal watches, when it is checked, and what it pays. */
function openGoal(id) {
  const g = rewards.goals.find((x) => x.id === id);
  if (!g) return;
  const complete = goalDone(g);

  const head = `
    <div class="gel-sheet-head gel-sheet-head--goal">
      <span class="gel-adorn">${ico("target")}</span>
      <div class="gel-sheet-head-body">
        <h2 class="gel-sheet-title" id="sheet-title">${g.title}</h2>
      </div>
    </div>`;

  /* Three questions, three answers. The state and the count are already on the
     card behind this sheet, so they are not repeated here. */
  const reward = `<span class="gel-reward">
      <span class="gel-reward-part">${ico("paw")}+${g.xp} XP</span>
      <span class="gel-reward-part">${coin()}+${g.coins}</span>
    </span>`;

  const rows = [
    ["Watching", g.watching || "Your transactions"],
    ["Next check", complete ? "Done" : g.next_check],
    ["Reward", reward]
  ]
    .map(([k, v]) => `<div class="gel-kv"><span class="gel-kv-k">${k}</span><span class="gel-kv-v">${v}</span></div>`)
    .join("");

  /* No essay here. The fields answer the three questions a customer actually
     has: what is being watched, when it is checked, and what it pays. */
  const body = `
    <div class="gel-evidence-card">
      <span class="gel-evidence-eyebrow">Details</span>
      ${rows}
    </div>`;

  openSheet({
    title: g.title,
    head,
    body,
    actions: '<button class="gel-btn-ghost" type="button" onclick="closeSheet()">Close</button>'
  });
}

/* ==========================================================================
   SCORE
   --------------------------------------------------------------------------
   Four things and one sheet: the score, the goal, the credit you can't see,
   and what moves the score. No bucket strip, no bank products, no forecast
   history. The detail lives in a sheet so the screen stays calm.
   ========================================================================== */

/* ---------- credit accounts ----------
   Cards, BNPL and loans, straight from the transaction file. The logo is the
   institution's own mark; without one the tile falls back to a GEL icon. */
const fmtMoneyShort = (n) =>
  n >= 1000 ? "$" + Math.round(n).toLocaleString("en-AU") : fmtAUD(n);

function accountRow(a) {
  const late = a.status === "late";
  const icon = a.kind === "card" ? "card" : a.kind === "bnpl" ? "shopping-bag" : "house";
  return `
    <button class="gel-acc" type="button" onclick="openMovements('${a.name}', '${a.match}')">
      ${
        a.logo
          ? `<span class="gel-adorn gel-adorn--brand">
               <img class="gel-brand-img" src="${a.logo}" alt="" loading="lazy"
                    data-icon="${icon}" onerror="brandFallback(this)">
             </span>`
          : `<span class="gel-adorn">${ico(icon)}</span>`
      }
      <span class="gel-cell-body">
        <span class="gel-acc-name">${a.name}</span>
        <span class="gel-acc-kind">${a.kind_label} · ${a.note}</span>
      </span>
      <span class="gel-acc-end">
        <span class="gel-acc-amount">${fmtMoneyShort(a.monthly)}<span class="gel-acc-unit">/mo</span></span>
        <span class="gel-acc-status ${late ? "is-late" : "is-ok"}">${late ? "Late" : "On time"}</span>
      </span>
    </button>`;
}

function creditAccounts(cf) {
  const accounts = cf.accounts || [];
  if (!accounts.length) {
    return `
      <section class="gel-cell">
        <div class="gel-row-between">
          <span class="gel-label">Credit accounts</span>
          <span class="gel-badge gel-badge--faint">None</span>
        </div>
        <div class="gel-acc-empty">
          ${ico("card")}
          <p class="gel-acc-empty-text">Nothing to repay yet. That is why your file is thin, and why the first small limit matters.</p>
        </div>
      </section>`;
  }
  return `
    <section class="gel-cell">
      <div class="gel-row-between">
        <span class="gel-label">Credit accounts</span>
        <span class="gel-badge gel-badge--faint">${accounts.length} open</span>
      </div>
      <div style="margin-top:6px">${accounts
        .slice()
        .sort((a, b) => b.monthly - a.monthly)
        .map(accountRow)
        .join("")}</div>
    </section>`;
}

/* Five titles at a glance, each one expanding in place to explain itself. */
function openFactors() {
  const factors = rewards.credit_factors || [];
  const body =
    '<div class="gel-discs">' +
    factors.map((f) => disc(f.label, f.what, { lg: true })).join("") +
    "</div>";

  openSheet({
    title: "How your score is built",
    body,
    actions: '<button class="gel-btn-ghost" type="button" onclick="closeSheet()">Close</button>'
  });
}

function renderScore() {
  const score = bills.score || {};
  const cf = bills.credit_file || {};
  const forecast = score.forecast || {};

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">${bills.persona ? "Your score, " + bills.persona : "Your score"}</h1>
      </div>
      <span class="gel-badge gel-badge--hero">${score.source || "Equifax"}</span>
    </div>

    <section class="gel-panel gel-score-hero">
      <div class="gel-panel-head">
        <span class="gel-panel-title">Credit score</span>
        ${score.band ? `<span class="gel-band">${score.band}</span>` : ""}
      </div>
      <div class="gel-panel-body">
        <div class="gel-score-num">${score.value != null ? fmtWhole(score.value) : ""}<span class="gel-score-max">/${score.max != null ? fmtWhole(score.max) : ""}</span></div>
        <p class="gel-muted" style="margin:4px 0 0">Updated ${score.refreshed_at ? fmtDate(score.refreshed_at) : ""}</p>
        <div class="gel-hr"></div>
        <div class="gel-forecast">
          <div class="gel-row-between">
            <span class="gel-label">In ${forecast.horizon_months || 3} months</span>
            <span class="gel-money gel-money--good">${forecast.range ? fmtWhole(forecast.range[0]) + " to " + fmtWhole(forecast.range[1]) : ""}</span>
          </div>
          <p class="gel-note" style="margin:6px 0 0">If ${forecast.assumption || "you keep repayments on time."}</p>
        </div>
      </div>
    </section>

    <article class="gel-cell" data-goal-banner>
      <span class="gel-label">Your goal</span>
      <div class="gel-goal-title">${cf.goal || ""}</div>
      <div class="gel-row-between" style="margin-top:8px">
        <span class="gel-muted">${cf.goal_date ? fmtDate(cf.goal_date) : ""}</span>
        <span class="gel-badge gel-badge--success">${cf.goal_note || "On track"}</span>
      </div>
    </article>

    ${creditAccounts(cf)}

    <button class="gel-row-card" type="button" onclick="openFactors()">
      <span>How your score is built</span>${ico("arrow-right")}
    </button>`;
}

function setProtected() {
  if (state.protected) return;
  state.protected = true;
  const gym = bills.bills.find((b) => b.id === "bill_gym");
  if (gym && state.bills[gym.id]?.status !== "done") {
    state.bills[gym.id] = { status: "done", acted_at: new Date().toISOString() };
    award("protected_balance", gym.id, gym.label);
  }
  syncGoals();
  save();
  render();
  toast(ico("shield") + " Protected balance set for Thu 19 Nov");
}

/* ---------- boot ----------
   The demo runs on a fixed clock (bills.as_of) so it behaves the same in every
   recording. Opening the app records today's check-in, which is what fills the
   daily goal. */
function boot() {
  state.checkins = state.checkins || [];
  if (!state.checkins.includes(TODAY)) {
    state.checkins.push(TODAY);
    award("daily_checkin", TODAY, "Daily check-in");
  }
  if (checkinsInWindow() >= 7) {
    const windowStart = localDay(new Date(new Date(TODAY + "T00:00:00").getTime() - 6 * 86400000));
    award("checkin_week", windowStart, "Seven days in a row");
  }
  syncGoals();
  save();
  render();
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
/* Anchors are measured from the rendered PNG silhouettes (see
   tools/render-dragon.mjs), so the hat lands on the head of the real model
   rather than floating over the old emoji. The adult values are the emoji
   defaults until its model is rendered. */
const WEAR_ANCHOR = {
  egg: { hat: 2, face: 34, neck: 60 },
  baby: { hat: 5, face: 18, neck: 38 },
  adult: { hat: 2, face: 36, neck: 60 }
};

function wearGlyph(emoji, slot, top) {
  return `<span class="dragon-wear dragon-wear--${slot}" style="top:${top}%">${emoji}</span>`;
}

/* The dragon itself (real model render, or emoji) with whatever it's wearing. */
function dragonMarkup(stage, equipped) {
  const eq = equipped || state.shop.equipped;
  const hat = itemById(eq.hat);
  const face = itemById(eq.face);
  const neck = itemById(eq.neck);
  const anchor = WEAR_ANCHOR[stage.id] || WEAR_ANCHOR.baby;
  const art = stage.id === "egg" ? "" : " gel-dragon-wrap--art";
  return `
    <div class="gel-dragon-wrap${art}" id="dragon-art">
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

/* Personality only. Every factual line is composed in dragonSaid() below, from
   bills.json and the customer's own state, so the dragon cannot invent a number. */
const DRAGON_LINES = [
  "Rawr. Every repayment on time makes me a little bigger.",
  "I only grow from good money habits, never from shopping.",
  "Bills first, snacks later. That's the rule.",
  "A dishonour fee is the only thing that makes me grumpy."
];

const dayMonth = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });

/**
 * What the dragon can say right now. Fixed composition, no model call:
 * each line quotes a figure that exists in bills.json or in the saved state,
 * which is the compliance rule for this build. Tap cycles through them.
 */
function dragonSaid() {
  const out = [];
  const cf = bills.credit_file || {};
  const providers = (cf.bnpl && cf.bnpl.providers) || [];
  const next = providers
    .filter((p) => p.next_due)
    .sort((a, b) => (a.next_due < b.next_due ? -1 : 1))[0];
  const payday = bills.payday && bills.payday.next;

  if (next) {
    const before = payday && next.next_due < payday;
    out.push(
      next.name + " takes " + fmtAUD(next.amount_due) + " on " + dayMonth(next.next_due) + "." +
        (payday ? (before ? " Keep cash aside for it." : " Payday lands first.") : "")
    );
  }

  const late = bills.bills.find((b) => b.id === "bill_card");
  if (late && state.bills[late.id]?.status !== "done") {
    out.push("Your card payment was 3 days late in October.");
  }

  const gym = bills.bills.find((b) => b.id === "bill_gym");
  if (gym && state.bills[gym.id]?.status !== "done") {
    out.push("The gym takes $34 on Thursday. Payday is Friday.");
  }

  for (const g of rewards.goals) {
    if (goalDone(g)) continue;
    const v = goalValue(g);
    if (g.source === "bnpl_on_time") {
      out.push(v + " of " + g.target + " instalments paid on time.");
    } else if (g.source === "no_new_bnpl") {
      out.push(v + " days with no new plan. " + (g.target - v) + " more fills this one.");
    } else if (g.source === "checkin") {
      out.push(checkinsInWindow() + " of " + g.target + " days checked. That bar is full.");
    }
  }

  const filled = rewards.goals.filter(goalDone).length;
  if (filled) {
    out.push(filled + " goal filled itself, straight from your transactions.");
  }

  return out.concat(DRAGON_LINES);
}

let lineIdx = -1; // first tap reads the top line
function pokeDragon() {
  const bubble = $("#dragon-bubble");
  if (bubble) {
    const lines = dragonSaid();
    lineIdx = (lineIdx + 1) % lines.length;
    bubble.textContent = lines[lineIdx];
    bubble.classList.add("show");
    clearTimeout(pokeDragon.timer);
    pokeDragon.timer = setTimeout(() => bubble.classList.remove("show"), 4200);
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
    : `<span class="gel-muted">Nothing on yet. Visit the shop to dress your dragon.</span>`;

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

    ${
      stage.id === "egg"
        ? `<p class="gel-note" style="margin:0 0 12px">Your dragon hatches at ${fmtWhole(
            nextStage(state.xp_total)?.xp_required ?? 800
          )} XP. Act on an insight to get there.</p>`
        : `<button class="gel-btn-primary gel-btn-block" type="button" onclick="openAR()" style="margin-bottom:12px">
             ${ico("camera")} See it in your room
           </button>`
    }

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
              onclick="takeOff('${item.id}')">Wearing, take off</button>`;
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
          ${disc("What it is", item.description)}
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
   AR VIEW
   --------------------------------------------------------------------------
   The camera frame is the room, the dragon sits on it, and the only thing it
   ever says is a line composed from our own data (dragonSaid). No generation,
   no open chat: compliance decision for this build.

   The camera needs a secure context, so from file:// the browser will refuse
   getUserMedia and we fall back to a drawn tabletop. `npm start` serves it on
   localhost, where the real camera works. Everything else is identical.
   ========================================================================== */

let arStream = null;
const arPos = { x: 50, y: 58, scale: 1, drag: null };

function arStageMarkup() {
  const stage = stageForXp(state.xp_total);
  return `
    <video class="gel-ar-video" id="ar-video" playsinline muted autoplay></video>
    <div class="gel-ar-room" aria-hidden="true">
      <div class="gel-ar-room-wall"></div>
      <div class="gel-ar-room-table"></div>
    </div>
    <div class="gel-ar-hud">
      <button class="gel-ar-close" type="button" onclick="closeAR()" aria-label="Close">
        ${ico("close")}
      </button>
      <span class="gel-ar-tag" id="ar-tag">Camera off, demo tabletop</span>
    </div>
    <div class="gel-ar-stage" id="ar-stage">
      <div class="gel-ar-hold" id="ar-hold">
        <div class="gel-ar-dragon" id="ar-dragon" role="button" tabindex="0"
             aria-label="Your ${stage.name}. Tap to hear it.">
          ${imgOrEmoji(stage.image, stage.emoji, stage.name, "ar-img")}
        </div>
      </div>
      <div class="gel-ar-bubble" id="ar-bubble"></div>
    </div>
    <div class="gel-ar-controls">
      <button class="gel-btn-ghost gel-btn-sm" type="button" onclick="arSay()">Say something</button>
      <button class="gel-btn-ghost gel-btn-sm" type="button" onclick="arZoom(-1)">Smaller</button>
      <button class="gel-btn-ghost gel-btn-sm" type="button" onclick="arZoom(1)">Bigger</button>
      <button class="gel-btn-primary gel-btn-sm" type="button" onclick="closeAR()">Done</button>
    </div>`;
}

function arApply() {
  const hold = $("#ar-hold");
  if (!hold) return;
  hold.style.left = arPos.x + "%";
  hold.style.top = arPos.y + "%";
  hold.style.width = Math.round(210 * arPos.scale) + "px";
}

function openAR() {
  const root = $("#ar-root");
  if (!root) return;
  root.hidden = false;
  root.innerHTML = arStageMarkup();
  arPos.x = 50;
  arPos.y = 58;
  arPos.scale = 1;
  arApply();
  arWireDrag();
  arStartCamera();
  arDrop();
  setTimeout(arSay, 900);
}

function closeAR() {
  arStopCamera();
  const root = $("#ar-root");
  if (!root) return;
  root.hidden = true;
  root.innerHTML = "";
}

async function arStartCamera() {
  const video = $("#ar-video");
  const tag = $("#ar-tag");
  if (!video) return;
  const media = navigator.mediaDevices;
  if (!media || !media.getUserMedia) {
    if (tag) tag.textContent = "Camera off, demo tabletop";
    return;
  }
  try {
    arStream = await media.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = arStream;
    await video.play().catch(() => {});
    video.classList.add("is-live");
    if (tag) tag.textContent = "Live camera";
  } catch {
    if (tag) tag.textContent = "Camera off, demo tabletop";
  }
}

function arStopCamera() {
  if (arStream) {
    for (const track of arStream.getTracks()) track.stop();
    arStream = null;
  }
}

/* Dropping it out of the air is what sells the placement. */
function arDrop() {
  const hold = $("#ar-hold");
  if (!hold) return;
  hold.classList.remove("is-dropping");
  void hold.offsetWidth;
  hold.classList.add("is-dropping");
}

function arSay() {
  const bubble = $("#ar-bubble");
  if (!bubble) return;
  const lines = dragonSaid();
  arPos.line = ((arPos.line ?? -1) + 1) % lines.length;
  bubble.textContent = lines[arPos.line];
  bubble.classList.add("show");
  clearTimeout(arSay.timer);
  arSay.timer = setTimeout(() => bubble.classList.remove("show"), 5200);
}

function arZoom(dir) {
  arPos.scale = Math.min(1.9, Math.max(0.55, arPos.scale + dir * 0.15));
  arApply();
}

/* Drag it anywhere on the table. Pointer events cover mouse and touch. */
function arWireDrag() {
  const hold = $("#ar-hold");
  const stage = $("#ar-stage");
  if (!hold || !stage) return;

  const toPct = (e) => {
    const r = stage.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100
    };
  };

  hold.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    hold.setPointerCapture(e.pointerId);
    arPos.drag = { dx: arPos.x - toPct(e).x, dy: arPos.y - toPct(e).y, moved: false };
    hold.classList.add("is-held");
  });

  hold.addEventListener("pointermove", (e) => {
    if (!arPos.drag) return;
    const p = toPct(e);
    arPos.x = Math.min(92, Math.max(8, p.x + arPos.drag.dx));
    arPos.y = Math.min(88, Math.max(24, p.y + arPos.drag.dy));
    arPos.drag.moved = true;
    arApply();
  });

  const end = () => {
    if (!arPos.drag) return;
    const moved = arPos.drag.moved;
    arPos.drag = null;
    hold.classList.remove("is-held");
    if (!moved) arSay();
  };
  hold.addEventListener("pointerup", end);
  hold.addEventListener("pointercancel", end);

  hold.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      arSay();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#ar-root")?.hidden) closeAR();
});

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

boot();
