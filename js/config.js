/** Backend CRM API base URL */
export function getApiBase() {
  const params = new URLSearchParams(location.search);
  const qApi = params.get("api");
  if (qApi) {
    const base = qApi.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  const meta = document.querySelector('meta[name="luhun-api"]')?.content?.trim();
  if (meta && meta !== "AUTO") {
    const base = meta.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  const stored = localStorage.getItem("luhun_api_url");
  if (stored) {
    const base = stored.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  // Served from backend at /store (same origin)
  if (location.pathname.startsWith("/store")) {
    return `${location.origin}/api`;
  }

  // Local dev: storefront on another port (serve, netlify dev, etc.)
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:4000/api";
  }

  // Production fallback for the live Luhun Netlify site.
  if (location.hostname === "luhun.netlify.app" || location.hostname.endsWith(".netlify.app")) {
    return "https://luhun-backend-1.onrender.com/api";
  }

  // Production static host — set meta or ?api=https://your-backend.com
  return "";
}

export function setApiBase(url) {
  const base = url.replace(/\/$/, "");
  localStorage.setItem("luhun_api_url", base.endsWith("/api") ? base : `${base}/api`);
}
