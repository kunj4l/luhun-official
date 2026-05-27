#!/usr/bin/env node
/**
 * Netlify build: copy site to dist/ and inject CRM API URL from env.
 * Set LUhun_API_URL in Netlify → Site configuration → Environment variables
 * Example: https://your-backend.onrender.com/api
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const apiUrl = (process.env.LUHUN_API_URL || process.env.VITE_LUHUN_API_URL || "").trim();

const SKIP = new Set(["dist", "node_modules", ".git", "scripts/netlify-prepare.mjs"]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function injectApiUrl(html) {
  if (!apiUrl) {
    console.warn(
      "[netlify-prepare] LUhun_API_URL not set — site will use offline catalog only.\n" +
        "  Add in Netlify: Site settings → Environment variables → LUhun_API_URL\n" +
        "  Example: https://your-backend.onrender.com/api"
    );
    return html;
  }
  const normalized = apiUrl.replace(/\/$/, "");
  const final = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  console.log("[netlify-prepare] API URL:", final);
  return html.replace(
    /<meta\s+name="luhun-api"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="luhun-api" content="${final}" />`
  );
}

if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
copyDir(root, dist);

const indexPath = path.join(dist, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = injectApiUrl(html);
fs.writeFileSync(indexPath, html);

console.log("[netlify-prepare] Done → dist/ ready for Netlify");
