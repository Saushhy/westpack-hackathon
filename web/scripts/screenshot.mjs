/**
 * Captures the key screens of the prototype into %TEMP%/opencode/cd-shots.
 *   npm run shots
 *
 * The order follows the pitch: score, the find, the evidence, the plan, the
 * dragon hatching out of the egg, then the AR moment.
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
await page.addInitScript(() => { window.CD_SKIP_ONBOARDING = true; });
await page.goto(fileUrl("index.html"));
await page.waitForTimeout(800);

const phone = page.locator(".phone");
const shot = async (name) => {
  await phone.screenshot({ path: join(OUT, name + ".png") });
  console.log("saved", name + ".png");
};
const tab = async (name) => {
  await page.locator(`.gel-tab[data-tab="${name}"]`).click();
  await page.waitForTimeout(280);
};
const setState = async (patch) => {
  await page.evaluate((p) => {
    const s = JSON.parse(localStorage.getItem("credit-dragon:state"));
    Object.assign(s, p);
    localStorage.setItem("credit-dragon:state", JSON.stringify(s));
  }, patch);
  await page.reload();
  await page.waitForTimeout(800);
};

// ---------- fresh demo state: 550 XP, still an egg ----------
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(900);

await shot("00-score");

await tab("insights");
await shot("01-insights");

await page.locator(".gel-bill--tap").first().click();
await page.waitForTimeout(500);
await shot("02-insight-sheet");
await page.keyboard.press("Escape");
await page.waitForTimeout(220);

await tab("goals");
await shot("03-goals");

await tab("score");
await page.locator(".gel-acc").first().click();
await page.waitForTimeout(500);
await shot("04-movements");
await page.keyboard.press("Escape");
await page.waitForTimeout(220);

await page.locator('button:has-text("How your score is built")').click();
await page.waitForTimeout(500);
await shot("05-factors");
await page.keyboard.press("Escape");
await page.waitForTimeout(220);

// ---------- the egg ----------
await tab("dragon");
await shot("06-dragon-egg");

// ---------- hatch it: 10 XP short, then act on one finding ----------
await setState({ xp_total: 790 });
await tab("insights");
await page.locator(".gel-bill--tap").first().click();
await page.waitForTimeout(400);
await page.locator(".gel-sheet-actions .gel-btn-primary").click();
await page.waitForTimeout(800);
await shot("07-evolution");
if ((await page.locator(".gel-dialog").count()) > 0) {
  await page.locator(".gel-dialog .gel-btn-primary", { hasText: "Continue" }).click();
  await page.waitForTimeout(400);
}

// ---------- the baby dragon ----------
await tab("dragon");
await shot("08-dragon");

await tab("shop");
await shot("09-shop");

await setState({ coins: 1200 });
await tab("shop");
await page.locator('.gel-shop-row[data-item="item_cap"]').click();
await page.waitForTimeout(350);
await page.locator(".gel-sheet-actions .gel-btn-primary").click();
await page.waitForTimeout(300);
await page.locator('.gel-shop-row[data-item="item_cave"]').click();
await page.waitForTimeout(350);
await page.locator(".gel-sheet-actions .gel-btn-primary").click();
await page.waitForTimeout(350);
await tab("dragon");
await shot("10-dragon-dressed");

// ---------- AR moment: dragon placed in the room, saying a real line ----------
await page.locator('button:has-text("See it in your room")').click();
await page.waitForTimeout(1500);
await shot("11-ar");
await page.locator(".gel-ar-done").click();
await page.waitForTimeout(200);

// ---------- the other three personas, generated from Carlos's data ----------
let personaShot = 12;
for (const name of ["marcus", "elena", "david"]) {
  const pp = await browser.newPage({ viewport: { width: 480, height: 980 } });
  await pp.addInitScript(() => { window.CD_SKIP_ONBOARDING = true; });
  await pp.goto(fileUrl(name + ".html"));
  await pp.waitForTimeout(900);
  const ph = pp.locator(".phone");
  await ph.screenshot({ path: join(OUT, personaShot + "-" + name + "-score.png") });
  await pp.locator('.gel-tab[data-tab="insights"]').click();
  await pp.waitForTimeout(350);
  await ph.screenshot({ path: join(OUT, personaShot + "-" + name + "-insights.png") });
  await pp.close();
  console.log("saved", personaShot + "-" + name + "-score.png and -insights.png");
  personaShot++;
}

await browser.close();
console.log("shots written to", OUT);
