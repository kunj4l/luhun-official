# Deploy Luhun Official to Netlify

This guide deploys the **website** (storefront) to Netlify.  
The **CRM backend** (orders, inventory, admin) cannot run on Netlify — host it on Render, Railway, or Fly.io, then connect the two.

---

## What goes where

| Part | Host | URL example |
|------|------|-------------|
| **Website** (shop, cart, track order) | **Netlify** | `https://yoursite.netlify.app` |
| **CRM + Admin** (products, orders, owner login) | **Render / Railway** | `https://luhun-api.onrender.com` |
| **Admin panel** | Same as CRM | `https://luhun-api.onrender.com/admin` |

---

## Part 1 — Deploy the website to Netlify

### Option A — GitHub (recommended)

1. **Create a GitHub repo** with only the **contents** of the `luhun-official` folder at the repo root:

   ```
   index.html
   css/
   js/
   assets/
   netlify.toml
   scripts/netlify-prepare.mjs
   DEPLOY-NETLIFY.md
   ...
   ```

   **Do not** upload only a `.zip` file. Netlify needs the actual files.

2. **Push to GitHub:**

   ```powershell
   cd C:\Users\Sachin\Downloads\clean-essentials\luhun-official
   git init
   git add .
   git commit -m "Luhun Official storefront for Netlify"
   git branch -M main
   gh repo create luhun-official --public --source=. --remote=origin --push
   ```

3. **Netlify:** https://app.netlify.com → **Add new site** → **Import from Git**

4. **Build settings** (should match `netlify.toml`):

   | Setting | Value |
   |---------|--------|
   | Branch | `main` |
   | Build command | `node scripts/netlify-prepare.mjs` |
   | Publish directory | `dist` |

5. **Deploy** (first deploy may work in offline mode until you add the API URL in Part 3).

### Option B — Drag & drop

1. Open `luhun-official` in Explorer.
2. **Select all files inside** (not the parent folder): `index.html`, `css`, `js`, `assets`, `netlify.toml`, etc.
3. Go to https://app.netlify.com/drop and drop that selection.

   For drag-and-drop, set `LUhun_API_URL` manually in `index.html` before zipping:

   ```html
   <meta name="luhun-api" content="https://YOUR-BACKEND.onrender.com/api" />
   ```

---

## Part 2 — Deploy the CRM backend (required for live catalog & orders)

Netlify only hosts static files. Deploy `clothing-brand-backend` to **Render** (free tier works):

1. https://render.com → **New** → **Web Service**
2. Connect your GitHub repo (or upload `clothing-brand-backend` as its own repo).
3. Settings:

   | Setting | Value |
   |---------|--------|
   | Root directory | `clothing-brand-backend` (if monorepo) |
   | Build command | `npm install` |
   | Start command | `node server.js` |
   | Environment | `Node` |

4. **Environment variables** (minimum):

   ```env
   NODE_ENV=production
   PORT=10000
   APP_URL=https://luhun-api.onrender.com
   JWT_SECRET=your-long-random-string
   SESSION_SECRET=another-long-random-string
   BOOTSTRAP_ADMIN_NAME=Luhun
   BOOTSTRAP_ADMIN_EMAIL=luhun@luhunofficial.com
   BOOTSTRAP_ADMIN_PASSWORD=Luhun2026!
   CORS_ORIGIN=https://YOUR-NETLIFY-SITE.netlify.app
   STORE_AUTO_SYNC=true
   LUHUN_CATALOG_DIR=../luhun-official/js
   ```

   On Render, use a **persistent disk** or PostgreSQL (`DATABASE_URL`) so orders are not lost on restart. For quick tests, SQLite works but data may reset.

5. After deploy, open:

   - `https://luhun-api.onrender.com/health` → should return `"status":"ok"`
   - `https://luhun-api.onrender.com/admin` → login: **Luhun** / **Luhun2026!**

6. **Sync products** (once, from Render shell or locally pointing at prod DB):

   ```bash
   npm run sync:luhun
   ```

---

## Part 3 — Connect Netlify site to the backend

1. Netlify → your site → **Site configuration** → **Environment variables**

2. Add:

   | Key | Value |
   |-----|--------|
   | `LUHUN_API_URL` | `https://luhun-api.onrender.com/api` |

   Use your real backend URL. Must end with `/api` or the build script adds it.

3. **Trigger deploy** → **Deploys** → **Trigger deploy** → **Deploy site**

4. On the backend, set **CORS** to your Netlify URL:

   ```env
   CORS_ORIGIN=https://YOUR-SITE.netlify.app
   ```

   Redeploy the backend after changing CORS.

---

## Part 4 — Verify after deploy

### Website (Netlify)

- [ ] Homepage loads with styles (not plain HTML)
- [ ] `https://yoursite.netlify.app/css/styles.css` returns CSS (not 404)
- [ ] Banner says **"Live inventory · synced with admin CRM"** (not offline catalog)
- [ ] Products load (not empty)
- [ ] **Track order** page works: `#/track`

### Backend

- [ ] `https://your-api.onrender.com/api/health` → OK
- [ ] Admin login works
- [ ] Test order on site → appears in **Admin → Orders**

---

## Custom domain (optional)

1. Netlify → **Domain management** → add your domain.
2. Update backend `CORS_ORIGIN` and `APP_URL` to use the custom domain.
3. Redeploy both site and backend.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Page has no styling | Repo root must contain `index.html`, `css/`, `js/` — not only a zip file |
| "CRM offline" on Netlify | Set `LUHUN_API_URL` in Netlify env vars and redeploy |
| CORS error in browser console | Add Netlify URL to backend `CORS_ORIGIN` |
| Checkout fails | Backend must be running; cart needs CRM connection (refresh after CRM is live) |
| Admin can't login | Restart backend; credentials: **Luhun** / **Luhun2026!** |
| Images from admin don't show | Backend must serve `/api/uploads/` — use same backend URL for API |

---

## Local testing (before Netlify)

```powershell
# Terminal 1 — CRM
cd clothing-brand-backend
node server.js

# Terminal 2 — Store (optional; or use http://localhost:4000/store)
cd luhun-official
npx serve . -l 3000
```

Best local URL with CRM: **http://localhost:4000/store**

Or double-click: `START-LUHUN.bat` in the project root.

---

## Files in this folder for Netlify

| File | Purpose |
|------|---------|
| `netlify.toml` | Build command + publish `dist/` |
| `scripts/netlify-prepare.mjs` | Injects `LUHUN_API_URL` into HTML at build time |
| `DEPLOY-NETLIFY.md` | This guide |
| `.gitignore` | Ignores `dist/` |

---

## Checklist before going live

- [ ] Website deployed on Netlify
- [ ] Backend deployed (Render/Railway)
- [ ] `LUHUN_API_URL` set on Netlify
- [ ] `CORS_ORIGIN` includes Netlify URL on backend
- [ ] Products synced (`npm run sync:luhun`)
- [ ] Owner Stripe keys added when ready for payments (not required for catalog/orders)
- [ ] Test order + track order flow end-to-end

---

**Support URLs after deploy**

- Store: `https://YOUR-SITE.netlify.app`
- Track order: `https://YOUR-SITE.netlify.app/#/track`
- Admin: `https://YOUR-BACKEND.onrender.com/admin`
