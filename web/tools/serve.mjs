/**
 * Serves the prototype on http://localhost:4173.
 *
 *   npm start
 *
 * Double-clicking index.html is enough for everything except the AR camera:
 * browsers only expose getUserMedia in a secure context, and file:// is not
 * one. Localhost is. Use this for recording the AR moment; everyone else can
 * keep double-clicking.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon"
};

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = normalize(url === "/" ? "index.html" : url.replace(/^\//, ""));
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  try {
    const body = await readFile(join(webRoot, rel));
    res.writeHead(200, {
      "content-type": MIME[extname(rel)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found: " + rel);
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Credit Dragon on http://localhost:${PORT}`);
  console.log("The AR camera needs this address. Ctrl+C to stop.");
});
