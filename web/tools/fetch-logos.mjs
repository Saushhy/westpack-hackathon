/**
 * Fetches each brand's own icon once and writes it to web/assets/brands/.
 *
 * The prototype must work offline (double-click index.html), so the icons are
 * committed rather than loaded at runtime. Only brands Mia already pays for are
 * fetched: naming her own providers is her data, not promotion.
 *
 *   npm run fetch:logos
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "assets", "brands");
mkdirSync(outDir, { recursive: true });

// name -> [host for the icon service, host that serves the site's own .ico]
const BRANDS = {
  afterpay: ["afterpay.com.au"],
  zip: ["zip.co"],
  netflix: ["netflix.com"],
  stan: ["stan.com.au"],
  disneyplus: ["disneyplus.com"],
  spotify: ["spotify.com"],
  vodafone: ["vodafone.com", "vodafone.com.au"],
  aussiebroadband: ["aussiebroadband.com.au"],
  goodlife: ["goodlife.com.au"],
  // credit institutions the four personas actually repay
  toyota: ["toyota.com.au"],
  anz: ["anz.com.au"],
  plenti: ["plenti.com.au"]
};

const pngSize = (buf) => {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};

const get = async (url) => {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
  return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
};

/* Some brands publish no usable favicon through the icon service. Their .ico
   usually carries one PNG-encoded entry, so pull the largest one out. A few
   (ANZ) only carry BMP entries, so decode that too. */
const largestPngInIco = (ico) => {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) return null;
  const count = ico.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const size = ico.readUInt32LE(o + 8);
    const off = ico.readUInt32LE(o + 12);
    if (ico.slice(off, off + 8).toString("hex") !== "89504e470d0a1a0a") continue;
    if (!best || size > best.size) best = { size, off };
  }
  return best ? ico.slice(best.off, best.off + best.size) : null;
};

/* Decode the largest 32-bit BMP entry in an .ico into a PNG buffer. */
const largestBmpInIco = async (ico) => {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) return null;
  const count = ico.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const w = ico[o] === 0 ? 256 : ico[o];
    const size = ico.readUInt32LE(o + 8);
    const off = ico.readUInt32LE(o + 12);
    if (ico.slice(off, off + 8).toString("hex") === "89504e470d0a1a0a") continue;
    if (!best || size > best.size) best = { size, off, w };
  }
  if (!best) return null;

  const bmp = ico.slice(best.off, best.off + best.size);
  const headerSize = bmp.readUInt32LE(0);
  const width = bmp.readUInt32LE(4);
  const height = Math.floor(bmp.readUInt32LE(8) / 2); // XOR + AND masks
  const bpp = bmp.readUInt16LE(14);
  if (bpp !== 32 && bpp !== 24) return null;

  const bytes = bpp / 8;
  const rowBytes = Math.ceil((width * bytes) / 4) * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let anyAlpha = false;

  for (let y = 0; y < height; y++) {
    const srcRow = headerSize + (height - 1 - y) * rowBytes; // bottom-up
    for (let x = 0; x < width; x++) {
      const s = srcRow + x * bytes;
      const d = (y * width + x) * 4;
      pixels[d] = bmp[s + 2]; // R
      pixels[d + 1] = bmp[s + 1]; // G
      pixels[d + 2] = bmp[s]; // B
      pixels[d + 3] = bytes === 4 ? bmp[s + 3] : 255;
      if (pixels[d + 3] > 8) anyAlpha = true;
    }
  }
  // Some icons leave alpha at zero everywhere. Treat them as opaque.
  if (!anyAlpha) for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

  const sharp = (await import("sharp")).default;
  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

for (const [name, hosts] of Object.entries(BRANDS)) {
  const file = join(outDir, name + ".png");
  let buf = null;
  let from = "";

  const viaService = await get(`https://www.google.com/s2/favicons?domain=${hosts[0]}&sz=128`);
  const size = pngSize(viaService.buf);
  // Google answers unknown domains with a 16x16 globe. Treat that as a miss.
  if (viaService.status === 200 && size && size.w >= 32) {
    buf = viaService.buf;
    from = `icon service (${hosts[0]})`;
  } else {
    for (const host of hosts) {
      const ico = await get(`https://www.${host}/favicon.ico`);
      if (ico.status !== 200) continue;
      let png = largestPngInIco(ico.buf);
      let how = "png entry";
      if (!png) {
        png = await largestBmpInIco(ico.buf);
        how = "bmp entry";
      }
      if (png) {
        buf = png;
        from = `favicon.ico ${how} (${host})`;
        break;
      }
    }
  }

  if (!buf) {
    console.warn(`SKIP ${name}: no usable icon, keeping the GEL icon fallback`);
    continue;
  }
  writeFileSync(file, buf);
  const dim = pngSize(readFileSync(file));
  console.log(`${name.padEnd(16)} ${dim.w}x${dim.h}  ${String(buf.length).padStart(5)} bytes  <- ${from}`);
}
console.log("logos in", outDir);
