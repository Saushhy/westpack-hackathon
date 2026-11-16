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

// score (default tab)
await shot("00-score");

// insights
await page.locator('.gel-tab[data-tab="insights"]').click();
await page.waitForTimeout(250);
await shot("01-insights");

// one insight opened ("how we know this")
await page.locator(".gel-why summary").first().click();
await page.waitForTimeout(200);
await shot("02-insight-detail");

// goals
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(250);
await shot("03-goals");

// dragon (plain scene)
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(250);
await shot("04-dragon");

// shop
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(250);
await shot("05-shop");

// grant coins, buy a hat + cave, view dragon dressed
await page.evaluate(() => {
  localStorage.setItem(
    "credit-dragon:state",
    JSON.stringify({
      version: 2,
      xp_total: 320,
      coins: 1200,
      streak_weeks: 3,
      protected: false,
      bills: {},
      goals: {},
      shop: { owned: [], equipped: { hat: null, face: null, neck: null, home: null }, feeds: 0, fed_at: null },
      choices: {},
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
await page.locator('.gel-shop-item[data-item="item_cave"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(250);
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(300);
await shot("06-dragon-dressed");

// evolution (drop XP just below 800, complete a manual goal)
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("credit-dragon:state"));
  s.xp_total = 720;
  localStorage.setItem("credit-dragon:state", JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(250);
await page.locator('button.gel-btn-primary', { hasText: "Mark done" }).first().click();
await page.waitForTimeout(500);
const dlg = await page.locator(".gel-dialog").count();
if (dlg > 0) {
  await shot("07-evolution");
  await page.locator(".gel-btn-primary", { hasText: "Continue" }).click();
  await page.waitForTimeout(150);
}

await browser.close();
console.log("shots written to", OUT);
