import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = "file:///" + join(__dirname, "..", "index.html").replace(/\\/g, "/");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const errors = [];
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 960 } });
page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/assets\/(shop|dragon)\/.*\.png/.test(u)) errors.push("[requestfailed] " + u + " :: " + (r.failure()?.errorText || "?"));
});

await page.goto(url);
await page.waitForTimeout(900);

const report = [];
const check = (name, expected, actual, ok) => report.push({ name, expected, actual, ok });

// ---- helper: computed style of a selector ----
const cs = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const c = getComputedStyle(el);
  return { bg: c.backgroundColor, color: c.color, radius: c.borderRadius, border: c.borderColor, font: c.fontFamily, bgImage: c.backgroundImage };
}, sel);

// ---- 1. header is light (Westpac app look) ----
{
  const top = await cs(".gel-topbar");
  check("Header background is white", "rgb(255, 255, 255)", top?.bg, top?.bg === "rgb(255, 255, 255)");
  const brand = await cs(".gel-brand");
  check("Wordmark colour = GEL hero navy #1f1c4f", "rgb(31, 28, 79)", brand?.color, brand?.color === "rgb(31, 28, 79)");
  const logo = await page.evaluate(() => { const e = document.querySelector(".gel-logo"); return e ? e.tagName + ":" + e.naturalWidth : "missing"; });
  check("Real Westpac logo <img> loaded", "IMG:>0", logo, /^IMG:/.test(logo) && Number(logo.split(":")[1]) > 0);
}

// ---- 2. primary button = GEL red ----
{
  const btn = await cs(".gel-btn-primary");
  check("Primary button = GEL red #da1710", "rgb(218, 23, 16)", btn?.bg, btn?.bg === "rgb(218, 23, 16)");
}

// ---- 3. card geometry = GEL (8px radius, hairline #dedee1) ----
{
  const card = await cs(".gel-card:not(.gel-banner)");
  check("Card radius = 8px (GEL rounded-2xl)", "8px", card?.radius, card?.radius === "8px");
  check("Card border = GEL muted-soft #dedee1", "rgb(222, 222, 225)", card?.border, card?.border === "rgb(222, 222, 225)");
  const btn = await cs(".gel-btn-primary");
  check("Button radius = 5px (GEL rounded-lg)", "5px", btn?.radius, btn?.radius === "5px");
  const btnH = await page.evaluate(() => getComputedStyle(document.querySelector(".gel-btn-primary")).height);
  check("Button height = 42px (GEL large)", "42px", btnH, btnH === "42px");
}

// ---- 4. savings banner uses hero navy gradient ----
{
  const banner = await page.evaluate(() => {
    const el = document.querySelector(".gel-banner");
    return el ? getComputedStyle(el).backgroundImage : null;
  });
  const ok = banner && banner.includes("linear-gradient") && banner.includes("31, 28, 79");
  check("Banner = hero navy gradient (GEL hero)", "linear-gradient(...#1f1c4f)", (banner || "").slice(0, 60), !!ok);
}

// ---- 5. tab active = red ----
{
  const active = await cs(".gel-tab.active");
  check("Active tab colour = GEL red", "rgb(218, 23, 16)", active?.color, active?.color === "rgb(218, 23, 16)");
}

// ---- 6. font stack = GEL fallback ----
{
  const font = (await cs("body"))?.font;
  check("Font stack includes Segoe UI (GEL fallback)", "…'Segoe UI'…", font, /Segoe UI/.test(font || ""));
}

// ---- 7. icons actually render (inlined SVG) ----
{
  const n = await page.evaluate(() => document.querySelectorAll(".gel-ico svg").length);
  check("Icons render (≥12 on Bills tab: 8 cards + 4 tabs)", ">=12", n, n >= 12);
  const tabIcons = await page.evaluate(() => [...document.querySelectorAll(".gel-tab .gel-ico")].map(e => e.querySelector("svg") ? "ok" : "MISSING"));
  check("All 4 tab icons present", "ok,ok,ok,ok", tabIcons.join(","), tabIcons.every(x => x === "ok"));
}

// ---- 8. horizontal overflow within 390px phone ----
{
  const bad = await page.evaluate(() => {
    const phone = document.querySelector(".phone");
    const pr = phone.getBoundingClientRect();
    const out = [];
    phone.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > pr.right + 1 || r.left < pr.left - 1) {
        const c = el.className && typeof el.className === "string" ? el.className : el.tagName;
        out.push((c || el.tagName) + " left=" + Math.round(r.left - pr.left) + " right=" + Math.round(r.right - pr.left));
      }
    });
    return out.slice(0, 15);
  });
  check("No element overflows the 390px phone", "[]", JSON.stringify(bad), bad.length === 0);
}

// ---- 9. contrast (WCAG) ----
{
  const ratios = await page.evaluate(() => {
    const lum = (rgb) => {
      const m = rgb.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
    };
    const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return ((hi + 0.05) / (lo + 0.05)).toFixed(1); };
    const body = getComputedStyle(document.body).color;
    const muted = getComputedStyle(document.querySelector(".gel-card:not(.gel-banner) .gel-muted")).color;
    const red = "rgb(218, 23, 16)";
    return {
      bodyOnWhite: contrast(body, "rgb(255, 255, 255)"),
      mutedOnWhite: contrast(muted, "rgb(255, 255, 255)"),
      whiteOnRed: contrast("rgb(255, 255, 255)", red)
    };
  });
  check("Body text contrast (≥4.5)", ">=4.5", ratios.bodyOnWhite + ":1", Number(ratios.bodyOnWhite) >= 4.5);
  check("Muted text contrast (≥4.5)", ">=4.5", ratios.mutedOnWhite + ":1", Number(ratios.mutedOnWhite) >= 4.5);
  check("Button label contrast (white on red ≥4.5)", ">=4.5", ratios.whiteOnRed + ":1", Number(ratios.whiteOnRed) >= 4.5);
}

// ---- 10. end-to-end gamification numbers ----
{
  for (let i = 0; i < 5; i++) {
    const b = page.locator('button.gel-btn-primary', { hasText: "Approve" }).first();
    if ((await b.count()) === 0) break;
    await b.click();
    await page.waitForTimeout(120);
  }
  await page.locator('.gel-tab[data-tab="goals"]').click();
  await page.waitForTimeout(120);
  await page.locator('button.gel-btn-primary', { hasText: "Complete goal" }).first().click();
  await page.waitForTimeout(150);
  await page.locator('button', { hasText: "Nice!" }).first().click();
  await page.waitForTimeout(100);
  for (let i = 0; i < 2; i++) {
    const b = page.locator('button.gel-btn-primary', { hasText: "Mark done" }).first();
    if ((await b.count()) === 0) break;
    await b.click();
    await page.waitForTimeout(120);
  }
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("credit-dragon:state")));
  check("Final XP = 1080", 1080, st.xp_total, st.xp_total === 1080);
  check("Final coins = 600", 600, st.coins, st.coins === 600);
  check("Stage = teen", "teen", st && (st.xp_total >= 800 ? "teen" : "baby"), st.xp_total >= 800);
  check("No duplicate awards (ledger vs awarded)", "0 dups", (() => { const seen = new Set(st.awarded); return seen.size === st.awarded.length ? "0 dups" : (st.awarded.length - seen.size) + " dups"; })(), new Set(st.awarded).size === st.awarded.length);
}

await browser.close();

// ---- print ----
const passed = report.filter((r) => r.ok).length;
console.log("\n========== AUDIT: " + passed + "/" + report.length + " passed ==========");
for (const r of report) {
  console.log((r.ok ? "  OK  " : " FAIL ") + r.name);
  if (!r.ok) console.log("        expected: " + r.expected + "\n        actual:   " + r.actual);
}
console.log("\nRuntime errors (excluding known-missing shop/dragon art):");
console.log(errors.length ? errors.slice(0, 12).join("\n") : "(none)");
