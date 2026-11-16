/**
 * Headless fidelity + behaviour audit for the Credit Dragon prototype.
 *
 * Drives the real app in system Edge (via playwright-core) and asserts computed
 * styles against values from WestpacGEL/GEL-next, then runs the full Mia journey
 * (review sheet → approve), the streaming keep-one choice, and the wardrobe.
 *
 *   npm run audit
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const fileUrl = (p) => "file:///" + join(webRoot, p).replace(/\\/g, "/");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const errors = [];
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 980 } });
page.on("console", (m) => {
  if (m.type() !== "error") return;
  // Intentional: Naomi's dragon/shop PNGs aren't committed yet — the emoji fallback
  // in imgOrEmoji is by design, and the corresponding requestfailed events are
  // already filtered by URL below.
  if (/Failed to load resource/.test(m.text())) return;
  errors.push("[console] " + m.text());
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/assets\/(shop|dragon)\/.*\.png/.test(u)) {
    errors.push("[requestfailed] " + u + " :: " + (r.failure()?.errorText || "?"));
  }
});

const report = [];
const check = (name, expected, actual, ok) => report.push({ name, expected, actual, ok: !!ok });
const cs = (sel, prop) =>
  page.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el)[p] : null;
    },
    [sel, prop]
  );

// ============================ GEL theme layer ============================
await page.goto(fileUrl("index.html"));
await page.waitForTimeout(900);

{
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      hero: s.getPropertyValue("--surface-hero").trim(),
      primary: s.getPropertyValue("--surface-primary").trim(),
      body: s.getPropertyValue("--text-body").trim(),
      line: s.getPropertyValue("--border-muted-soft").trim(),
      brand: s.getPropertyValue("--font-brand").trim(),
      spacing: s.getPropertyValue("--spacing").trim(),
      body9: s.getPropertyValue("--typography-body-size-9").trim(),
    };
  });
  check("GEL theme: --surface-hero #1f1c4f", "#1f1c4f", tokens.hero, tokens.hero === "#1f1c4f");
  check("GEL theme: --surface-primary #da1710", "#da1710", tokens.primary, tokens.primary === "#da1710");
  check("GEL theme: --text-body #161619", "#161619", tokens.body, tokens.body === "#161619");
  check("GEL theme: --border-muted-soft #dedee1", "#dedee1", tokens.line, tokens.line === "#dedee1");
  check("GEL brand font token present", "Westpac", tokens.brand, tokens.brand === "Westpac");
  check("GEL spacing base 0.375rem (6px)", "0.375rem", tokens.spacing, parseFloat(tokens.spacing) === 0.375);
  check("GEL body size 9 = 1rem", "1rem", tokens.body9, tokens.body9 === "1rem");
}

// ============================ fonts ============================
{
  const loaded = await page.evaluate(() => document.fonts.check("700 24px Westpac"));
  check("Real Westpac Bold font loaded", "true", String(loaded), loaded);
  const titleFont = await cs(".gel-title", "fontFamily");
  check("Headings use Westpac brand font", "Westpac, …", titleFont, /^Westpac/.test(titleFont || ""));
  const bodyFont = await cs("body", "fontFamily");
  check("Body uses GEL sans stack", "…Segoe UI…", bodyFont, /Segoe UI/.test(bodyFont || ""));
  check("Body type = 16px", "16px", await cs("body", "fontSize"), (await cs("body", "fontSize")) === "16px");
  check("Secondary type = 14px", "14px", await cs(".gel-muted", "fontSize"), (await cs(".gel-muted", "fontSize")) === "14px");
}

// ============================ header ============================
{
  check("Header background white", "rgb(255, 255, 255)", await cs(".gel-topbar", "backgroundColor"), (await cs(".gel-topbar", "backgroundColor")) === "rgb(255, 255, 255)");
  const h = await page.evaluate(() => getComputedStyle(document.querySelector(".gel-header-main")).height);
  check("Header height 54px", "54px", h, h === "54px");
  const logo = await page.evaluate(() => document.querySelector(".gel-logo")?.naturalWidth || 0);
  check("Real Westpac logo loaded", ">0", String(logo), logo > 0);
}

// ============================ buttons / cells / icons ============================
{
  const btn = await page.evaluate(() => {
    const el = document.querySelector(".gel-btn-primary");
    const s = getComputedStyle(el);
    return { h: s.height, r: s.borderRadius, bg: s.backgroundColor, fs: s.fontSize };
  });
  check("Button height 42px", "42px", btn.h, btn.h === "42px");
  check("Button radius 5px", "5px", btn.r, btn.r === "5px");
  check("Button fill = primary", "rgb(218, 23, 16)", btn.bg, btn.bg === "rgb(218, 23, 16)");
  check("Button label 16px", "16px", btn.fs, btn.fs === "16px");

  const cell = await page.evaluate(() => {
    const el = document.querySelector(".gel-cell");
    const s = getComputedStyle(el);
    return { r: s.borderRadius, p: s.paddingTop, shadow: s.boxShadow };
  });
  check("Row radius 8px", "8px", cell.r, cell.r === "8px");
  check("Row padding 12px", "12px", cell.p, cell.p === "12px");
  check("Row is flat (no shadow)", "none", cell.shadow, cell.shadow === "none");

  const n = await page.evaluate(() => document.querySelectorAll(".gel-ico svg").length);
  check("GEL icons render as inline SVG (>=12)", ">=12", String(n), n >= 12);
  const fill = await page.evaluate(() => {
    const p = document.querySelector(".gel-adorn .gel-ico svg path");
    return p ? p.getAttribute("fill") : null;
  });
  check("Icons inherit colour (currentColor)", "currentColor", fill, fill === "currentColor");
}

// ============================ layout: overflow + money ==================
{
  const bad = await page.evaluate(() => {
    const phone = document.querySelector(".phone");
    const pr = phone.getBoundingClientRect();
    const out = [];
    phone.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > pr.right + 1 || r.left < pr.left - 1) out.push((el.className || el.tagName).toString().slice(0, 40));
    });
    return out.slice(0, 8);
  });
  check("No horizontal overflow in phone", "[]", JSON.stringify(bad), bad.length === 0);

  const money = await page.evaluate(() => {
    const el = document.querySelector(".gel-money");
    if (!el) return null;
    const s = getComputedStyle(el);
    return { font: s.fontFamily, variant: s.fontVariantNumeric, size: s.fontSize };
  });
  check("Money uses brand font", "Westpac", money?.font, /^Westpac/.test(money?.font || ""));
  check("Money uses tabular figures", "tabular-nums", money?.variant, /tabular/.test(money?.variant || ""));
  check("Money size 18px", "18px", money?.size, money?.size === "18px");

  const compare = await page.evaluate(() => document.querySelectorAll(".gel-compare").length);
  check("Actionable bills show Now→Recommended compare", ">=3", String(compare), compare >= 3);
}

// ============================ contrast ============================
{
  const ratios = await page.evaluate(() => {
    const lum = (rgb) => {
      const m = rgb.match(/\d+/g).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
    };
    const contrast = (a, b) => {
      const l1 = lum(a), l2 = lum(b);
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };
    const body = getComputedStyle(document.body).color;
    const muted = getComputedStyle(document.querySelector(".gel-muted")).color;
    return {
      body: contrast(body, "rgb(255, 255, 255)"),
      muted: contrast(muted, "rgb(255, 255, 255)"),
      button: contrast("rgb(255, 255, 255)", "rgb(218, 23, 16)"),
    };
  });
  check("Body contrast WCAG AA", ">=4.5", ratios.body.toFixed(1) + ":1", ratios.body >= 4.5);
  check("Muted contrast WCAG AA", ">=4.5", ratios.muted.toFixed(1) + ":1", ratios.muted >= 4.5);
  check("Button contrast WCAG AA", ">=4.5", ratios.button.toFixed(1) + ":1", ratios.button >= 4.5);
}

// ============================ streaming keep-one panel ============================
{
  const picks = await page.evaluate(() => document.querySelectorAll(".gel-pick").length);
  check("Streaming panel shows 3 services", "3", String(picks), picks === 3);
  const chosen = await page.evaluate(() => document.querySelector(".gel-pick.is-selected .gel-pick-title")?.textContent);
  check("Default keeper = Netflix", "Netflix", chosen, chosen === "Netflix");

  // pick a different keeper (Stan) and confirm the recommendation updates
  await page.locator('.gel-pick:has-text("Stan")').click();
  await page.waitForTimeout(150);
  const chosen2 = await page.evaluate(() => document.querySelector(".gel-pick.is-selected .gel-pick-title")?.textContent);
  check("Keeper changes to Stan", "Stan", chosen2, chosen2 === "Stan");

  // verify honesty note is present (no false viewing claims)
  const honest = await page.evaluate(() => document.body.innerText.includes("not what you watch"));
  check("Honesty note: we can't see viewing history", "true", String(honest), honest);
}

// ============================ review sheet + scroll fix ============================
{
  // open the streaming group review (2 services)
  await page.locator("button", { hasText: "Review 2 cancellations" }).click();
  await page.waitForTimeout(350);

  const sheet = await page.evaluate(() => {
    const body = document.querySelector(".gel-sheet-body");
    const s = getComputedStyle(body);
    return {
      overflowY: s.overflowY,
      minHeight: s.minHeight,
      items: document.querySelectorAll(".gel-review-item").length,
      link: document.querySelector(".gel-sheet a.gel-link")?.getAttribute("href") || "",
      linkTarget: document.querySelector(".gel-sheet a.gel-link")?.getAttribute("target") || "",
    };
  });
  check("Sheet body scrolls (overflow-y auto)", "auto", sheet.overflowY, sheet.overflowY === "auto");
  check("Sheet body min-height 0 (fix)", "0px", sheet.minHeight, sheet.minHeight === "0px");
  check("Group review lists 2 items", "2", String(sheet.items), sheet.items === 2);
  check("Provider link present in sheet", "starts https", sheet.link, /^https:\/\//.test(sheet.link));
  check("Provider link opens new tab", "_blank", sheet.linkTarget, sheet.linkTarget === "_blank");

  // cancel out, then approve via the real path
  await page.locator(".gel-sheet-close").click();
  await page.waitForTimeout(150);
}

// ============================ full journey ============================
{
  // approve the three single-bill changes (phone, internet, gym) via Review → sheet
  for (let i = 0; i < 3; i++) {
    const review = page.locator('button.gel-btn-primary', { hasText: "Review change" }).first();
    if ((await review.count()) === 0) break;
    await review.click();
    await page.waitForTimeout(250);
    await page.locator(".gel-sheet .gel-btn-primary").first().click();
    await page.waitForTimeout(250);
  }

  // approve the two streaming cancellations
  const rec = page.locator("button", { hasText: "Review 2 cancellations" }).first();
  if ((await rec.count()) > 0) {
    await rec.click();
    await page.waitForTimeout(250);
    await page.locator(".gel-sheet .gel-btn-primary", { hasText: "Approve both" }).first().click();
    await page.waitForTimeout(250);
  }

  // goals
  await page.locator('.gel-tab[data-tab="goals"]').click();
  await page.waitForTimeout(250);
  const goalBtn = page.locator('button.gel-btn-primary', { hasText: "Complete goal" }).first();
  if ((await goalBtn.count()) > 0) {
    await goalBtn.click();
    await page.waitForTimeout(450);
  }
  // evolution modal should appear on crossing 800 XP
  const dlg = await page.evaluate(() => {
    const d = document.querySelector(".gel-dialog");
    if (!d) return null;
    const s = getComputedStyle(d);
    const t = document.querySelector(".gel-dialog-title");
    return { r: s.borderRadius, size: t ? getComputedStyle(t).fontSize : null, overlay: getComputedStyle(document.querySelector(".gel-overlay")).backgroundColor };
  });
  check("Evolution modal appears", "present", dlg ? "present" : "missing", !!dlg);
  if (dlg) {
    check("Modal radius 12px", "12px", dlg.r, dlg.r === "12px");
    check("Modal title 24px", "24px", dlg.size, dlg.size === "24px");
    check("Modal backdrop black/65", "rgba(0, 0, 0, 0.65)", dlg.overlay, dlg.overlay === "rgba(0, 0, 0, 0.65)");
    await page.locator(".gel-btn-primary", { hasText: "Continue" }).click();
    await page.waitForTimeout(150);
  }
  for (let i = 0; i < 3; i++) {
    const b = page.locator('button.gel-btn-primary', { hasText: "Mark done" }).first();
    if ((await b.count()) === 0) break;
    await b.click();
    await page.waitForTimeout(140);
  }

  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("credit-dragon:state")));
  check("Final XP = 1080", "1080", String(st.xp_total), st.xp_total === 1080);
  check("Final coins = 600", "600", String(st.coins), st.coins === 600);
  check("Dragon stage = teen", "teen", st.xp_total >= 800 ? "teen" : "not teen", st.xp_total >= 800);
  check(
    "No duplicate awards",
    "0 dups",
    new Set(st.awarded).size === st.awarded.length ? "0 dups" : "dups",
    new Set(st.awarded).size === st.awarded.length
  );
}

// ============================ dragon + wardrobe ============================
{
  await page.locator('.gel-tab[data-tab="dragon"]').click();
  await page.waitForTimeout(250);

  const dragon = await page.evaluate(() => {
    const wrap = document.querySelector("#dragon-art");
    const scene = document.querySelector(".gel-scene");
    return {
      hasDragon: !!wrap && !!wrap.querySelector(".dragon-img"),
      scene: scene?.dataset.scene,
    };
  });
  check("Dragon renders (emoji / PNG art)", "true", String(dragon.hasDragon), dragon.hasDragon);
  check("Default scene = plain", "plain", dragon.scene, dragon.scene === "plain");

  // buy a hat and confirm it lands on the dragon
  await page.locator('.gel-tab[data-tab="shop"]').click();
  await page.waitForTimeout(250);
  const cap = page.locator('.gel-shop-item[data-item="item_cap"] button', { hasText: "Buy" });
  if ((await cap.count()) > 0) {
    await cap.click();
    await page.waitForTimeout(300);
  }
  const wornAfter = await page.evaluate(() => {
    return { hasHat: !!document.querySelector("#dragon-art .dragon-wear--hat") };
  });
  check("Buying a hat puts it on the dragon", "true", String(wornAfter.hasHat), wornAfter.hasHat);

  // buy the Lava Lair and confirm the scene changes
  const lair = page.locator('.gel-shop-item[data-item="item_lair"] button', { hasText: "Buy" });
  if ((await lair.count()) > 0) {
    await lair.click();
    await page.waitForTimeout(300);
  }
  const scene2 = await page.evaluate(() => document.querySelector(".gel-scene")?.dataset.scene);
  check("Buying a home changes the scene", "lava", scene2, scene2 === "lava");
}

// ============================ score / credit trajectory ============================
{
  await page.locator('.gel-tab[data-tab="score"]').click();
  await page.waitForTimeout(250);

  const score = await page.evaluate(() => ({
    num: document.querySelector(".gel-score-num")?.textContent.trim() || "",
    hero: document.querySelector(".gel-badge--hero")?.textContent.trim() || "",
    buckets: document.querySelectorAll(".gel-bucket").length,
    factors: document.querySelectorAll(".gel-factor-row").length,
    text: document.body.innerText,
  }));
  check("Score shows 612", "612", score.num, score.num.startsWith("612"));
  check("Score source = Equifax", "Equifax", score.hero, /Equifax/.test(score.hero));
  check("Three buckets (score/cash/fees)", "3", String(score.buckets), score.buckets === 3);
  check("Four bureau factors", "4", String(score.factors), score.factors === 4);
  check("BNPL shows Afterpay + Zip", "both", [score.text.includes("Afterpay"), score.text.includes("Zip")].every(Boolean) ? "both" : "missing", score.text.includes("Afterpay") && score.text.includes("Zip"));
  check("Forecast is a range", "635–650", score.text.includes("635") && score.text.includes("650") ? "635–650" : "missing", score.text.includes("635") && score.text.includes("650"));
  check("Predicted-vs-actual loop present", "present", score.text.includes("We predicted") ? "present" : "missing", score.text.includes("We predicted"));

  const overflow = await page.evaluate(() => {
    const phone = document.querySelector(".phone");
    const pr = phone.getBoundingClientRect();
    const out = [];
    phone.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > pr.right + 1 || r.left < pr.left - 1) out.push((el.className || el.tagName).toString().slice(0, 30));
    });
    return out.slice(0, 6);
  });
  check("Score tab: no horizontal overflow", "[]", JSON.stringify(overflow), overflow.length === 0);

  // protected balance action
  const pb = page.locator('button.gel-btn-primary', { hasText: "Set a protected balance" });
  check("Protected balance CTA present", "present", (await pb.count()) > 0 ? "present" : "missing", (await pb.count()) > 0);
  if ((await pb.count()) > 0) {
    await pb.click();
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("credit-dragon:state")));
    check("Protected balance toggled in state", "true", String(st.protected), st.protected === true);
  }
}

// ============================ GEL reference page ============================
{
  const p2 = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await p2.goto(fileUrl("gel-reference.html"));
  await p2.waitForTimeout(600);
  const ref = await p2.evaluate(() => {
    const btn = document.querySelector(".gelref button");
    const cell = document.querySelector(".gelref .flexi");
    const bd = document.querySelector(".gelref .badge");
    return {
      btn: btn ? getComputedStyle(btn).height : null,
      cell: cell ? getComputedStyle(cell).borderRadius : null,
      badge: bd ? getComputedStyle(bd).height : null,
    };
  });
  check("GEL reference Button height 42px", "42px", ref.btn, ref.btn === "42px");
  check("GEL reference FlexiCell radius 8px", "8px", ref.cell, ref.cell === "8px");
  check("GEL reference Badge height 20px", "20px", ref.badge, ref.badge === "20px");
  await p2.close();
}

await browser.close();

const passed = report.filter((r) => r.ok).length;
console.log("\n========== AUDIT: " + passed + "/" + report.length + " passed ==========");
for (const r of report) {
  console.log((r.ok ? "  OK  " : " FAIL ") + r.name);
  if (!r.ok) console.log("        expected: " + r.expected + "\n        actual:   " + r.actual);
}
console.log("\nRuntime errors (excluding intentional dragon/shop art fallbacks):");
console.log(errors.length ? errors.slice(0, 12).join("\n") : "(none)");
if (passed !== report.length) process.exitCode = 1;
