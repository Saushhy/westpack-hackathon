import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexUrl = "file:///" + join(__dirname, "..", "index.html").replace(/\\/g, "/");
const outDir = "C:/Users/Santiago/AppData/Local/Temp/opencode/cd-shots";
mkdirSync(outDir, { recursive: true });

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const errors = [];
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 960 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console.error] " + m.text());
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("requestfailed", (r) => errors.push("[requestfailed] " + r.url() + " :: " + (r.failure()?.errorText || "?")));

const phone = page.locator(".phone");
const shot = (name) => phone.screenshot({ path: join(outDir, name + ".png") });

await page.goto(indexUrl);
await page.waitForTimeout(900);

// full desktop stage + bills (initial)
await page.screenshot({ path: join(outDir, "00-stage.png") });
await shot("01-bills");

// open "why" on the first actionable bill
await page.locator("details.gel-why summary").first().click();
await page.waitForTimeout(300);
await shot("02-bills-why");

// approve all 5 actionable bills one by one
for (let i = 0; i < 5; i++) {
  const btn = page.locator('button.gel-btn-primary', { hasText: "Approve" }).first();
  if ((await btn.count()) === 0) break;
  await btn.click();
  await page.waitForTimeout(550);
}
await shot("03-bills-approved");

// goals tab
await page.locator('.gel-tab[data-tab="goals"]').click();
await page.waitForTimeout(450);
await shot("04-goals");

// complete the "cut bills" goal (ready) -> evolution modal
await page.locator('button.gel-btn-primary', { hasText: "Complete goal" }).first().click();
await page.waitForTimeout(900);
await shot("05-evolution");

await page.locator('button', { hasText: "Nice!" }).first().click();
await page.waitForTimeout(250);

// complete remaining 2 goals
for (let i = 0; i < 2; i++) {
  const btn = page.locator('button.gel-btn-primary', { hasText: "Mark done" }).first();
  if ((await btn.count()) === 0) break;
  await btn.click();
  await page.waitForTimeout(350);
}
await shot("06-goals-done");

// dragon tab
await page.locator('.gel-tab[data-tab="dragon"]').click();
await page.waitForTimeout(450);
await shot("07-dragon");

// shop tab
await page.locator('.gel-tab[data-tab="shop"]').click();
await page.waitForTimeout(450);
await shot("08-shop");

// buy an affordable item
const buy = page.locator('button.gel-btn-primary', { hasText: "Buy" }).first();
if ((await buy.count()) > 0) {
  await buy.click();
  await page.waitForTimeout(400);
  await shot("09-shop-bought");
}

await browser.close();
console.log("OUT_DIR", outDir);
console.log("ERRORS", errors.length ? "\n" + errors.join("\n") : "(none)");
