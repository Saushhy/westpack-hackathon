/**
 * Captures the key screens of the prototype into %TEMP%/opencode/cd-shots.
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
await page.waitForTimeout(900);

// score (default tab)
await shot("00-score");

// insights
await page.locator('.gel-tab[data-tab="insights"]').click();
await page.waitForTimeout(300);
await shot("01-insights");

// one finding, opened as a sheet
await page.locator(".gel-row-link:not(.gel-row-link--tile)").first().click();
await page.waitForTimeout(500);
await shot("02-insight-sheet");
await page.keyboard.press("Escape");
await page.waitForTimeout(250);

// goals (self-filling, no buttons)
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(300);
await shot("03-goals");

// back to score: movements behind Afterpay
await page.locator('.gel-tab[data-tab="score"]').click();
await page.waitForTimeout(300);
await page.locator(".gel-row-link--tile").first().click();
await page.waitForTimeout(500);
await shot("04-movements");
await page.keyboard.press("Escape");
await page.waitForTimeout(250);

// what moves your score
await page.locator('button:has-text("What moves your score")').click();
await page.waitForTimeout(500);
await shot("05-factors");
await page.keyboard.press("Escape");
await page.waitForTimeout(250);

// dragon (plain scene)
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(300);
await shot("06-dragon");

// shop
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(300);
await shot("07-shop");

// grant coins, buy a hat + cave, view the dragon dressed
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("credit-dragon:state"));
  s.coins = 1200;
  localStorage.setItem("credit-dragon:state", JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(300);
await page.locator('.gel-shop-item[data-item="item_cap"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(250);
await page.locator('.gel-shop-item[data-item="item_cave"] button', { hasText: "Buy" }).click();
await page.waitForTimeout(300);
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(350);
await shot("08-dragon-dressed");

// evolution: sit just below 800, then act on one finding
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("credit-dragon:state"));
  s.xp_total = 790;
  localStorage.setItem("credit-dragon:state", JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(800);
await page.locator('.gel-tab[data-tab="insights"]').click();
await page.waitForTimeout(300);
await page.locator(".gel-row-link:not(.gel-row-link--tile)").first().click();
await page.waitForTimeout(400);
await page.locator(".gel-sheet-actions .gel-btn-primary").click();
await page.waitForTimeout(700);
if ((await page.locator(".gel-dialog").count()) > 0) {
  await shot("09-evolution");
  await page.locator(".gel-dialog .gel-btn-primary", { hasText: "Continue" }).click();
}

// the AR moment: dragon placed in the room, saying a real line
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(300);
await page.locator('button:has-text("See it in your room")').click();
await page.waitForTimeout(1500);
await phone.screenshot({ path: join(OUT, "10-ar.png") });
console.log("saved 10-ar.png");
await page.locator(".gel-ar-controls .gel-btn-primary").click();
await page.waitForTimeout(200);

await browser.close();
console.log("shots written to", OUT);
