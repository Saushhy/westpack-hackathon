"use strict";

const { bills, rewards } = window.DATA;
const LS_KEY = "credit-dragon:state";
const STATE_VERSION = 1;

const $ = (sel, root = document) => root.querySelector(sel);
const coin = () => '<span class="gel-coin"></span>';

const fmtAUD = (n) =>
  "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWhole = (n) => Number(n).toLocaleString("en-AU");

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

function imgOrEmoji(src, emoji, alt, cls) {
  return (
    '<img src="' + src + '" alt="' + alt + '" class="' + cls + '" loading="lazy" ' +
    'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'">' +
    '<span style="display:none" class="' + cls + ' emoji-fallback">' + emoji + "</span>"
  );
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
    shop: { owned: [], equipped: {} },
    awarded: [],
    ledger: []
  };
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === STATE_VERSION) return s;
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

function approveBill(id) {
  const bill = bills.bills.find((b) => b.id === id);
  if (!bill || state.bills[id]?.status === "approved") return;
  state.bills[id] = { status: "approved", approved_at: new Date().toISOString() };
  const actionId = billActionForType[bill.action_type];
  const res = actionId ? award(actionId, id, bill.label + " approved") : null;
  save();
  render();
  if (res && (res.xp || res.coins)) {
    toast("+" + res.xp + " XP · +" + res.coins + " " + coin());
    if (res.evolved) showEvolution(res.fromStage, res.toStage);
  }
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

function buyItem(id) {
  const item = rewards.shop.find((s) => s.id === id);
  if (!item || item.locked || state.shop.owned.includes(id) || state.coins < item.cost) return;
  state.coins -= item.cost;
  state.shop.owned.push(id);
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
  toast("−" + item.cost + " " + coin() + " · " + item.name);
}

function closeModal() {
  $("#modal-root").innerHTML = "";
}

/* ---------- toast + evolution modal ---------- */
let toastTimer = null;
function toast(html) {
  const el = $("#toast");
  el.innerHTML = html;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function showEvolution(from, to) {
  $("#modal-root").innerHTML =
    '<div class="gel-modal-backdrop" onclick="if(event.target===this)closeModal()">' +
    '<div class="gel-modal">' +
    '<div class="gel-dragon-avatar">' + imgOrEmoji(to.image, to.emoji, to.name, "dragon-img") + "</div>" +
    '<h2 class="gel-h2" style="margin-top:8px">Your dragon evolved!</h2>' +
    '<p class="gel-muted" style="margin:8px 0 16px">' + from.name + " → " + to.name + "</p>" +
    '<button class="gel-btn-primary" onclick="closeModal()">Nice! 🎉</button>' +
    "</div></div>";
}

/* ---------- computed ---------- */
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

/* ---------- renderers ---------- */
function priceLabel(bill) {
  const period = bill.billing_period === "fortnightly" ? "fortnight" : "mo";
  return fmtAUD(bill.current_amount) + "/" + period;
}

function renderBills() {
  const t = bills.totals;
  const switched = switchedSavings();
  const order = { switch: 0, cancel: 1, reschedule: 2, keep: 3, no_offer: 4 };
  const sorted = [...bills.bills].sort(
    (a, b) => order[a.action_type] - order[b.action_type] || b.savings_monthly - a.savings_monthly
  );

  const banner =
    '<div class="gel-card" style="background:var(--color-hero);color:#fff;border:0">' +
    '<div class="gel-muted" style="color:rgba(255,255,255,0.7)">Your dragon found</div>' +
    '<div style="font-size:26px;font-weight:800;line-height:1.1">' + fmtAUD(t.savings_monthly) +
    '<span style="font-size:14px;font-weight:600;opacity:0.8">/mo</span></div>' +
    '<div style="font-size:12px;opacity:0.85">≈ ' + fmtAUD(t.savings_annual) + " a year</div>" +
    '<div class="gel-bar" style="background:rgba(255,255,255,0.15);margin-top:12px">' +
    '<div class="gel-bar-fill" style="width:' + Math.min(100, (switched / t.savings_monthly) * 100) + '%;background:#fff"></div>' +
    "</div>" +
    '<div style="font-size:11px;margin-top:6px;opacity:0.85">' +
    fmtAUD(switched) + " switched of " + fmtAUD(t.savings_monthly) + " available</div>" +
    "</div>";

  const cards = sorted
    .map((b) => {
      const st = state.bills[b.id]?.status || "pending";

      if (st === "approved") {
        const confirm =
          b.action_type === "switch"
            ? "Switched! You're saving " + fmtAUD(b.savings_monthly) + "/mo."
            : b.action_type === "cancel"
            ? "Cancelled. You're saving " + fmtAUD(b.savings_monthly) + "/mo."
            : "Moved to Fridays. Dishonour fees avoided.";
        return (
          '<div class="gel-card">' +
          '<div class="gel-alert gel-alert-success">✓ ' + confirm + "</div>" +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
          '<span style="font-size:22px">' + b.icon + "</span>" +
          '<div style="flex:1"><div class="gel-h2">' + b.label + "</div>" +
          '<div class="gel-muted">' + b.provider + " · " + b.plan + "</div></div>" +
          "</div></div>"
        );
      }

      if (st === "declined") {
        return (
          '<div class="gel-card" style="opacity:0.6">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:22px">' + b.icon + "</span>" +
          '<div style="flex:1"><div class="gel-h2">' + b.label + "</div>" +
          '<div class="gel-muted">' + b.provider + " · " + b.plan + "</div></div>" +
          '<span class="gel-badge-muted">Not now</span>' +
          "</div></div>"
        );
      }

      if (b.action_type === "keep" || b.action_type === "no_offer") {
        return (
          '<div class="gel-card" style="opacity:0.85">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:22px">' + b.icon + "</span>" +
          '<div style="flex:1"><div class="gel-h2">' + b.label + "</div>" +
          '<div class="gel-muted">' + b.provider + " · " + b.plan + "</div></div>" +
          '<span class="gel-badge-muted">' + (b.action_type === "keep" ? "Keeping" : "No offer") + "</span>" +
          "</div>" +
          '<p class="gel-muted" style="margin-top:8px">' + b.why + "</p>" +
          "</div>"
        );
      }

      // actionable pending
      const offer = b.offer;
      const offerPrice = offer
        ? fmtAUD(offer.amount) + "/" + (offer.billing_period === "fortnightly" ? "fortnight" : "mo")
        : "";
      const badge =
        b.action_type === "reschedule"
          ? "Avoid $19 in fees"
          : "Save " + fmtAUD(b.savings_monthly) + "/mo";

      return (
        '<div class="gel-card">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:22px">' + b.icon + "</span>" +
        '<div style="flex:1"><div class="gel-h2">' + b.label + "</div>" +
        '<div class="gel-muted">' + b.provider + " · " + b.plan + "</div></div>" +
        '<span class="gel-badge-save">' + badge + "</span>" +
        "</div>" +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:12px">' +
        '<div style="flex:1"><div class="gel-muted">Current</div>' +
        '<div style="font-weight:700;color:var(--color-muted);text-decoration:' + (offer ? "line-through" : "none") + '">' +
        priceLabel(b) + "</div></div>" +
        (offer
          ? '<div style="flex:1;text-align:right"><div class="gel-muted">New</div>' +
            '<div style="font-weight:800;color:var(--color-success)">' + offerPrice + "</div></div>"
          : "") +
        "</div>" +
        (offer
          ? '<div style="font-size:11px;color:var(--color-muted);margin-top:8px">' +
            offer.features.join(" · ") + "</div>"
          : "") +
        '<details class="gel-why" style="margin-top:10px">' +
        "<summary>Why am I showing you this?</summary>" +
        '<p style="font-size:12px;color:var(--color-ink);margin-top:6px">' + b.why + "</p>" +
        (b.risk_notes ? '<div class="gel-alert gel-alert-warning" style="margin-top:8px">' + b.risk_notes + "</div>" : "") +
        '<p class="gel-muted" style="margin-top:8px">Nothing happens until you approve.</p>' +
        "</details>" +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="gel-btn-primary" style="flex:1" onclick="approveBill(\'' + b.id + "')\">Approve</button>" +
        '<button class="gel-btn-ghost" onclick="declineBill(\'' + b.id + "')\">Not now</button>" +
        "</div></div>"
      );
    })
    .join("");

  return banner + cards;
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
        ? "Completed ✓"
        : g.progress_source === "bill_savings"
        ? fmtAUD(Math.min(switched, g.target)) + " / " + fmtAUD(g.target) + " saved"
        : "Tap to complete";

      return (
        '<div class="gel-card">' +
        '<div class="gel-h2">' + g.title + "</div>" +
        '<div class="gel-muted" style="margin-top:2px">' + g.description + "</div>" +
        '<div class="gel-bar" style="margin-top:10px">' +
        '<div class="gel-bar-fill" style="width:' + progress + "%;background:" + (done ? "var(--color-success)" : "var(--color-primary)") + '"></div>' +
        "</div>" +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">' +
        '<span class="gel-muted">' + sub + "</span>" +
        '<span class="gel-badge-muted">+' + g.xp + " XP · +" + g.coins + " " + coin() + "</span>" +
        "</div>" +
        (!done
          ? '<button class="gel-btn-primary" style="width:100%;margin-top:12px" onclick="completeGoal(\'' + g.id + "')\">" +
            (ready ? "Complete goal" : "Mark done") + "</button>"
          : "") +
        "</div>"
      );
    })
    .join("");

  return '<h1 class="gel-h1" style="margin-bottom:12px">Credit health plan</h1>' + cards;
}

function renderDragon() {
  const stage = stageForXp(state.xp_total);
  const lvl = levelForXp(state.xp_total);
  const nxt = nextLevel(state.xp_total);
  const nxtStage = nextStage(state.xp_total);

  const lvlPct = nxt
    ? ((state.xp_total - lvl.xp_required) / (nxt.xp_required - lvl.xp_required)) * 100
    : 100;
  const stagePct = nxtStage
    ? ((state.xp_total - stage.xp_required) / (nxtStage.xp_required - stage.xp_required)) * 100
    : 100;

  const trail = rewards.stages
    .map((s) => {
      const reached = state.xp_total >= s.xp_required;
      return '<span style="font-size:' + (reached ? 18 : 12) + "px;opacity:" + (reached ? 1 : 0.35) + '">' + s.emoji + "</span>";
    })
    .join('<span class="gel-muted" style="margin:0 3px">·</span>');

  const ledgerHtml = state.ledger.length
    ? state.ledger
        .slice()
        .reverse()
        .map(
          (e) =>
            '<div style="padding:5px 0;border-top:1px solid var(--color-line)">' +
            e.reason + " — <b>+" + e.xp + " XP · " + (e.coins >= 0 ? "+" : "") + e.coins + " " + coin() + "</b></div>"
        )
        .join("")
    : "No activity yet.";

  return (
    '<div class="gel-card" style="text-align:center;padding:20px 14px">' +
    '<div class="gel-dragon-avatar">' + imgOrEmoji(stage.image, stage.emoji, stage.name, "dragon-img") + "</div>" +
    '<h1 class="gel-h1">' + stage.name + "</h1>" +
    '<div class="gel-muted">Level ' + lvl.level + " · " + fmtWhole(state.xp_total) + " XP · " + state.streak_weeks + "-week streak</div>" +
    '<div class="gel-coin-pill" style="margin-top:10px;background:var(--color-coin-faint);color:var(--color-coin);border-color:var(--color-coin-tint)">' +
    coin() + " " + fmtWhole(state.coins) + " coins</div>" +
    "</div>" +
    '<div class="gel-card">' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-muted);margin-bottom:6px">' +
    "<span>Level " + lvl.level + "</span><span>" + (nxt ? "Level " + nxt.level : "Max level") + "</span></div>" +
    '<div class="gel-bar"><div class="gel-bar-fill" style="width:' + lvlPct + '%;background:var(--color-primary)"></div></div>' +
    '<div class="gel-muted" style="margin-top:6px">' + (nxt ? fmtWhole(nxt.xp_required - state.xp_total) + " XP to level " + nxt.level : "You've reached the top!") + "</div>" +
    "</div>" +
    '<div class="gel-card">' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-muted);margin-bottom:8px">' +
    "<span>Evolution</span><span>" + (nxtStage ? nxtStage.name : "Adult") + "</span></div>" +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' + trail + "</div>" +
    '<div class="gel-bar"><div class="gel-bar-fill" style="width:' + stagePct + '%;background:var(--color-hero)"></div></div>' +
    '<div class="gel-muted" style="margin-top:6px">' + (nxtStage ? fmtWhole(nxtStage.xp_required - state.xp_total) + " XP to evolve" : "Fully grown!") + "</div>" +
    "</div>" +
    '<details class="gel-card" style="margin:0">' +
    '<summary class="gel-h2" style="cursor:pointer">Activity log (audit)</summary>' +
    '<div style="margin-top:8px;font-size:11px;color:var(--color-muted)">' + ledgerHtml + "</div>" +
    "</details>" +
    '<button class="gel-btn-ghost" style="width:100%;margin-top:12px" onclick="reset()">Reset demo</button>'
  );
}

function renderShop() {
  const items = rewards.shop
    .map((item) => {
      const owned = state.shop.owned.includes(item.id);
      const locked = !!item.locked;
      const affordable = state.coins >= item.cost;

      let cta;
      if (locked) {
        cta = '<span class="gel-badge-muted">Pitch concept</span>';
      } else if (owned) {
        cta = '<span class="gel-badge-save">Owned ✓</span>';
      } else {
        cta =
          '<button class="gel-btn-primary" style="width:100%"' + (affordable ? "" : " disabled") +
          ' onclick="buyItem(\'' + item.id + "')\">" + (affordable ? "Buy" : "Not enough coins") + "</button>";
      }

      return (
        '<div class="gel-card" style="text-align:center;margin:0">' +
        '<div style="height:54px;display:flex;align-items:center;justify-content:center">' +
        imgOrEmoji(item.image, item.emoji, item.name, "shop-img") + "</div>" +
        '<div class="gel-h2" style="margin-top:6px">' + item.name + "</div>" +
        '<div class="gel-muted" style="min-height:30px">' + item.description + "</div>" +
        '<div style="margin:10px 0;font-weight:800;color:var(--color-coin)">' +
        (locked ? "🔒 " : "") + fmtWhole(item.cost) + " " + coin() + "</div>" +
        cta +
        "</div>"
      );
    })
    .join("");

  return (
    '<h1 class="gel-h1" style="margin-bottom:6px">Dragon shop</h1>' +
    '<p class="gel-muted" style="margin-bottom:12px">You have ' + fmtWhole(state.coins) + " " + coin() + "</p>" +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + items + "</div>"
  );
}

/* ---------- shell ---------- */
let activeTab = "bills";

function render() {
  $("#header-coins").textContent = fmtWhole(state.coins);
  const screen = $("#screen");
  if (activeTab === "bills") screen.innerHTML = renderBills();
  else if (activeTab === "goals") screen.innerHTML = renderGoals();
  else if (activeTab === "dragon") screen.innerHTML = renderDragon();
  else screen.innerHTML = renderShop();
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll("#tabbar .gel-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  render();
}

document.querySelectorAll("#tabbar .gel-tab").forEach((b) => {
  b.addEventListener("click", () => setTab(b.dataset.tab));
});

render();
