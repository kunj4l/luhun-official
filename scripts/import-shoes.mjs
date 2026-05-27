import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const COLLECTION_MAP = {
  "kids-sneakers": "kids",
  "size-7": "7",
  "size-8": "8",
  "size-9": "9",
  "size-10": "10",
  "size-11": "11",
  "size-12": "12",
  "size-13": "13",
  "size-14": "14",
};

function imageUrl(src) {
  if (!src) return "";
  const base = src.split("?")[0];
  return `${base}?width=600`;
}

function parseSize(title, variantTitle) {
  const fromTitle = title.match(/Sz\s*([\d.]+)/i);
  if (fromTitle) return parseFloat(fromTitle[1]);
  const n = parseFloat(variantTitle);
  return Number.isFinite(n) ? n : null;
}

function slugify(handle, sizeGroup) {
  return `${handle}-${sizeGroup}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

const shoes = [];
const seen = new Set();

for (const [collection, sizeGroup] of Object.entries(COLLECTION_MAP)) {
  const file = path.join(root, "..", `col-${collection}.json`);
  if (!fs.existsSync(file)) {
    console.warn("Missing", file);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const p of data.products || []) {
    const variant = p.variants?.[0];
    if (!variant) continue;
    const id = slugify(p.handle, sizeGroup);
    if (seen.has(id)) continue;
    seen.add(id);

    const price = parseFloat(variant.price);
    const compareRaw = parseFloat(variant.compare_at_price);
    const compareAt =
      Number.isFinite(compareRaw) && compareRaw > price ? compareRaw : null;
    const soldOut = !variant.available;

    shoes.push({
      id,
      name: p.title.trim(),
      category: "shoes",
      sizeGroup,
      size: parseSize(p.title, variant.title),
      price,
      compareAt,
      soldOut,
      badge: soldOut ? "sold-out" : "sale",
      image: imageUrl(p.images?.[0]?.src),
      handle: p.handle,
    });
  }
  console.log(`${collection}: ${(data.products || []).length} products`);
}

shoes.sort((a, b) => a.name.localeCompare(b.name));

const outPath = path.join(root, "js", "shoes-catalog.json");
fs.writeFileSync(outPath, JSON.stringify(shoes, null, 2));
console.log(`\nWrote ${shoes.length} shoes to ${outPath}`);
