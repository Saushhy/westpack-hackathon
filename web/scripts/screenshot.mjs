/**
 * Captures the key screens of the prototype into %TEMP%/opencode/cd-shots for review.
 *   npm run shots
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const fileUrl = (p) => "file:///" + join(webRoot, p).replace(/\\/g, "/");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = join(tmpdir(), "opencode", "cd-shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 980 } });
await page.goto(fileUrl("index.html"));
await page.waitForTimeout(800);

const phone = page.locator(".phone");
const shot = async (name) => {
  await phone.screenshot({ path: join(OUT, name + ".png") });
  console.log("saved", name + ".png");
};

// clean state
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(800);

await shot("01-bills");

// a single-bill review sheet
await page.locator('button.gel-btn-primary', { hasText: "Review change" }).first().click();
await page.waitForTimeout(350);
await shot("02-review-sheet");
await page.locator(".gel-sheet-close").click();
await page.waitForTimeout(150);

// streaming group review
await page.locator("button", { hasText: "Review 2 cancellations" }).first().click();
await page.waitForTimeout(350);
await shot("03-streaming-review");
await page.locator(".gel-sheet-close").click();
await page.waitForTimeout(150);

// goals
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(250);
await shot("04-goals");

// dragon (plain scene, no gear)
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(250);
await shot("05-dragon");

// shop
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(250);
await shot("06-shop");

// buy cap + scarf + lair (grant coins first), then view dragon dressed
await page.evaluate(() => {
  localStorage.setItem(
    "credit-dragon:state",
    JSON.stringify({
      version: 2,
      xp_total: 320,
      coins: 1200,
      streak_weeks: 3,
      bills: {},
      goals: {},
      shop: { owned: [], equipped: { hat: null, face: null, neck: null, home: null }, feeds: 0, fed_at: null },
      choices: { rec_streaming: "bill_netflix" },
      awarded: [],
      ledger: []
    })
  );
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(250);
await page.locator('.gel-shop-item[data-item="item_cap"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(200);
await page.locator('.gel-shop-item[data-item="item_scarf"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(200);
await page.locator('.gel-shop-item[data-item="item_lair"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(250);
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(300);
await shot("07-dragon-dressed");

// evolution modal (drop XP just below the teen threshold, then complete one goal)
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("credit-dragon:state"));
  s.xp_total = 720;
  localStorage.setItem("credit-dragon:state", JSON.stringify(s));
});await page.reload();
await page.waitForTimeout(800);
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(250);
for (let i = 0; i < 6; i++) {
  const b = page.locator('button.gel-btn-primary', { hasText: "Mark done" }).first();
  if ((await b.count()) === 0) break;
  await b.click();
  await page.waitForTimeout(250);
  const dlg = page.locator(".gel-dialog");
  if ((await dlg.count()) > 0) {
    await shot("08-evolution");
    await page.locator(".gel-btn-primary", { hasText: "Continue" }).click();
    await page.waitForTimeout(150);
    break;
  }
}

await browser.close();
console.log("shots written to", OUT);
