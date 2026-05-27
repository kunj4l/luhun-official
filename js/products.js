import shoesCatalog from "./shoes-catalog.json" with { type: "json" };
import clothingCatalog from "./clothing-catalog.json" with { type: "json" };
import { fetchCatalog } from "./api.js";

export const SHOE_SIZES = [
  { id: "kids", label: "Kids Shoes", range: [1, 6.5] },
  { id: "7", label: "Size 7 – 7.5", range: [7, 7.5] },
  { id: "8", label: "Size 8 – 8.5", range: [8, 8.5] },
  { id: "9", label: "Size 9 – 9.5", range: [9, 9.5] },
  { id: "10", label: "Size 10 – 10.5", range: [10, 10.5] },
  { id: "11", label: "Size 11 – 11.5", range: [11, 11.5] },
  { id: "12", label: "Size 12 – 12.5", range: [12, 12.5] },
  { id: "13", label: "Size 13 – 13.5", range: [13, 13.5] },
  { id: "14", label: "Size 14", range: [14, 14] },
];

export const CLOTHING_TYPES = [
  { id: "tees", label: "T-Shirts" },
  { id: "hoodies", label: "Hoodies" },
];

const IMAGE_OVERRIDES = {
  "yeezy-380-alien-blue-sz-10-10": "assets/yeezy-380-alien-blue-sz-10.png",
};

export const CONTAIN_IMAGE_IDS = new Set(Object.keys(IMAGE_OVERRIDES));

const SHOE_PRODUCTS = shoesCatalog
  .map(({ handle, ...product }) => product)
  .map((product) =>
    IMAGE_OVERRIDES[product.id]
      ? { ...product, image: IMAGE_OVERRIDES[product.id] }
      : product
  );
const CLOTHING_PRODUCTS = clothingCatalog.map(({ handle, ...product }) => product);
const LOCAL_PRODUCTS = [...SHOE_PRODUCTS, ...CLOTHING_PRODUCTS];

let PRODUCTS = [];
let catalogSource = "local";

export function getCatalogSource() {
  return catalogSource;
}

export function getProducts() {
  return PRODUCTS;
}

export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

export async function loadProducts() {
  try {
    const { products, source } = await fetchCatalog();
    if (products.length) {
      PRODUCTS = products;
      catalogSource = source;
      syncCartVariantIds();
      return PRODUCTS;
    }
  } catch (err) {
    console.warn("[luhun] CRM catalog unavailable, using local JSON:", err.message);
  }
  PRODUCTS = LOCAL_PRODUCTS;
  catalogSource = "local";
  return PRODUCTS;
}

export function formatPrice(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function getProductsByRoute(route) {
  if (route.view === "shoes" && route.sizeId) {
    return PRODUCTS.filter(
      (p) => p.category === "shoes" && p.sizeGroup === route.sizeId
    );
  }
  if (route.view === "clothing" && route.clothingId) {
    return PRODUCTS.filter(
      (p) => p.category === "clothing" && p.clothingType === route.clothingId
    );
  }
  return PRODUCTS;
}

export function getCollectionTitle(route) {
  if (route.view === "shoes" && route.sizeId) {
    const s = SHOE_SIZES.find((x) => x.id === route.sizeId);
    return s?.label ?? "Shoes";
  }
  if (route.view === "clothing" && route.clothingId) {
    const c = CLOTHING_TYPES.find((x) => x.id === route.clothingId);
    return c?.label ?? "Clothing";
  }
  return "";
}

export const FEATURED_IDS = [
  "nike-pro-hyperwarm-hood",
  "luhun-x-site-collab-tee",
  "luhun-angel",
  "hustle-hard-t-shirt",
];

/** Attach CRM variantId to cart lines saved before CRM was connected */
export function syncCartVariantIds() {
  try {
    const key = "luhun-cart";
    const cart = JSON.parse(localStorage.getItem(key) || "[]");
    let changed = false;
    for (const line of cart) {
      if (line.variantId) continue;
      const p = PRODUCTS.find((x) => x.id === line.id);
      if (!p) continue;
      if (p.variantId) {
        line.variantId = p.variantId;
        changed = true;
      } else if (p.variants?.length) {
        const v = p.variants.find((x) => x.size === line.variant) || p.variants[0];
        line.variantId = v?.id;
        changed = true;
      }
    }
    if (changed) localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}

export function getFeaturedProducts() {
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
  const picked = FEATURED_IDS.map((id) => byId.get(id)).filter(Boolean);
  if (picked.length >= 4) return picked;
  const extra = PRODUCTS.filter((p) => !p.soldOut && !FEATURED_IDS.includes(p.id));
  return [...picked, ...extra].slice(0, 8);
}
