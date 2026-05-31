/** Backend CRM API base URL */
const PRODUCTION_API = "https://luhun-backend-1.onrender.com/api";

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

  // Served from backend at /store (same origin)
  if (location.pathname.startsWith("/store")) {
    return `${location.origin}/api`;
  }

  // Local dev: storefront on another port (serve, netlify dev, etc.)
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:4000/api";
  }

  // Production Netlify — always use Render (ignore stale localStorage from old tests)
  if (location.hostname === "luhun.netlify.app" || location.hostname.endsWith(".netlify.app")) {
    return PRODUCTION_API;
  }

  const stored = localStorage.getItem("luhun_api_url");
  if (stored) {
    const base = stored.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  return "";
}

export function setApiBase(url) {
  const base = url.replace(/\/$/, "");
  localStorage.setItem("luhun_api_url", base.endsWith("/api") ? base : `${base}/api`);
}

export function clearStaleApiOverride() {
  const stored = localStorage.getItem("luhun_api_url") || "";
  if (/localhost|127\.0\.0\.1/i.test(stored)) {
    localStorage.removeItem("luhun_api_url");
  }
}
