// Vendors the real Westpac GEL stylesheet source + brand font into web/gel.
//
// Why: GEL's entire visual language (fonts, colour tokens, spacing rhythm,
// typography scale, radii, animations) is plain CSS. We do NOT need React or
// Storybook to be pixel-authentic — we need GEL's own CSS and its own class
// vocabulary. This script pulls both the CSS and the tooling note for provenance.
//
// Usage: npm run vendor:gel
// Source: https://github.com/WestpacGEL/GEL-next (packages/style-config/src/css)

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const cssRoot = join(webRoot, "gel", "src", "css");
const fontsDir = join(webRoot, "assets", "fonts");

const REPO = "https://raw.githubusercontent.com/WestpacGEL/GEL-next/main/packages/style-config/src/css";

const FILES = [
  ["styles.css", "styles.css"],
  ["shared/animations.css", "shared/animations.css"],
  ["shared/borders.css", "shared/borders.css"],
  ["shared/form-control.css", "shared/form-control.css"],
  ["shared/colors.css", "shared/colors.css"],
  ["shared/layout.css", "shared/layout.css"],
  ["shared/typography.css", "shared/typography.css"],
  ["shared/utilities.css", "shared/utilities.css"],
  ["shared/brand-fonts.css", "shared/brand-fonts.css"],
  ["themes/theme-wbc.css", "themes/theme-wbc.css"],
];

// Westpac's own brand font, served publicly by westpac.com.au (referenced by
// GEL's brand-fonts.css as /fonts/Westpac-Bold-v2.007.woff2).
const FONTS = [
  ["https://www.westpac.com.au/fonts/Westpac-Bold-v2.007.woff2", "Westpac-Bold-v2.007.woff2"],
  ["https://www.westpac.com.au/fonts/Westpac-Bold-v2.007.woff", "Westpac-Bold-v2.007.woff"],
];

let ok = 0;
let failed = [];

for (const [remote, local] of FILES) {
  const dest = join(cssRoot, local);
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(`${REPO}/${remote}`);
  if (!res.ok) {
    failed.push(`css ${remote} -> ${res.status}`);
    continue;
  }
  const body = await res.text();
  writeFileSync(dest, body, "utf8");
  ok++;
}

mkdirSync(fontsDir, { recursive: true });
for (const [url, name] of FONTS) {
  const res = await fetch(url);
  if (!res.ok) {
    failed.push(`font ${url} -> ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(fontsDir, name), buf);
  ok++;
}

console.log(`Vendored ${ok} file(s) from GEL + westpac.com.au`);
if (failed.length) {
  console.warn("Failed:\n" + failed.join("\n"));
  process.exitCode = 1;
}
