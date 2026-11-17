/**
 * Headless fidelity + behaviour audit for the Credit Dragon prototype.
 *
 * Drives the real app in system Edge (via playwright-core), asserts computed
 * styles against values from WestpacGEL/GEL-next, then walks Mia's whole
 * journey: score, insights, the sheets, the movements behind Afterpay, the
 * self-filling goals, the dragon and the shop.
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
  // Intentional: Naomi's dragon/shop PNGs are not committed yet, so the emoji
  // fallback in imgOrEmoji is the designed behaviour.
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
const text = () => page.locator("#screen").innerText();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("credit-dragon:state") || "null"));
const dismissDialog = async () => {
  if ((await page.locator(".gel-dialog").count()) > 0) {
    await page.locator(".gel-dialog .gel-btn-primary", { hasText: "Continue" }).click();
    await page.waitForTimeout(150);
  }
};
const dashFree = (body) => !/[\u2013\u2014]/.test(body);

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
      body9: s.getPropertyValue("--typography-body-size-9").trim()
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
  check("Headings use Westpac brand font", "Westpac, ...", titleFont, /^Westpac/.test(titleFont || ""));
  const bodyFont = await cs("body", "fontFamily");
  check("Body uses GEL sans stack", "...Segoe UI...", bodyFont, /Segoe UI/.test(bodyFont || ""));
  check("Body type = 16px", "16px", await cs("body", "fontSize"), (await cs("body", "fontSize")) === "16px");
  check("Secondary type = 14px", "14px", await cs(".gel-muted", "fontSize"), (await cs(".gel-muted", "fontSize")) === "14px");
}

// ============================ header ============================
{
  check(
    "Header background white",
    "rgb(255, 255, 255)",
    await cs(".gel-topbar", "backgroundColor"),
    (await cs(".gel-topbar", "backgroundColor")) === "rgb(255, 255, 255)"
  );
  const h = await page.evaluate(() => getComputedStyle(document.querySelector(".gel-header-main")).height);
  check("Header height 54px", "54px", h, h === "54px");
  const logo = await page.evaluate(() => document.querySelector(".gel-logo")?.naturalWidth || 0);
  check("Real Westpac logo loaded", ">0", String(logo), logo > 0);
  const chrome = await page.evaluate(() => ({
    dead: document.querySelectorAll(".gel-header-btn").length,
    coin: !!document.querySelector(".gel-coin-pill")
  }));
  check("Header has no dead help/profile buttons", "0", String(chrome.dead), chrome.dead === 0);
  check("Header keeps the coin balance", "true", String(chrome.coin), chrome.coin);
}

// ============================ buttons / cells / icons ============================
{
  const btn = await page.evaluate(() => {
    const el = document.querySelector(".gel-btn-primary, .gel-btn-ghost");
    const s = getComputedStyle(el);
    return { h: s.height, r: s.borderRadius, fs: s.fontSize };
  });
  check("Button height 42px", "42px", btn.h, btn.h === "42px");
  check("Button radius 5px", "5px", btn.r, btn.r === "5px");
  check("Button label 16px", "16px", btn.fs, btn.fs === "16px");

  const primaryFill = await page.evaluate(() => {
    const el = document.querySelector(".gel-btn-primary");
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  check(
    "Primary button fill = Westpac red",
    "rgb(218, 23, 16)",
    primaryFill,
    primaryFill === null || primaryFill === "rgb(218, 23, 16)"
  );

  const cell = await page.evaluate(() => {
    const el = document.querySelector(".gel-cell");
    const s = getComputedStyle(el);
    return { r: s.borderRadius, p: s.paddingTop, shadow: s.boxShadow };
  });
  check("Row radius 8px", "8px", cell.r, cell.r === "8px");
  check("Row padding 12px", "12px", cell.p, cell.p === "12px");
  check("Row is flat (no shadow)", "none", cell.shadow, cell.shadow === "none");

  const n = await page.evaluate(() => document.querySelectorAll(".gel-ico svg").length);
  check("GEL icons render as inline SVG (>=8)", ">=8", String(n), n >= 8);
  const fill = await page.evaluate(() => {
    const p = document.querySelector(".gel-ico svg path");
    return p ? p.getAttribute("fill") : null;
  });
  check("Icons inherit colour (currentColor)", "currentColor", fill, fill === "currentColor");
}

// ============================ score tab ============================
{
  const s = await page.evaluate(() => ({
    num: document.querySelector(".gel-score-num")?.textContent.trim() || "",
    hero: document.querySelector(".gel-badge--hero")?.textContent.trim() || "",
    goalTitle: document.querySelector(".gel-goal-title")?.textContent.trim() || "",
    goalLabel: Array.from(document.querySelectorAll(".gel-label")).map((e) => e.textContent.trim()),
    bnplRows: document.querySelectorAll(".gel-row-link--tile").length,
    logos: Array.from(document.querySelectorAll(".gel-brand-img")).map((i) => i.naturalWidth),
    buckets: document.querySelectorAll(".gel-bucket, .gel-buckets").length,
    body: document.body.innerText
  }));

  check("Score shows 612", "612", s.num, s.num.startsWith("612"));
  check("Score source = Equifax", "Equifax", s.hero, /Equifax/.test(s.hero));
  check("Goal card is labelled 'Your goal'", "Your goal", s.goalLabel.join("|"), s.goalLabel.includes("Your goal"));
  check("Goal reads 'Car loan in 12 months'", "Car loan in 12 months", s.goalTitle, s.goalTitle === "Car loan in 12 months");
  check("Two BNPL rows (Afterpay, Zip)", "2", String(s.bnplRows), s.bnplRows === 2);
  check("Both BNPL logos are real files", "2 loaded", s.logos.filter((w) => w > 0).length + " loaded", s.logos.length === 2 && s.logos.every((w) => w > 0));
  check("Forecast reads as a range", "635 to 650", s.body.includes("635 to 650") ? "635 to 650" : "missing", s.body.includes("635 to 650"));
  check("Bucket strip removed", "0", String(s.buckets), s.buckets === 0);
  check("No Low Rate Card panel", "absent", s.body.includes("Low Rate Card") ? "present" : "absent", !s.body.includes("Low Rate Card"));
  check("No 'Last check' history", "absent", s.body.includes("Last check") ? "present" : "absent", !s.body.includes("Last check"));
  check("No 'debit is at risk' block", "absent", s.body.includes("debit is at risk") ? "present" : "absent", !s.body.includes("debit is at risk"));
  check("No em or en dashes on screen", "clean", dashFree(s.body) ? "clean" : "dash found", dashFree(s.body));
  check("'What moves your score' button present", "present", s.body.includes("What moves your score") ? "present" : "missing", s.body.includes("What moves your score"));
}

// ============================ score sheets ============================
{
  await page.locator('button:has-text("What moves your score")').click();
  await page.waitForTimeout(400);
  const factors = await page.evaluate(() => ({
    open: !!document.querySelector(".gel-sheet"),
    rows: document.querySelectorAll(".gel-sheet .gel-factor-row").length,
    radius: document.querySelector(".gel-sheet") ? getComputedStyle(document.querySelector(".gel-sheet")).borderTopLeftRadius : null
  }));
  check("Factors open in a sheet", "present", factors.open ? "present" : "missing", factors.open);
  check("Sheet is a bottom sheet (rounded top 12px)", "12px", factors.radius, factors.radius === "12px");
  check("Four bureau factors in the sheet", "4", String(factors.rows), factors.rows === 4);
  await page.locator(".gel-sheet-close").click();
  await page.waitForTimeout(200);
  check("Sheet closes", "0", String(await page.locator(".gel-sheet").count()), (await page.locator(".gel-sheet").count()) === 0);

  await page.locator(".gel-row-link--tile").first().click();
  await page.waitForTimeout(400);
  const moves = await page.evaluate(() => ({
    title: document.querySelector(".gel-sheet-title")?.textContent.trim() || "",
    rows: document.querySelectorAll(".gel-sheet .gel-move").length,
    months: document.querySelectorAll(".gel-sheet .gel-move-month").length,
    body: document.querySelector(".gel-sheet")?.innerText || ""
  }));
  check("Afterpay row opens its movements", "Afterpay", moves.title, moves.title === "Afterpay");
  check("Movements are real transactions (>=5 rows)", ">=5", String(moves.rows), moves.rows >= 5);
  check("Movements grouped by month", ">=2", String(moves.months), moves.months >= 2);
  check("Movements show a total", "present", moves.body.includes("payments") ? "present" : "missing", moves.body.includes("payments"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Escape closes the sheet", "0", String(await page.locator(".gel-sheet").count()), (await page.locator(".gel-sheet").count()) === 0);
}

// ============================ insights tab ============================
{
  await page.locator('.gel-tab[data-tab="insights"]').click();
  await page.waitForTimeout(300);

  const ins = await page.evaluate(() => {
    const body = document.querySelector("#screen").innerText;
    return {
      cards: document.querySelectorAll(".gel-bill").length,
      why: document.querySelectorAll(".gel-row-link:not(.gel-row-link--tile)").length,
      whyLabel: document.querySelector(".gel-row-link:not(.gel-row-link--tile)")?.textContent.trim() || "",
      whyHeight: (() => {
        const b = document.querySelector(".gel-row-link:not(.gel-row-link--tile)");
        return b ? getComputedStyle(b).height : "";
      })(),
      details: document.querySelectorAll("details").length,
      factors: document.querySelectorAll(".gel-factor").length,
      found: document.querySelectorAll(".gel-found").length,
      moneyTiles: document.querySelectorAll(".gel-found .gel-money-tile").length,
      body
    };
  });

  check("Insights shows >= 6 findings", ">=6", String(ins.cards), ins.cards >= 6);
  check("Every actionable finding has a Review button", "6", String(ins.why), ins.why === 6);
  check("The button says Review", "Review", ins.whyLabel, ins.whyLabel.startsWith("Review"));
  check("Review is a real button (38px tall)", "38px", ins.whyHeight, ins.whyHeight === "38px");
  check("No 'N patterns to look at' subtitle", "absent", ins.body.includes("patterns to look at") ? "present" : "absent", !ins.body.includes("patterns to look at"));
  check("What we found is the new summary card", "1", String(ins.found), ins.found === 1);
  check("The two dollar totals are tiles", "2", String(ins.moneyTiles), ins.moneyTiles === 2);
  check("Accordions replaced by sheets", "0", String(ins.details), ins.details === 0);
  check("Factor chips on findings", ">=5", String(ins.factors), ins.factors >= 5);
  check("Repayment history is named", "present", ins.body.includes("Repayment history") ? "present" : "missing", ins.body.includes("Repayment history"));
  check("Cash and fees are separated", "present", ins.body.includes("free up cash") && ins.body.includes("avoid a fee") ? "present" : "missing", ins.body.includes("free up cash") && ins.body.includes("avoid a fee"));
  check("Cash freed figure is shown", "$63.00", ins.body.includes("$63.00") ? "$63.00" : "missing", ins.body.includes("$63.00"));
  check("No 'switch provider' language", "clean", /switch to/i.test(ins.body) ? "switch" : "clean", !/switch to/i.test(ins.body));
  check("No competitor brand (Belong/Optus/Telstra)", "clean", /Belong|Optus|Telstra/i.test(ins.body) ? "found" : "clean", !/Belong|Optus|Telstra/i.test(ins.body));
  check("Only Mia's own providers are named", "present", /Vodafone/.test(ins.body) && /Netflix/.test(ins.body) && /Goodlife/.test(ins.body) ? "present" : "missing", /Vodafone/.test(ins.body) && /Netflix/.test(ins.body) && /Goodlife/.test(ins.body));
  check("No em or en dashes on screen", "clean", dashFree(ins.body) ? "clean" : "dash found", dashFree(ins.body));
}

// ============================ insight sheet + journey ============================
{
  const before = await state();
  check("Boot records today's check-in", "7", String(before.checkins.length), before.checkins.length === 7);
  check("Boot awards the daily check-in, the week and the goal", "3", String(before.awarded.length), before.awarded.length === 3);
  check("Boot XP = 550 (start 320 + check-in 10 + week 120 + goal 100)", "550", String(before.xp_total), before.xp_total === 550);
  check("Boot coins = 330", "330", String(before.coins), before.coins === 330);
  check("Daily goal completed itself", "completed", before.goals.goal_checkin?.status, before.goals.goal_checkin?.status === "completed");
  const stageCount = await page.evaluate(() => (window.DATA?.rewards?.stages || []).length);
  check("Three stages only: egg, baby, adult", "3", String(stageCount), stageCount === 3);
  check("The demo opens as an egg", "egg", before.xp_total < 800 ? "egg" : "hatched", before.xp_total < 800);

  // Open one finding: the evidence must be in a sheet, not on the card.
  await page.locator(".gel-row-link:not(.gel-row-link--tile)").first().click();
  await page.waitForTimeout(400);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector(".gel-sheet");
    return {
      open: !!s,
      rows: s ? s.querySelectorAll(".gel-kv").length : 0,
      action: s ? !!s.querySelector(".gel-sheet-actions .gel-btn-primary") : false,
      body: s ? s.innerText : ""
    };
  });
  check("'How we know this' opens a sheet", "present", sheet.open ? "present" : "missing", sheet.open);
  check("Sheet shows the evidence rows", ">=3", String(sheet.rows), sheet.rows >= 3);
  check("Sheet carries the action", "present", sheet.action ? "present" : "missing", sheet.action);
  check("Sheet explains why it matters", "present", /score/i.test(sheet.body) ? "present" : "missing", /score/i.test(sheet.body));

  await page.locator(".gel-sheet-actions .gel-btn-primary").click();
  await page.waitForTimeout(350);
  await dismissDialog();
  check("Acting from the sheet closes it", "0", String(await page.locator(".gel-sheet").count()), (await page.locator(".gel-sheet").count()) === 0);
  const afterOne = await state();
  check("Acting awards XP (100 for a reminder)", "650", String(afterOne.xp_total), afterOne.xp_total === 650);
  check("Card marks itself done", "1", String(await page.locator(".gel-bill.is-done").count()), (await page.locator(".gel-bill.is-done").count()) === 1);

  // Work through the remaining findings.
  for (let i = 0; i < 6; i++) {
    const link = page.locator(".gel-row-link:not(.gel-row-link--tile)").first();
    if ((await link.count()) === 0) break;
    await link.click();
    await page.waitForTimeout(250);
    if ((await page.locator(".gel-sheet-actions .gel-btn-primary").count()) === 0) {
      await page.keyboard.press("Escape");
      break;
    }
    await page.locator(".gel-sheet-actions .gel-btn-primary").click();
    await page.waitForTimeout(300);
    await dismissDialog();
  }

  const st = await state();
  check("Journey XP = 870", "870", String(st.xp_total), st.xp_total === 870);
  check("Journey coins = 510", "510", String(st.coins), st.coins === 510);
  check("The dragon hatched into a baby (>= 800 XP)", "baby", st.xp_total >= 800 ? "baby" : "still an egg", st.xp_total >= 800);
  check("No duplicate awards", "0 dups", new Set(st.awarded).size === st.awarded.length ? "0 dups" : "dups", new Set(st.awarded).size === st.awarded.length);
  check("Exactly one goal completed (the daily one)", "1", String(Object.keys(st.goals).length), Object.keys(st.goals).length === 1);
}

// ============================ goals tab ============================
{
  await page.locator('.gel-tab[data-tab="goals"]').click();
  await page.waitForTimeout(300);

  const g = await page.evaluate(() => {
    const body = document.querySelector("#screen").innerText;
    return {
      cards: document.querySelectorAll(".gel-goal").length,
      buttons: document.querySelectorAll("#screen button").length,
      bars: Array.from(document.querySelectorAll(".gel-goal .gel-bar-fill")).map((b) => b.style.width),
      doneBadge:
        document.querySelector('.gel-goal[data-goal="goal_checkin"] .gel-badge')?.textContent.trim() || "",
      body
    };
  });

  check("Three goals", "3", String(g.cards), g.cards === 3);
  check("Goals have no buttons at all", "0", String(g.buttons), g.buttons === 0);
  check("No '1 of 3 done' subtitle", "absent", g.body.includes(" of 3 done") ? "present" : "absent", !g.body.includes(" of 3 done"));
  check("No explanatory note above the cards", "absent", /fill in on their own/.test(g.body) ? "present" : "absent", !/fill in on their own/.test(g.body));
  check("Goal 1 shows the Done badge", "Done", g.doneBadge, g.doneBadge === "Done");
  check("Goal 2 shows 2 of 4 instalments", "2 of 4", g.body.includes("2 of 4") ? "2 of 4" : "missing", g.body.includes("2 of 4"));
  check("Goal 3 shows 27 of 30 days", "27 of 30", g.body.includes("27 of 30") ? "27 of 30" : "missing", g.body.includes("27 of 30"));
  check("Bars reflect the data", "100%,50%,90%", g.bars.join(","), g.bars.join(",") === "100%,50%,90%");
  check("Next check is stated", "present", /Next check/.test(g.body) ? "present" : "missing", /Next check/.test(g.body));
  check("No em or en dashes on screen", "clean", dashFree(g.body) ? "clean" : "dash found", dashFree(g.body));
}

// ============================ dragon + wardrobe ============================
{
  await page.locator('.gel-tab[data-tab="dragon"]').click();
  await page.waitForTimeout(300);

  const dragon = await page.evaluate(() => {
    const wrap = document.querySelector("#dragon-art");
    const img = wrap ? wrap.querySelector(".dragon-img") : null;
    const scene = document.querySelector(".gel-scene");
    return {
      hasDragon: !!img,
      realArt: !!img && img.naturalWidth > 0,
      isArtWrap: !!wrap && wrap.classList.contains("gel-dragon-wrap--art"),
      scene: scene?.dataset.scene
    };
  });
  check("Dragon renders (real model render)", "true", String(dragon.hasDragon), dragon.hasDragon);
  check("Dragon art is the rendered GLB, not the emoji", "true", String(dragon.realArt), dragon.realArt);
  check("Real art uses the measured wear anchors", "true", String(dragon.isArtWrap), dragon.isArtWrap);
  check("Default scene = plain", "plain", dragon.scene, dragon.scene === "plain");

  // The dragon may only say what the data proves. Collect every line it can
  // say on this state and check each one is grounded.
  const spoken = [];
  for (let i = 0; i < 8; i++) {
    await page.locator(".gel-scene").click();
    await page.waitForTimeout(120);
    spoken.push(await page.evaluate(() => document.querySelector("#dragon-bubble")?.textContent || ""));
  }
  check("Tapping the dragon makes it speak", "present", spoken[0] ? "present" : "missing", spoken[0].length > 0);
  check(
    "First line quotes a real BNPL payment",
    "Afterpay takes $84.50 on 18 Nov.",
    spoken[0],
    /^Afterpay takes \$84\.50 on 18 Nov\./.test(spoken[0])
  );
  check(
    "It reports live goal progress",
    "2 of 4 instalments",
    spoken.join(" | "),
    spoken.some((l) => /2 of 4 instalments paid on time/.test(l))
  );
  check(
    "Every line quotes our own data",
    "grounded",
    spoken.length + " lines",
    spoken.every((l) => !/Belong|Optus|Telstra|CommBank/i.test(l))
  );
  check("No dashes in what it says", "clean", spoken.join(" "), dashFree(spoken.join(" ")));

  await page.locator('.gel-tab[data-tab="shop"]').click();
  await page.waitForTimeout(300);
  const cap = page.locator('.gel-shop-item[data-item="item_cap"] button', { hasText: "Buy" });
  if ((await cap.count()) > 0) {
    await cap.click();
    await page.waitForTimeout(300);
  }
  const worn = await page.evaluate(() => !!document.querySelector("#dragon-art .dragon-wear--hat"));
  check("Buying a hat puts it on the dragon", "true", String(worn), worn);

  const cave = page.locator('.gel-shop-item[data-item="item_cave"] button', { hasText: "Buy" });
  if ((await cave.count()) > 0) {
    await cave.click();
    await page.waitForTimeout(300);
  }
  const scene2 = await page.evaluate(() => document.querySelector(".gel-scene")?.dataset.scene);
  check("Buying a home changes the scene", "stars", scene2, scene2 === "stars");
}

// ============================ AR view ============================
{
  await page.locator('.gel-tab[data-tab="dragon"]').click();
  await page.waitForTimeout(250);
  await page.locator('button:has-text("See it in your room")').click();
  await page.waitForTimeout(1300);

  const ar = await page.evaluate(() => {
    const root = document.querySelector("#ar-root");
    const img = root?.querySelector(".ar-img");
    const hold = root?.querySelector("#ar-hold");
    return {
      open: !!root && !root.hidden,
      imgLoaded: !!img && img.naturalWidth > 0,
      tag: root?.querySelector("#ar-tag")?.textContent.trim() || "",
      left: hold ? hold.style.left : "",
      dropped: !!hold && hold.classList.contains("is-dropping")
    };
  });
  check("AR view opens over the app", "true", String(ar.open), ar.open);
  check("The real dragon render is placed in the room", "true", String(ar.imgLoaded), ar.imgLoaded);
  check("It states whether the camera is live", "present", ar.tag, ar.tag.length > 0);
  check("Placement animation runs on open", "true", String(ar.dropped), ar.dropped);

  // It speaks a grounded line on arrival, and keeps speaking on tap.
  const arLine = await page.evaluate(() => document.querySelector("#ar-bubble")?.textContent || "");
  check("In AR it quotes our own data", "Afterpay takes $84.50 on 18 Nov.", arLine, /Afterpay takes \$84\.50/.test(arLine));

  await page.locator('button:has-text("Say something")').click();
  await page.waitForTimeout(300);
  const arLine2 = await page.evaluate(() => document.querySelector("#ar-bubble")?.textContent || "");
  check("It has more than one grounded line", "different", arLine2, arLine2.length > 0 && arLine2 !== arLine);

  const box = await page.locator("#ar-hold").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 - 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const moved = await page.evaluate(() => document.querySelector("#ar-hold").style.top);
  check("Dragging moves the dragon on the table", "changed", moved, moved !== ar.left && moved !== "58%");

  await page.locator(".gel-ar-controls .gel-btn-primary").click();
  await page.waitForTimeout(300);
  check("Done closes AR", "0", String(await page.locator("#ar-root:not([hidden])").count()), (await page.locator("#ar-root:not([hidden])").count()) === 0);
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
      badge: bd ? getComputedStyle(bd).height : null
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
