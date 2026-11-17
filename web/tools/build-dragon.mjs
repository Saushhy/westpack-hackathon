/**
 * Builds the dragon GLB from the source art in /assets/dragon_3d.
 *
 *   npm run build:dragon
 *
 * The source is an OBJ with separate PBR maps and no material file, so the maps
 * have to be wired to the geometry by hand. This does three things:
 *
 *   1. obj2gltf (geometry only)  -> a valid GLB with POSITION / NORMAL / TEXCOORD_0
 *   2. sharp                     -> base colour, normal and a packed ORM map,
 *                                   downscaled so a phone can hold the whole model
 *   3. glTF patch                -> attach the images as materials
 *
 * Output: web/assets/dragon/dragon.glb  (embedded, single file, offline safe)
 *
 * The GLB is a build artefact and is committed on purpose: the prototype has to
 * work by double-click, and index.html cannot fetch a .glb over file://.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import obj2gltf from "obj2gltf";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const srcDir = join(webRoot, "..", "assets", "dragon_3d");
const outDir = join(webRoot, "assets", "dragon");
const tmp = join(process.env.TEMP || process.env.TMP || ".", "opencode", "dragon");

mkdirSync(outDir, { recursive: true });
mkdirSync(tmp, { recursive: true });

const OBJ = join(srcDir, "base.obj");
const OUT = join(outDir, "dragon.glb");
for (const f of [OBJ, join(srcDir, "texture_diffuse.png"), join(srcDir, "texture_normal.png")]) {
  if (!existsSync(f)) {
    console.error("Missing source art: " + f);
    process.exit(1);
  }
}

const kb = (n) => (n / 1024).toFixed(0) + " kB";

/* ---------- 1. geometry ---------- */
const rawGlb = await obj2gltf(OBJ, { binary: true });

/* ---------- 2. textures ----------
   A 1024 base colour and normal is plenty for a 20k triangle dragon on a phone
   screen. The roughness and metallic maps are near uniform, so 512 is generous
   and keeps the file small enough to inline. */
const COLOR_SIZE = 1024;
const ORM_SIZE = 512;

const jpeg = (input, size, quality) =>
  sharp(input)
    .resize(size, size, { fit: "fill" })
    .jpeg({ quality, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();

const baseColor = await jpeg(join(srcDir, "texture_diffuse.png"), COLOR_SIZE, 88);
const normal = await jpeg(join(srcDir, "texture_normal.png"), COLOR_SIZE, 94);

/* glTF packs metallic-roughness as: R occlusion, G roughness, B metallic.
   Mia's dragon is organic, so occlusion is left open and the two maps fill G
   and B. Both source maps are greyscale. */
const grey = async (file) => {
  const { data, info } = await sharp(join(srcDir, file))
    .resize(ORM_SIZE, ORM_SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const rough = await grey("texture_roughness.png");
const metal = await grey("texture_metallic.png");

const orm = Buffer.alloc(rough.w * rough.h * 3);
for (let i = 0; i < rough.w * rough.h; i++) {
  orm[i * 3] = 255; // occlusion open
  orm[i * 3 + 1] = rough.data[i]; // roughness
  orm[i * 3 + 2] = metal.data[i] ?? 0; // metallic
}
const ormPng = await sharp(orm, { raw: { width: rough.w, height: rough.h, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

/* ---------- 3. patch the glTF ---------- */
const glb = Buffer.from(rawGlb);
if (glb.readUInt32LE(0) !== 0x46546c67) {
  console.error("obj2gltf did not write a GLB");
  process.exit(1);
}
let p = 12;
let json = null;
let bin = Buffer.alloc(0);
while (p < glb.length) {
  const len = glb.readUInt32LE(p);
  const type = glb.readUInt32LE(p + 4);
  const body = glb.slice(p + 8, p + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(body.toString("utf8"));
  else if (type === 0x004e4942) bin = Buffer.from(body);
  p += 8 + len;
}
if (!json || !bin.length) {
  console.error("Unexpected GLB layout");
  process.exit(1);
}

json.asset = { version: "2.0", generator: "credit-dragon build-dragon.mjs" };
json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
json.images = [];
json.textures = [];
json.bufferViews = json.bufferViews || [];

const addImage = (bytes, mimeType, name) => {
  while (bin.length % 4 !== 0) bin = Buffer.concat([bin, Buffer.from([0])]);
  const byteOffset = bin.length;
  bin = Buffer.concat([bin, bytes]);
  json.bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length });
  json.images.push({ bufferView: json.bufferViews.length - 1, mimeType, name });
  json.textures.push({ sampler: 0, source: json.images.length - 1 });
  return json.textures.length - 1;
};

const tBase = addImage(baseColor, "image/jpeg", "dragon_basecolor");
const tNormal = addImage(normal, "image/jpeg", "dragon_normal");
const tOrm = addImage(ormPng, "image/png", "dragon_orm");

json.materials = [
  {
    name: "dragon_skin",
    pbrMetallicRoughness: {
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: { index: tBase },
      metallicFactor: 1,
      roughnessFactor: 1,
      metallicRoughnessTexture: { index: tOrm }
    },
    normalTexture: { index: tNormal, scale: 1 },
    emissiveFactor: [0, 0, 0],
    alphaMode: "OPAQUE",
    doubleSided: false
  }
];
for (const mesh of json.meshes || []) {
  for (const prim of mesh.primitives) prim.material = 0;
}
json.buffers = [{ byteLength: bin.length }];

/* ---------- 4. repack ---------- */
const jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
const binPad = (4 - (bin.length % 4)) % 4;
const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);

const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const out = Buffer.alloc(total);
out.writeUInt32LE(0x46546c67, 0);
out.writeUInt32LE(2, 4);
out.writeUInt32LE(total, 8);
out.writeUInt32LE(jsonChunk.length, 12);
out.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(out, 20);
const binStart = 20 + jsonChunk.length;
out.writeUInt32LE(binChunk.length, binStart);
out.writeUInt32LE(0x004e4942, binStart + 4);
binChunk.copy(out, binStart + 8);
writeFileSync(OUT, out);

/* ---------- report ---------- */
const prim = json.meshes[0].primitives[0];
const pos = json.accessors[prim.attributes.POSITION];
const idx = json.accessors[prim.indices];
console.log("wrote " + OUT.replace(webRoot, "web"));
console.log("  file       " + kb(out.length));
console.log("  vertices   " + pos.count + "   triangles " + idx.count / 3);
console.log("  attributes " + Object.keys(prim.attributes).join(", "));
console.log("  nodes      " + (json.nodes || []).length + "   skins " + (json.skins || []).length + "   animations " + (json.animations || []).length);
console.log("  base colour " + kb(baseColor.length) + "  normal " + kb(normal.length) + "  orm " + kb(ormPng.length));
const bmin = pos.min.map((n) => n.toFixed(3)).join(", ");
const bmax = pos.max.map((n) => n.toFixed(3)).join(", ");
console.log("  bounds     [" + bmin + "] to [" + bmax + "]");
console.log("  height     " + (pos.max[1] - pos.min[1]).toFixed(3) + " units (scale to 0.32 in AR)");
