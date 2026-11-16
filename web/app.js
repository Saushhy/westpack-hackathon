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
  bill_phone: "phone",
  bill_internet: "desktop",
  bill_netflix: "video",
  bill_stan: "video",
  bill_disney: "video",
  bill_spotify: "headset",
  bill_gym: "barbell",
  bill_rent: "house"
};

/* GEL FlexiCell adornment: circular icon tile */
function adorn(bill) {
  const name = BILL_ICON[bill.id] || "receipt";
  return '<span class="gel-adorn">' + ico(name) + "</span>";
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
const billActionForType = { switch: "bill_switch", cancel: "bill_cancel", reschedule: "bill_reschedule" };

function markBillApproved(id) {
  const bill = bills.bills.find((b) => b.id === id);
  if (!bill || state.bills[id]?.status === "approved") return null;
  state.bills[id] = { status: "approved", approved_at: new Date().toISOString() };
  const actionId = billActionForType[bill.action_type];
  return actionId ? award(actionId, id, bill.label + " approved") : null;
}

/* One celebration for one or many approvals, so a grouped change shows a single toast. */
function celebrate(results) {
  const list = results.filter(Boolean);
  if (!list.length) return;
  const xp = list.reduce((a, r) => a + r.xp, 0);
  const c = list.reduce((a, r) => a + r.coins, 0);
  const evolved = list.find((r) => r.evolved);
  if (xp || c) toast("+" + xp + " XP · +" + c + " " + coin());
  if (evolved) showEvolution(evolved.fromStage, evolved.toStage);
}

function approveBill(id) {
  const res = markBillApproved(id);
  if (!res) return;
  save();
  render();
  celebrate([res]);
}

function approveBills(ids) {
  const results = ids.map(markBillApproved);
  if (!results.some(Boolean)) return;
  save();
  render();
  celebrate(results);
}

/* The customer picks which streaming service to keep — the AI only recommends. */
function chooseKeeper(recId, billId) {
  state.choices[recId] = billId;
  save();
  render();
}

function declineBill(id) {
  state.bills[id] = { status: "declined", declined_at: new Date().toISOString() };
  save();
  render();
}

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
    '<svg class="gel-evo-dragon" viewBox="0 0 240 240" aria-hidden="true">' +
    dragonSvg(to) +
    "</svg>" +
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

/* ---------- review sheet (GEL BottomSheet) ----------
   Nothing is approved until the customer has seen the overview of the change and
   can open the provider's own page to check the plan and price. */
function reviewRows(bill) {
  const rows = [];
  const per = (p) => (p === "fortnightly" ? "fortnight" : "mo");
  const cur = fmtAUD(bill.current_amount) + "/" + per(bill.billing_period);

  if (bill.action_type === "switch") {
    const o = bill.offer;
    rows.push(["Current plan", bill.provider + " · " + cur]);
    rows.push(["New plan", o.provider + " · " + fmtAUD(o.amount) + "/" + per(o.billing_period)]);
    rows.push([
      "You save",
      fmtAUD(bill.savings_monthly) + "/mo (" + fmtAUD(bill.savings_annual) + " a year)",
      "success"
    ]);
    if (o.includes) rows.push(["Includes", o.includes]);
    if (o.commitment) rows.push(["Commitment", o.commitment]);
    if (o.starts) rows.push(["Starts", o.starts]);
  } else if (bill.action_type === "cancel") {
    const c = bill.cancellation || {};
    rows.push(["Current plan", bill.provider + " · " + cur]);
    rows.push(["After cancelling", "Nothing · $0.00/mo"]);
    rows.push([
      "You save",
      fmtAUD(bill.savings_monthly) + "/mo (" + fmtAUD(bill.savings_annual) + " a year)",
      "success"
    ]);
    if (c.ends) rows.push(["Access ends", c.ends]);
    if (c.commitment) rows.push(["Commitment", c.commitment]);
  } else if (bill.action_type === "reschedule") {
    const o = bill.offer || {};
    rows.push(["Current debit", "Every 2nd Thursday · " + cur]);
    rows.push(["New debit", "Every 2nd Friday · " + cur]);
    if (o.fee_avoided) rows.push(["Avoids", fmtAUD(o.fee_avoided) + " dishonour fee", "success"]);
    if (o.starts) rows.push(["Effective", o.starts]);
    if (o.commitment) rows.push(["Membership", o.commitment]);
  }

  return rows
    .map(
      (r) =>
        '<div class="gel-kv">' +
        '<span class="gel-kv-k">' + r[0] + "</span>" +
        '<span class="gel-kv-v"' + (r[2] === "success" ? ' style="color:var(--text-success)"' : "") +
        ">" + r[1] + "</span></div>"
    )
    .join("");
}

function billHeadline(bill) {
  const o = bill.offer || {};
  const per = (p) => (p === "fortnightly" ? "fortnight" : "mo");
  if (bill.action_type === "switch") {
    return {
      name: o.plan,
      sub: o.provider + " · " + fmtAUD(o.amount) + "/" + per(o.billing_period),
      badge: "Save " + fmtAUD(bill.savings_monthly) + "/mo"
    };
  }
  if (bill.action_type === "cancel") {
    return {
      name: "Cancel " + bill.provider,
      sub: bill.provider + " · " + fmtAUD(bill.current_amount) + "/mo",
      badge: "Save " + fmtAUD(bill.savings_monthly) + "/mo"
    };
  }
  return {
    name: "Move the debit day",
    sub: bill.provider + " · " + fmtAUD(bill.current_amount) + "/" + per(bill.billing_period) + ", unchanged",
    badge: "Avoids " + fmtAUD(o.fee_avoided || 19)
  };
}

function billUrl(bill) {
  const o = bill.offer || {};
  const c = bill.cancellation || {};
  if (bill.action_type === "switch") return o.url || bill.provider_url;
  if (bill.action_type === "cancel") return c.url || bill.provider_url;
  return o.url || bill.provider_url;
}

function billUrlLabel(bill) {
  const o = bill.offer || {};
  const c = bill.cancellation || {};
  if (bill.action_type === "cancel") return c.url_label || "View " + bill.provider + " plans";
  return "View " + (bill.action_type === "switch" ? o.provider : bill.provider) + " plans";
}

/* showReview accepts one bill id or a list, so a grouped change (keep one
   streaming service, pause the other two) is reviewed as one decision. */
/* showReview accepts one bill id or a list, so a grouped change (keep one
   streaming service, pause the other two) is reviewed as a single decision.
   Nothing is approved until the customer has seen the overview of the change
   and can open the provider's own page to check the plan and price. */
function showReview(ids) {
  const list = (Array.isArray(ids) ? ids : [ids])
    .map((id) => bills.bills.find((b) => b.id === id))
    .filter(Boolean);
  if (!list.length) return;

  const many = list.length > 1;
  const first = list[0];
  const h = billHeadline(first);
  const savings = list.reduce((a, b) => a + b.savings_monthly, 0);
  const verified = list.find((b) => b.verification);
  const verifiedLine = verified
    ? "Checked " + fmtDate(verified.verification.checked_at) + " · " + verified.verification.source
    : "";

  const linkFor = (b) => {
    const url = billUrl(b);
    return url
      ? '<div style="margin-top:6px"><a class="gel-link gel-link-sm" href="' + url +
        '" target="_blank" rel="noopener noreferrer">' + billUrlLabel(b) + ico("arrow-right") + "</a></div>"
      : "";
  };

  const headHtml = many
    ? '<div class="gel-review-head">' +
      '<div class="gel-cell-body">' +
      '<div class="gel-h2">' + list.length + " services to pause</div>" +
      '<div class="gel-muted">' + list.map((b) => b.provider).join(" · ") + "</div>" +
      "</div>" +
      '<span class="gel-badge gel-badge--success">Save ' + fmtAUD(savings) + "/mo</span>" +
      "</div>"
    : '<div class="gel-cell-row">' +
      adorn(first) +
      '<div class="gel-cell-body">' +
      '<div class="gel-h2">' + h.name + "</div>" +
      '<div class="gel-muted">' + h.sub + "</div>" +
      "</div>" +
      '<div class="gel-cell-end"><span class="gel-badge gel-badge--success">' + h.badge + "</span></div>" +
      "</div>";

  const items = list
    .map((b) => {
      const bh = billHeadline(b);
      return (
        '<div class="gel-review-item">' +
        '<div class="gel-review-head">' +
        '<div class="gel-cell-body">' +
        '<div class="gel-h2">' + bh.name + "</div>" +
        '<div class="gel-muted">' + bh.sub + "</div>" +
        "</div>" +
        '<span class="gel-badge gel-badge--success">' + bh.badge + "</span>" +
        "</div>" +
        '<div style="margin-top:9px">' + reviewRows(b) + "</div>" +
        linkFor(b) +
        "</div>"
      );
    })
    .join("");

  const total = many
    ? '<div class="gel-kv"><span class="gel-kv-k">Total you save</span>' +
      '<span class="gel-kv-v" style="color:var(--text-success)">' + fmtAUD(savings) + "/mo (" +
      fmtAUD(savings * 12) + " a year)</span></div>"
    : "";

  const approveLabel = many
    ? "Approve both cancellations"
    : first.action_type === "switch"
    ? "Approve switch"
    : first.action_type === "cancel"
    ? "Approve cancellation"
    : "Approve new date";

  $("#modal-root").innerHTML =
    '<div class="gel-sheet-overlay" onclick="if(event.target===this)closeModal()">' +
    '<div class="gel-sheet" role="dialog" aria-modal="true" aria-labelledby="review-title">' +
    '<button class="gel-sheet-close" type="button" aria-label="Close" onclick="closeModal()">' +
    ico("close") +
    "</button>" +
    '<h2 class="gel-sheet-title" id="review-title">' +
    (many ? "Review these changes" : "Review this change") +
    "</h2>" +
    '<div class="gel-sheet-body">' +
    headHtml +
    (many
      ? '<div class="gel-review-list">' + items + total + "</div>"
      : '<div style="margin-top:12px">' + reviewRows(first) + "</div>" + linkFor(first)) +
    '<div style="margin-top:18px">' +
    (verifiedLine ? '<div class="gel-verified">' + ico("check") + verifiedLine + "</div>" : "") +
    '<p class="gel-muted" style="margin:9px 0 0">Sample pricing for this demo. Confirm the plan and ' +
    "price on the provider's site before switching.</p>" +
    "</div>" +
    "</div>" +
    '<div class="gel-sheet-actions">' +
    '<button class="gel-btn-primary" type="button" onclick="approveFromReview(\'' +
    list.map((b) => b.id).join(",") +
    "')\">" +
    approveLabel +
    "</button>" +
    '<button class="gel-btn-ghost" type="button" onclick="closeModal()">Cancel</button>' +
    "</div>" +
    "</div></div>";
}

function approveFromReview(csv) {
  closeModal();
  approveBills(csv.split(","));
}

/* ---------- computed ---------- */
function recFor(bill) {
  return (bills.recommendations || []).find((r) => r.bill_ids && r.bill_ids.includes(bill.id)) || null;
}
function isKeeper(bill) {
  const rec = recFor(bill);
  return !!rec && rec.kind === "keep_one" && state.choices[rec.id] === bill.id;
}
/* A bill is "recommended" for action unless the customer chose to keep it. */
function billRecommended(bill) {
  return ["switch", "cancel", "reschedule"].includes(bill.action_type) && !isKeeper(bill);
}
function recommendedSavings() {
  return bills.bills.reduce((a, b) => (billRecommended(b) ? a + b.savings_monthly : a), 0);
}

function switchedSavings() {
  let total = 0;
  for (const b of bills.bills) {
    if (
      (b.action_type === "switch" || b.action_type === "cancel") &&
      state.bills[b.id]?.status === "approved"
    ) {
      total += b.savings_monthly;
    }
  }
  return total;
}

/* ---------- renderers ----------
   Everything below is presentation only. The rules for how it *looks*:
     · money is the hero — brand font, tabular figures, right-aligned
     · facts are label/value rows with hairlines, not sentences
     · every number the AI shows is traceable to a transaction row
   GEL has no "card shadow"; hierarchy comes from type size and hairlines. */
const periodWord = (p) => (p === "fortnightly" ? "fortnight" : "month");
const moneyUnit = (p) => '<span class="gel-money-unit">/' + (p === "fortnightly" ? "fortnight" : "mo") + "</span>";

function priceLabel(bill) {
  return fmtAUD(bill.current_amount) + "/" + periodWord(bill.billing_period);
}

function billHead(bill, trailing) {
  return `
    <div class="gel-bill-head">
      ${adorn(bill)}
      <div class="gel-cell-body">
        <div class="gel-bill-title">${bill.label}</div>
        <div class="gel-muted">${bill.provider} · ${bill.plan}</div>
      </div>
      <div class="gel-bill-amount">
        ${trailing || ""}
      </div>
    </div>`;
}

/* Short provider link — the customer can check the plan and price themselves. */
function providerLink(bill) {
  const url = billUrl(bill);
  if (!url) return "";
  return `<div class="gel-linkrow">
    <a class="gel-link gel-link-sm" href="${url}" target="_blank" rel="noopener noreferrer">
      ${billUrlLabel(bill)}${ico("arrow-right")}
    </a>
  </div>`;
}

function evidenceRows(bill) {
  const rows = bill.evidence || [];
  if (!rows.length) return "";
  return `<div class="gel-evidence">${rows
    .map(
      (r) => `<div class="gel-kv">
        <span class="gel-kv-k">${r.k}</span>
        <span class="gel-kv-v">${r.v}</span>
      </div>`
    )
    .join("")}</div>`;
}

/* Now → recommended, with the delta called out. Same shape for every bill. */
function compareBlock(b) {
  const o = b.offer || {};
  const per = periodWord(b.billing_period);
  let left, right, save, saveLabel;

  if (b.action_type === "switch") {
    left = { label: "Now", value: fmtAUD(b.current_amount), unit: "/" + per, note: b.provider };
    right = {
      label: "Recommended",
      value: fmtAUD(o.amount),
      unit: "/" + per,
      note: o.provider,
      good: true
    };
    save = b.savings_monthly;
    saveLabel = "You save";
  } else if (b.action_type === "cancel") {
    left = { label: "Now", value: fmtAUD(b.current_amount), unit: "/" + per, note: b.provider };
    right = { label: "If cancelled", value: "$0.00", unit: "/" + per, note: "No monthly charge", good: true };
    save = b.savings_monthly;
    saveLabel = "You save";
  } else {
    left = {
      label: "Now",
      value: "2nd Thursday",
      note: fmtAUD(b.current_amount) + " · the day before payday"
    };
    right = {
      label: "Recommended",
      value: "2nd Friday",
      note: fmtAUD(b.current_amount) + " · the day after payday",
      good: true
    };
    save = (b.offer && b.offer.fee_avoided) || 19;
    saveLabel = "Fees avoided";
  }

  return `
    <div class="gel-compare">
      <div class="gel-compare-col">
        <span class="gel-label">${left.label}</span>
        <span class="gel-money gel-money--muted">${left.value}${left.unit ? `<span class="gel-money-unit">${left.unit}</span>` : ""}</span>
        <span class="gel-compare-note">${left.note}</span>
      </div>
      <span class="gel-compare-arrow">${ico("arrow-right")}</span>
      <div class="gel-compare-col gel-compare-col--end">
        <span class="gel-label">${right.label}</span>
        <span class="gel-money ${right.good ? "gel-money--good" : ""}">${right.value}${right.unit ? `<span class="gel-money-unit">${right.unit}</span>` : ""}</span>
        <span class="gel-compare-note">${right.note}</span>
      </div>
    </div>
    <div class="gel-saving">
      <span class="gel-label">${saveLabel}</span>
      <span class="gel-money gel-money--good">${fmtAUD(save)}${b.action_type === "reschedule" ? "" : '<span class="gel-money-unit">/month</span>'}</span>
    </div>`;
}

function cardActions(b) {
  return `
    <div class="gel-card-actions">
      <button class="gel-btn-primary" type="button" onclick="showReview('${b.id}')">Review change</button>
      <button class="gel-btn-text" type="button" onclick="declineBill('${b.id}')">Not now</button>
    </div>`;
}

function billCard(b) {
  const badge =
    b.action_type === "reschedule"
      ? "Avoids " + fmtAUD((b.offer && b.offer.fee_avoided) || 19)
      : "Save " + fmtAUD(b.savings_monthly) + "/mo";

  return `
    <article class="gel-cell gel-bill" data-bill="${b.id}">
      ${billHead(
        b,
        `<span class="gel-money">${fmtAUD(b.current_amount)}</span>${moneyUnit(b.billing_period)}`
      )}
      <div class="gel-tagline">
        <span class="gel-badge gel-badge--success">${badge}</span>
        <span class="gel-muted">${b.finding || ""}</span>
      </div>
      <div class="gel-hr"></div>
      ${compareBlock(b)}
      <details class="gel-why">
        <summary>How we know this</summary>
        ${evidenceRows(b)}
        <p class="gel-note">${b.why}</p>
        ${b.risk_notes ? `<p class="gel-note gel-note--warn">${b.risk_notes}</p>` : ""}
        ${providerLink(b)}
      </details>
      ${cardActions(b)}
    </article>`;
}

function billDoneCard(b) {
  const confirm =
    b.action_type === "switch"
      ? `Switched to ${b.offer.provider}. Saving ${fmtAUD(b.savings_monthly)} a month.`
      : b.action_type === "cancel"
      ? `Cancelled. Saving ${fmtAUD(b.savings_monthly)} a month.`
      : "Debit moved to Friday. No more dishonour fees.";
  return `
    <article class="gel-cell gel-bill is-done" data-bill="${b.id}">
      ${billHead(
        b,
        `<span class="gel-badge gel-badge--success">Done</span>`
      )}
      <div class="gel-hr"></div>
      <p class="gel-note gel-note--good">${confirm}</p>
    </article>`;
}

function billStatusCard(b) {
  const label = b.action_type === "keep" ? "Keeping" : "No change";
  return `
    <article class="gel-cell gel-bill is-muted" data-bill="${b.id}">
      ${billHead(
        b,
        `<span class="gel-money gel-money--muted">${fmtAUD(b.current_amount)}</span>${moneyUnit(b.billing_period)}`
      )}
      <p class="gel-note">${b.why}</p>
      <div class="gel-tagline">
        <span class="gel-badge gel-badge--faint">${label}</span>
        ${providerLink(b)}
      </div>
    </article>`;
}

/* The streaming recommendation: the AI proposes, the customer picks. */
function keepOnePanel(rec) {
  const items = rec.bill_ids.map((id) => bills.bills.find((b) => b.id === id)).filter(Boolean);
  const keeperId = state.choices[rec.id];
  const keep = items.find((b) => b.id === keeperId) || items[0];
  const pause = items.filter((b) => b.id !== keep.id);
  const total = items.reduce((a, b) => a + b.current_amount, 0);
  const saving = pause.reduce((a, b) => a + b.current_amount, 0);
  const approved = pause.filter((b) => state.bills[b.id]?.status === "approved");
  const done = pause.length > 0 && approved.length === pause.length;

  const rows = items
    .map((b) => {
      const picked = b.id === keep.id;
      const paused = done && state.bills[b.id]?.status === "approved";
      const stateLabel = paused ? "Paused" : picked ? "Keeping" : "Pause";
      const stateClass = paused ? "gel-badge--faint" : picked ? "gel-badge--success" : "gel-badge--faint";
      return `
        <button class="gel-pick ${picked ? "is-selected" : ""}" type="button"
                ${done ? "disabled" : ""} onclick="chooseKeeper('${rec.id}','${b.id}')">
          <span class="gel-radio ${picked ? "is-on" : ""}"></span>
          <span class="gel-pick-body">
            <span class="gel-pick-title">${b.provider}</span>
            <span class="gel-muted">Paid ${(b.evidence || [])[0]?.v || ""}</span>
          </span>
          <span class="gel-pick-amount">
            <span class="gel-money">${fmtAUD(b.current_amount)}</span>${moneyUnit(b.billing_period)}
          </span>
          <span class="gel-badge ${stateClass}">${stateLabel}</span>
        </button>`;
    })
    .join("");

  const footer = done
    ? `<div class="gel-alert gel-alert--success">Keeping ${keep.provider}. Paused ${approved
        .map((b) => b.provider)
        .join(" and ")} — saving ${fmtAUD(saving)} a month.</div>`
    : `<button class="gel-btn-primary gel-btn-block" type="button"
         onclick="showReview(${JSON.stringify(pause.map((b) => b.id)).replace(/"/g, "&quot;")})">
         Review ${pause.length} cancellations
       </button>`;

  return `
    <section class="gel-panel">
      <div class="gel-panel-head">
        <span class="gel-panel-title">${rec.label}</span>
        <span class="gel-panel-title">${items.length} services · ${fmtAUD(total)} / month</span>
      </div>
      <div class="gel-panel-body">
        <div class="gel-figure">${fmtAUD(saving)}<span class="gel-figure-unit">/month</span></div>
        <p class="gel-muted gel-figure-note">if you pause the other ${pause.length}</p>

        <div class="gel-hr"></div>
        <div class="gel-label">Which one would you keep?</div>
        <div class="gel-picklist">${rows}</div>

        <div class="gel-fact">
          <span class="gel-fact-ico">${ico("help")}</span>
          <p>${rec.what_we_dont_know}</p>
        </div>
        <div class="gel-fact">
          <span class="gel-fact-ico">${ico("check")}</span>
          <p>${rec.constraint}</p>
        </div>

        <div class="gel-hr"></div>
        ${footer}
      </div>
    </section>`;
}

function savingsPanel() {
  const available = recommendedSavings();
  const switched = switchedSavings();
  const pct = available > 0 ? (switched / available) * 100 : 0;
  return `
    <section class="gel-panel">
      <div class="gel-panel-head">
        <span class="gel-panel-title">Savings found</span>
        <span class="gel-panel-title">${fmtAUD(available)} / month</span>
      </div>
      <div class="gel-panel-body">
        <div class="gel-figure">${fmtAUD(available)}<span class="gel-figure-unit">/month</span></div>
        <div class="gel-muted gel-figure-note">${fmtAUD(available * 12)} a year</div>
        <div class="gel-bar gel-bar--skinny" style="margin-top:12px">
          <div class="gel-bar-fill" style="width:${fmtPct(pct)}"></div>
        </div>
        <div class="gel-progress-note">
          <span class="gel-muted"><span id="banner-switched">${fmtAUD(switched)}</span> switched</span>
          <span class="gel-muted">${fmtAUD(available - switched)} to go</span>
        </div>
      </div>
    </section>`;
}

function renderBills() {
  const order = { switch: 0, cancel: 1, reschedule: 2, keep: 3, no_offer: 4 };
  const recs = bills.recommendations || [];
  const streamingIds = recs.flatMap((r) => r.bill_ids || []);

  const main = bills.bills
    .filter((b) => !streamingIds.includes(b.id))
    .sort((a, b) => order[a.action_type] - order[b.action_type] || b.savings_monthly - a.savings_monthly);

  const pending = bills.bills.filter((b) => {
    if (isKeeper(b)) return false;
    const st = state.bills[b.id]?.status || "pending";
    return billRecommended(b) && st === "pending";
  }).length;

  const cards = main
    .map((b) => {
      const st = state.bills[b.id]?.status || "pending";
      if (st === "approved") return billDoneCard(b);
      if (st === "declined")
        return `<article class="gel-cell gel-bill is-muted">${billHead(
          b,
          `<span class="gel-badge gel-badge--faint">Not now</span>`
        )}</article>`;
      if (b.action_type === "keep" || b.action_type === "no_offer") return billStatusCard(b);
      return billCard(b);
    })
    .join("");

  return `
    <div class="gel-screen-head">
      <div>
        <h1 class="gel-title">Bills</h1>
        <p class="gel-muted">${pending} ${pending === 1 ? "change" : "changes"} to review</p>
      </div>
      <span class="gel-badge gel-badge--faint">Last 3 months</span>
    </div>
    ${savingsPanel()}
    ${recs.map((r) => (r.kind === "keep_one" ? keepOnePanel(r) : "")).join("")}
    ${cards}`;
}

function renderGoals() {
  const switched = switchedSavings();
  const cards = rewards.goals
    .map((g) => {
      const done = state.goals[g.id]?.status === "completed";
      let progress = 0;
      if (done) progress = 100;
      else if (g.progress_source === "bill_savings") progress = Math.min(100, (switched / g.target) * 100);

      const ready = !done && g.progress_source === "bill_savings" && switched >= g.target;
      const sub = done
        ? "Completed"
        : g.progress_source === "bill_savings"
        ? fmtAUD(Math.min(switched, g.target)) + " of " + fmtAUD(g.target) + " saved"
        : "Tap to mark done";

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
   The dragon is drawn as layered inline SVG rather than a fixed image, so
   anything bought in the shop actually appears on the dragon. Accessories are
   positioned from each stage's head geometry, which is why a baby dragon gets
   a baby-sized hat and an adult gets the same hat to scale.
   ========================================================================== */
const DRAGON_GEOM = {
  egg: { headY: 150, headR: 62, acc: 0.92 },
  baby: { headY: 122, headR: 40, bodyY: 184, bodyRx: 37, bodyRy: 31, wing: 0.6, horns: 0, tail: 0.7, acc: 0.95 },
  teen: { headY: 100, headR: 34, bodyY: 168, bodyRx: 36, bodyRy: 44, wing: 0.9, horns: 1, tail: 1.0, acc: 1.0 },
  adult: { headY: 88, headR: 32, bodyY: 160, bodyRx: 43, bodyRy: 55, wing: 1.18, horns: 2, tail: 1.25, acc: 1.06 }
};

const C_NAVY = "var(--surface-hero)";
const C_BELLY = "var(--wbc-hero-200)";
const C_RED = "var(--surface-primary)";
const C_GOLD = "var(--game-coin)";

function hatSvg(item, x, y, s) {
  if (!item) return "";
  if (item.id === "item_tophat") {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-21" y="-46" width="42" height="44" rx="4" fill="${C_NAVY}"/>
      <rect x="-21" y="-16" width="42" height="11" fill="${C_RED}"/>
      <rect x="-32" y="-4" width="64" height="9" rx="4.5" fill="${C_NAVY}"/>
    </g>`;
  }
  if (item.id === "item_cap") {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-27,0 a27,25 0 0 1 54,0 z" fill="${C_RED}"/>
      <path d="M-8,-1 h42 a7,7 0 0 1 0,9 h-42 z" fill="${C_NAVY}"/>
      <circle cx="0" cy="-24" r="3.2" fill="${C_NAVY}"/>
    </g>`;
  }
  if (item.id === "item_crown") {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-25,0 l-5,-26 l13,11 l12,-20 l12,20 l13,-11 l-5,26 z"
            fill="${C_GOLD}" stroke="#c8811a" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="0" cy="-6" r="3.4" fill="${C_RED}"/>
      <circle cx="-14" cy="-7" r="2.4" fill="${C_RED}" opacity=".8"/>
      <circle cx="14" cy="-7" r="2.4" fill="${C_RED}" opacity=".8"/>
    </g>`;
  }
  return "";
}

function faceSvg(item, x, y, s) {
  if (!item) return "";
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-30,-5 l-10,3" stroke="#161619" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M30,-5 l10,3" stroke="#161619" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="-30" y="-10" width="26" height="19" rx="7" fill="#161619"/>
    <rect x="4" y="-10" width="26" height="19" rx="7" fill="#161619"/>
    <rect x="-5" y="-4" width="10" height="4" fill="#161619"/>
    <rect x="-25" y="-6" width="9" height="4" rx="2" fill="#fff" opacity=".55"/>
    <rect x="9" y="-6" width="9" height="4" rx="2" fill="#fff" opacity=".55"/>
  </g>`;
}

function neckSvg(item, x, y, s) {
  if (!item) return "";
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M14,2 l13,29 l-15,-9 z" fill="${C_RED}"/>
    <rect x="-32" y="-9" width="64" height="18" rx="9" fill="${C_RED}"/>
    <rect x="-32" y="-9" width="64" height="6" rx="3" fill="${C_NAVY}" opacity=".35"/>
  </g>`;
}

function hornsSvg(x, y, r, n) {
  if (n === 2) {
    return `<path d="M${x - r * 0.7} ${y} l-7 -19 l17 8 z" fill="${C_RED}"/>
            <path d="M${x + r * 0.7} ${y} l7 -19 l-17 8 z" fill="${C_RED}"/>`;
  }
  if (n === 1) return `<path d="M${x} ${y - r * 0.88} l-6 -17 l14 7 z" fill="${C_RED}"/>`;
  return "";
}

function eyesSvg(x, y, r, covered) {
  if (covered) return "";
  return `
    <ellipse cx="${x - r * 0.34}" cy="${y}" rx="${r * 0.17}" ry="${r * 0.2}" fill="#fff"/>
    <ellipse cx="${x + r * 0.34}" cy="${y}" rx="${r * 0.17}" ry="${r * 0.2}" fill="#fff"/>
    <circle cx="${x - r * 0.31}" cy="${y + r * 0.02}" r="${r * 0.095}" fill="#161619"/>
    <circle cx="${x + r * 0.37}" cy="${y + r * 0.02}" r="${r * 0.095}" fill="#161619"/>
    <circle cx="${x - r * 0.27}" cy="${y - r * 0.05}" r="${r * 0.03}" fill="#fff"/>
    <circle cx="${x + r * 0.41}" cy="${y - r * 0.05}" r="${r * 0.03}" fill="#fff"/>`;
}

function dragonSvg(stage, equipped) {
  const eq = equipped || state.shop.equipped;
  const hat = itemById(eq.hat);
  const face = itemById(eq.face);
  const neck = itemById(eq.neck);
  const g = DRAGON_GEOM[stage.id] || DRAGON_GEOM.baby;
  const s = g.acc;
  const x = 120;
  const hatY = g.headY - g.headR + 6;
  const eyeY = g.headY - g.headR * 0.06;
  const neckY = g.headY + g.headR * 0.74;

  if (stage.id === "egg") {
    return `<g class="gel-dragon-body">
      <ellipse cx="120" cy="216" rx="54" ry="9" fill="rgba(0,0,0,.1)"/>
      <ellipse cx="120" cy="150" rx="50" ry="62" fill="${C_NAVY}"/>
      <ellipse cx="104" cy="126" rx="13" ry="19" fill="#fff" opacity=".13"/>
      <circle cx="101" cy="168" r="7" fill="${C_BELLY}" opacity=".7"/>
      <circle cx="141" cy="180" r="5.5" fill="${C_BELLY}" opacity=".7"/>
      <circle cx="136" cy="146" r="4.5" fill="${C_BELLY}" opacity=".7"/>
      <path d="M93,112 l14,10 l6,-12 l12,14 l10,-10" stroke="${C_RED}" stroke-width="3.4"
            fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      ${neckSvg(neck, x, neckY, s)}
      ${faceSvg(face, x, eyeY, s * 0.92)}
      ${hatSvg(hat, x, hatY, s)}
    </g>`;
  }

  const bx = x;
  const by = g.bodyY;
  const rx = g.bodyRx;
  const ry = g.bodyRy;
  const wing = `M0,0 q26,-30 41,2 q-4,26 -29,22 q-10,-3 -12,-24 z`;

  return `<g class="gel-dragon-body">
    <ellipse cx="120" cy="216" rx="${rx * 1.25}" ry="9" fill="rgba(0,0,0,.1)"/>

    <g transform="translate(${bx - rx * 0.86} ${by + ry * 0.16}) rotate(-20)">
      <ellipse cx="${-26 * g.tail}" cy="0" rx="${28 * g.tail}" ry="${9 * g.tail}" fill="${C_NAVY}"/>
      <path d="M${-54 * g.tail},0 l${-16 * g.tail},${-10 * g.tail} l0,${20 * g.tail} z" fill="${C_RED}"/>
    </g>

    <g transform="translate(${bx + rx * 0.5} ${by - ry * 0.5}) scale(${g.wing})">
      <path d="${wing}" fill="${C_RED}" opacity=".92"/>
      <path d="M2,-2 q20,-16 32,6" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>
    </g>
    <g transform="translate(${bx - rx * 0.5} ${by - ry * 0.5}) scale(${-g.wing} ${g.wing})">
      <path d="${wing}" fill="${C_RED}" opacity=".92"/>
      <path d="M2,-2 q20,-16 32,6" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>
    </g>

    <ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="${C_NAVY}"/>
    <ellipse cx="${bx}" cy="${by + ry * 0.24}" rx="${rx * 0.62}" ry="${ry * 0.62}" fill="${C_BELLY}" opacity=".45"/>
    <ellipse cx="${bx - rx * 0.9}" cy="${by + ry * 0.22}" rx="${rx * 0.2}" ry="${ry * 0.28}" fill="${C_NAVY}"/>
    <ellipse cx="${bx + rx * 0.9}" cy="${by + ry * 0.22}" rx="${rx * 0.2}" ry="${ry * 0.28}" fill="${C_NAVY}"/>

    ${hornsSvg(x, g.headY - g.headR * 0.62, g.headR, g.horns)}

    <circle cx="${x}" cy="${g.headY}" r="${g.headR}" fill="${C_NAVY}"/>
    <ellipse cx="${x}" cy="${g.headY + g.headR * 0.4}" rx="${g.headR * 0.6}" ry="${g.headR * 0.34}" fill="${C_BELLY}" opacity=".5"/>
    <circle cx="${x - g.headR * 0.16}" cy="${g.headY + g.headR * 0.38}" r="${g.headR * 0.055}" fill="${C_NAVY}"/>
    <circle cx="${x + g.headR * 0.16}" cy="${g.headY + g.headR * 0.38}" r="${g.headR * 0.055}" fill="${C_NAVY}"/>
    <path d="M${x - g.headR * 0.2} ${g.headY + g.headR * 0.55} q${g.headR * 0.2} ${g.headR * 0.16} ${g.headR * 0.4} 0"
          stroke="${C_NAVY}" stroke-width="2.4" fill="none" stroke-linecap="round"/>

    ${eyesSvg(x, eyeY, g.headR, !!face)}
    <ellipse cx="${x - g.headR * 0.62}" cy="${g.headY + g.headR * 0.3}" rx="${g.headR * 0.13}" ry="${g.headR * 0.08}" fill="${C_RED}" opacity=".22"/>
    <ellipse cx="${x + g.headR * 0.62}" cy="${g.headY + g.headR * 0.3}" rx="${g.headR * 0.13}" ry="${g.headR * 0.08}" fill="${C_RED}" opacity=".22"/>

    ${faceSvg(face, x, eyeY, s)}
    ${neckSvg(neck, x, neckY, s)}
    ${hatSvg(hat, x, hatY, s)}
  </g>`;
}

/* Scene behind the dragon — a "home" item from the shop changes this. */
function sceneId() {
  const home = itemById(state.shop.equipped.home);
  return (home && home.scene) || "plain";
}

function sceneHtml(extraClass) {
  const stage = stageForXp(state.xp_total);
  return `<div class="gel-scene ${extraClass || ""}" data-scene="${sceneId()}" onclick="pokeDragon()"
               role="button" tabindex="0" aria-label="Your ${stage.name}. Tap to interact.">
    <div class="gel-scene-sky"></div>
    <svg class="gel-dragon" id="dragon-art" viewBox="0 0 240 240" aria-hidden="true">
      ${dragonSvg(stage)}
    </svg>
    <div class="gel-bubble" id="dragon-bubble"></div>
    <div class="gel-hearts" id="dragon-hearts"></div>
  </div>`;
}

const DRAGON_LINES = [
  "Rawr. Every repayment on time makes me a little bigger.",
  "I only grow from good money habits — never from shopping.",
  "Tap a bill and review it. I get the XP, you get the savings.",
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

/* Shop item art is also vector, so every item matches the dragon's style and
   there are no missing-image requests when Naomi's PNGs aren't committed yet. */
function shopArt(item) {
  const navy = "var(--surface-hero)";
  const red = "var(--surface-primary)";
  const gold = "var(--game-coin)";
  const w = (s) => `<svg viewBox="0 0 48 48" class="shop-art-svg" aria-hidden="true">${s}</svg>`;
  switch (item.id) {
    case "item_tophat":
      return w(
        `<rect x="6" y="28" width="36" height="7" rx="3.5" fill="${navy}"/>` +
          `<rect x="13" y="3" width="22" height="26" rx="3" fill="${navy}"/>` +
          `<rect x="13" y="19" width="22" height="7" fill="${red}"/>`
      );
    case "item_cap":
      return w(
        `<path d="M6,30 a18,17 0 0 1 36,0 z" fill="${red}"/>` +
          `<path d="M24,31 h22 a5,5 0 0 1 0,9 h-22 z" fill="${navy}"/>` +
          `<circle cx="24" cy="12" r="2.5" fill="${navy}"/>`
      );
    case "item_crown":
      return w(
        `<path d="M9,33 l-4,-19 l10,8 l9,-16 l9,16 l10,-8 l-4,19 z" fill="${gold}" stroke="#c8811a" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<circle cx="24" cy="28" r="2.6" fill="${red}"/>` +
          `<circle cx="14" cy="27" r="1.8" fill="${red}"/>` +
          `<circle cx="34" cy="27" r="1.8" fill="${red}"/>`
      );
    case "item_sunnies":
      return w(
        `<rect x="3" y="20" width="19" height="13" rx="5" fill="#161619"/>` +
          `<rect x="26" y="20" width="19" height="13" rx="5" fill="#161619"/>` +
          `<rect x="20" y="24" width="8" height="3" fill="#161619"/>` +
          `<rect x="6" y="22" width="7" height="3" rx="1.5" fill="#fff" opacity=".55"/>` +
          `<rect x="29" y="22" width="7" height="3" rx="1.5" fill="#fff" opacity=".55"/>`
      );
    case "item_scarf":
      return w(
        `<path d="M38,26 l10,14 l-12,-7 z" fill="${red}"/>` +
          `<rect x="6" y="20" width="34" height="12" rx="6" fill="${red}"/>` +
          `<rect x="6" y="20" width="34" height="4" rx="2" fill="${navy}" opacity=".35"/>`
      );
    case "item_feast":
      return w(
        `<ellipse cx="17" cy="20" rx="13" ry="11" fill="#8a5a00"/>` +
          `<ellipse cx="13" cy="18" rx="9" ry="7" fill="#b9741a"/>` +
          `<path d="M29,20 l15,0 a3,3 0 0 1 0,6 l-11,0 z" fill="#e8e3d5"/>` +
          `<circle cx="30" cy="23" r="3" fill="#e8e3d5"/>` +
          `<circle cx="38" cy="23" r="3" fill="#e8e3d5"/>`
      );
    case "item_cave":
      return w(
        `<circle cx="24" cy="24" r="19" fill="#0e0c2b"/>` +
          `<path d="M10,34 a14,10 0 0 1 28,0 z" fill="#1f1c4f"/>` +
          `<circle cx="16" cy="15" r="1.6" fill="#fff"/>` +
          `<circle cx="30" cy="12" r="1.3" fill="#fff"/>` +
          `<circle cx="34" cy="24" r="1.5" fill="#fff"/>` +
          `<circle cx="14" cy="26" r="1.2" fill="#fff"/>`
      );
    case "item_lair":
      return w(
        `<path d="M6,36 l12,-22 l12,22 z" fill="#3a2b2b"/>` +
          `<path d="M13,36 l5,-14 l5,14 z" fill="#e03c1a"/>` +
          `<path d="M17,36 l2,-6 l2,6 z" fill="#ff8a3c"/>` +
          `<path d="M30,36 a8,10 0 0 1 14,0 z" fill="#2a2a2a"/>`
      );
    case "item_perk":
      return w(
        `<path d="M24,4 l10,10 l-10,30 l-10,-30 z" fill="${gold}" stroke="#c8811a" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M14,14 l20,0 M24,4 l-6,10 l12,0 z" stroke="#fff" stroke-width="1.4" fill="none" opacity=".5"/>`
      );
    default:
      return w(`<circle cx="24" cy="24" r="16" fill="${red}"/>`);
  }
}

function renderShop() {
  const stage = stageForXp(state.xp_total);
  const worn = wornItems();
  const items = rewards.shop
    .map((item) => {
      const owned = state.shop.owned.includes(item.id);
      const wearingNow = isWearing(item.id);
      return `
        <article class="gel-cell gel-shop-item ${wearingNow ? "is-worn" : ""}" data-item="${item.id}">
          <div class="gel-shop-art">
            ${shopArt(item)}
            ${wearingNow ? `<span class="gel-shop-worn">${ico("check")}</span>` : ""}          </div>
          <div class="gel-shop-name">${item.name}</div>
          <div class="gel-shop-price">
            <span class="gel-money gel-money--sm">${fmtWhole(item.cost)}</span>
            <span class="gel-money-unit">${item.slot === "food" ? "each" : item.locked ? "" : ""}</span>
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

/* ---------- shell ---------- */
let activeTab = "bills";
let lastCoins = 0;
let lastSwitched = 0;

function render() {
  animateCount($("#header-coins"), lastCoins, state.coins, fmtWhole);
  lastCoins = state.coins;

  const screen = $("#screen");
  if (activeTab === "bills") screen.innerHTML = renderBills();
  else if (activeTab === "goals") screen.innerHTML = renderGoals();
  else if (activeTab === "dragon") screen.innerHTML = renderDragon();
  else screen.innerHTML = renderShop();

  const bs = $("#banner-switched");
  if (bs) animateCount(bs, lastSwitched, switchedSavings(), fmtAUD);
  lastSwitched = switchedSavings();
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
