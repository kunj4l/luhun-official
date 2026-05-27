import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const repoRoot = path.join(root, "..");

function imageUrl(src) {
  if (!src) return "";
  return `${src.split("?")[0]}?width=600`;
}

function classifyType(title) {
  const t = title.toLowerCase();
  if (/\bhood\b/.test(t) && !/t-shirt|tee|shorts/.test(t)) return "hoodies";
  return "tees";
}

function buildProduct(p) {
  const variants = p.variants || [];
  if (!variants.length) return null;

  const available = variants.filter((v) => v.available);
  const priceSource = available[0] || variants[0];
  const price = parseFloat(priceSource.price);
  const compareRaw = parseFloat(priceSource.compare_at_price);
  const compareAt =
    Number.isFinite(compareRaw) && compareRaw > price ? compareRaw : null;
  const soldOut = variants.every((v) => !v.available);

  const sizeOption = p.options?.find((o) => /size/i.test(o.name));
  const hasMultipleOptions = (p.options?.length ?? 0) > 1;
  let sizes;
  if (variants.length === 1 && !sizeOption) {
    sizes = [variants[0].title];
  } else if (hasMultipleOptions) {
    sizes = [...new Set(variants.map((v) => v.title))];
  } else if (sizeOption) {
    sizes = sizeOption.values;
  } else {
    sizes = [...new Set(variants.map((v) => v.title))];
  }

  return {
    id: p.handle,
    name: p.title.trim(),
    category: "clothing",
    clothingType: classifyType(p.title),
    sizes,
    price,
    compareAt,
    soldOut,
    badge: soldOut ? "sold-out" : "sale",
    image: imageUrl(p.images?.[0]?.src),
    handle: p.handle,
  };
}

const sources = ["col-t-shirts.json", "col-merch.json"];
const seen = new Set();
const clothing = [];

for (const file of sources) {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const p of data.products || []) {
    if (seen.has(p.handle)) continue;
    seen.add(p.handle);
    const item = buildProduct(p);
    if (item) clothing.push(item);
  }
  console.log(`${file}: ${(data.products || []).length} products`);
}

clothing.sort((a, b) => {
  if (a.clothingType !== b.clothingType)
    return a.clothingType.localeCompare(b.clothingType);
  return a.name.localeCompare(b.name);
});

const tees = clothing.filter((c) => c.clothingType === "tees");
const hoodies = clothing.filter((c) => c.clothingType === "hoodies");

const outPath = path.join(root, "js", "clothing-catalog.json");
fs.writeFileSync(outPath, JSON.stringify(clothing, null, 2));
console.log(`\nWrote ${clothing.length} items (${tees.length} tees, ${hoodies.length} hoodies)`);
