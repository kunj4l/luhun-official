# Luhun Official

A modern demo storefront for [Luhun Official](https://luhun.store/) — sneakers (kids through size 14), t-shirts, and hoodies with a fresh **midnight flame** streetwear theme.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve luhun-official
```

Then visit `http://localhost:3000` (or the port shown).

## Product data

Product inventory (shoes, t-shirts, hoodies) is synced from [luhun.store](https://luhun.store/) — names, prices, images, and availability. To refresh shoes:

```bash
# From repo root — fetch Shopify JSON, then rebuild catalog
curl.exe -sL "https://luhun.store/collections/kids-sneakers/products.json?limit=250" -o col-kids-sneakers.json
# … repeat for size-7 through size-14 (see scripts/import-shoes.mjs)
node luhun-official/scripts/import-shoes.mjs
```

To refresh clothing (uses `col-t-shirts.json` from the store):

```bash
curl.exe -sL "https://luhun.store/collections/t-shirts/products.json?limit=250" -o col-t-shirts.json
node luhun-official/scripts/import-clothing.mjs
```

## Features

- **Shoe collections** — Kids, 7–7.5 through 13–13.5, and size 14 (178+ products from live store)
- **Clothing** — T-shirts and hoodies with real images and size options from live store
- **Clothing** — T-Shirts and Hoodies
- **Cart** — Persists in `localStorage`
- **Search** — Quick product lookup
- **Filters** — Availability and sort on collection pages

## Theme

Dark editorial layout with flame orange (`#ff5c2b`) accents, Syne + Instrument Sans typography — intentionally different from the current light blue luhun.store look.

## Note

This is a static demo. Product images use Unsplash placeholders. Connect to Shopify or your backend for production checkout.
