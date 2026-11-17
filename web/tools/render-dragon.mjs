/**
 * Renders the dragon GLB into the PNG portraits the app already looks for
 * (assets/dragon/<stage>.png), so the prototype shows the real model.
 *
 *   npm run render:dragon
 *
 * Boots a throwaway static server (the GLB cannot be fetched over file://),
 * drives three.js in headless Edge, and writes transparent PNGs.
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const repoRoot = join(webRoot, "..");
const outDir = join(webRoot, "assets", "dragon");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".css": "text/css",
  ".json": "application/json"
};

/* Two roots: the app under /, and node_modules so the import map can reach
   three without vendoring it. */
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const isModule = url.startsWith("/node_modules/");
  const base = isModule ? repoRoot : webRoot;
  const rel = normalize(isModule ? url.replace(/^\/node_modules\//, "web/node_modules/") : url.replace(/^\//, ""));
  try {
    const body = await readFile(join(base, rel));
    res.writeHead(200, { "content-type": MIME[extname(rel)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found: " + rel);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await page.goto(`http://127.0.0.1:${port}/tools/render/dragon.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });

/* Three stages total: egg (emoji), baby (this model), adult (the next model,
   still to be supplied). Rendered from the same camera rig so they match. */
const STAGES = [
  { id: "baby", model: "/assets/dragon/dragon.glb", fill: 0.9, yaw: 20, pitch: 6 }
];

for (const s of STAGES) {
  await page.goto(`http://127.0.0.1:${port}/tools/render/dragon.html?model=${encodeURIComponent(s.model)}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  const info = await page.evaluate((o) => window.renderStage(o), s);
  await page.waitForTimeout(120);
  const file = join(outDir, s.id + ".png");
  await page.locator("#stage").screenshot({ path: file, omitBackground: true });

  /* Objective check for the "too bright / washed out" problem: how much of the
     dragon is clipping, and how bright is it on average. */
  const { data, info: meta } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0,
    sum = 0,
    blown = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    n++;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (Math.max(r, g, b) >= 250) blown++;
  }
  const meanLum = n ? (sum / n).toFixed(0) : "-";
  const blownPct = n ? ((blown / n) * 100).toFixed(1) : "-";
  console.log(
    `${s.id.padEnd(6)} fill ${s.fill}  dist ${info.dist.toFixed(2)}u  ` +
      `lum ${meanLum}/255  clipping ${blownPct}%  -> assets/dragon/${s.id}.png`
  );
}

await browser.close();
server.close();
console.log(errs.length ? "errors: " + errs.slice(0, 5).join(" | ") : "no runtime errors");
