import { getApiBase } from "./config.js";

function apiUrl(path) {
  const base = getApiBase();
  if (!base) throw new Error("CRM API URL not configured");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastError || new Error("Network request failed");
}

export async function fetchCatalog() {
  const res = await fetchWithRetry(apiUrl("/storefront/catalog"), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  const json = await res.json();
  return { products: json.data || [], source: json.source || "crm" };
}

export async function resolveVariant(storefrontId, size) {
  const res = await fetch(apiUrl("/storefront/resolve-variant"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ storefrontId, size }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Variant resolve failed (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function trackOrder({ orderNumber, email }) {
  const res = await fetch(apiUrl("/storefront/track"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ orderNumber, email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Tracking lookup failed (${res.status})`);
  return json.data;
}

export async function submitCheckout({ email, name, items, shippingAddress }) {
  const res = await fetch(apiUrl("/storefront/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, name, items, shippingAddress }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Checkout failed (${res.status})`);
  return json.data;
}

export async function checkBackendHealth() {
  try {
    const res = await fetchWithRetry(apiUrl("/health"), {
      headers: { Accept: "application/json" },
    }, 3);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
