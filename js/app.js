import {
  loadProducts,
  getProductById,
  getCatalogSource,
  SHOE_SIZES,
  CLOTHING_TYPES,
  formatPrice,
  getProductsByRoute,
  getCollectionTitle,
  getFeaturedProducts,
  CONTAIN_IMAGE_IDS,
} from "./products.js";
import { submitCheckout, trackOrder } from "./api.js";
import { getApiBase } from "./config.js";

const CART_KEY = "luhun-cart";

const SHOP_CATEGORIES = [
  { id: "shoes", label: "Shoes", href: "#/shoes" },
  { id: "tees", label: "T-Shirts", href: "#/clothing/tees" },
  { id: "hoodies", label: "Hoodies", href: "#/clothing/hoodies" },
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const viewHome = $("#view-home");
const viewShoesSizes = $("#view-shoes-sizes");
const viewCollection = $("#view-collection");
const viewTrack = $("#view-track");
const featuredGrid = $("#featured-grid");
const collectionGrid = $("#collection-grid");
const collectionTitle = $("#collection-title");
const productCount = $("#product-count");
const breadcrumbs = $("#breadcrumbs");
const emptyState = $("#empty-state");
const cartCountEl = $("#cart-count");
const cartBody = $("#cart-body");
const cartFooter = $("#cart-footer");
const cartTotal = $("#cart-total");
const cartDrawer = $("#cart-drawer");
let cartView = "cart"; // "cart" | "checkout"
const toast = $("#toast");

let currentRoute = parseHash();
let collectionProducts = [];

function parseHash() {
  const raw = (location.hash || "#/").slice(1);
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "shoes") {
    if (parts[1]) return { view: "shoes", sizeId: parts[1] };
    return { view: "shoes-index" };
  }
  if (parts[0] === "clothing" && parts[1]) {
    return { view: "clothing", clothingId: parts[1] };
  }
  if (parts[0] === "track") {
    return { view: "track", orderNumber: parts[1] ? decodeURIComponent(parts[1]) : null };
  }
  return { view: "home" };
}

function getActiveShopCategory(route) {
  if (route.view === "shoes-index" || route.view === "shoes") return "shoes";
  if (route.view === "clothing" && route.clothingId === "hoodies") return "hoodies";
  if (route.view === "clothing") return "tees";
  return null;
}

function renderShopCategoryNav(route) {
  const active = getActiveShopCategory(route);
  if (!active) return;

  const html = SHOP_CATEGORIES.map((cat) => {
    const isActive = cat.id === active;
    return `<a href="${cat.href}" class="shop-tab${isActive ? " is-active" : ""}"${
      isActive ? ' aria-current="page"' : ""
    }>${cat.label}</a>`;
  }).join("");

  $$(".shop-category-nav").forEach((nav) => {
    nav.innerHTML = html;
  });
}

function renderShoeSizeChips(container, activeSizeId) {
  if (!container) return;
  container.innerHTML = SHOE_SIZES.map((s) => {
    const isActive = s.id === activeSizeId;
    return `<a href="#/shoes/${s.id}" class="size-chip${isActive ? " is-active" : ""}"${
      isActive ? ' aria-current="page"' : ""
    }>${s.label}</a>`;
  }).join("");
}

function buildNavMenus() {
  const shoeLinks = SHOE_SIZES.map(
    (s) => `<li><a href="#/shoes/${s.id}">${s.label}</a></li>`
  ).join("");

  $("#shoes-menu-mobile").innerHTML = shoeLinks;
  $("#footer-shoes-links").innerHTML = SHOE_SIZES.map(
    (s) => `<li><a href="#/shoes/${s.id}">${s.label}</a></li>`
  ).join("");

  renderShoeSizeChips($("#size-chips-shoes"));
}

function renderProductCard(product) {
  const badgeClass =
    product.badge === "sold-out"
      ? "product-badge--sold-out"
      : "product-badge--sale";
  const badgeText = product.soldOut ? "Sold out" : "Sale";
  const sizeLabel =
    product.category === "shoes"
      ? `Size ${product.size}`
      : product.sizes?.join(" · ") ?? "";
  const btnLabel = product.soldOut
    ? "Sold out"
    : product.sizes?.length
      ? "Choose options"
      : "Add to cart";
  const containImg = CONTAIN_IMAGE_IDS.has(product.id);

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-media${containImg ? " product-card-media--contain" : ""}">
        <span class="product-badge ${badgeClass}">${badgeText}</span>
        <img src="${product.image}" alt="${product.name}" loading="lazy" width="600" height="600"${containImg ? ' class="product-img--contain"' : ""} />
      </div>
      <div class="product-card-body">
        <h3>${product.name}</h3>
        ${sizeLabel ? `<p class="product-card-size" style="margin:0;font-size:0.8rem;color:var(--muted)">${sizeLabel}</p>` : ""}
        <div class="product-price">
          <strong>${formatPrice(product.price)}</strong>
          ${product.compareAt ? `<s>${formatPrice(product.compareAt)}</s>` : ""}
        </div>
        <div class="product-card-actions">
          <button
            type="button"
            class="btn btn-outline add-to-cart"
            data-id="${product.id}"
            ${product.soldOut ? "disabled" : ""}
          >${btnLabel}</button>
        </div>
      </div>
    </article>
  `;
}

function bindProductCards(root) {
  root.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const product = getProductById(id);
      if (!product || product.soldOut) return;

      if (product.sizes?.length > 1) {
        const size = prompt(
          `Select size for ${product.name}:\n${product.sizes.join(", ")}`,
          product.sizes[0]
        );
        if (!size || !product.sizes.includes(size)) {
          showToast("Please pick a valid size.");
          return;
        }
        await addToCart(product, size);
      } else {
        const variant =
          product.category === "shoes"
            ? `Size ${product.size}`
            : product.sizes?.[0] ?? "One Size";
        await addToCart(product, variant);
      }
    });
  });
}

function renderGrid(container, products) {
  if (!container) return;
  container.innerHTML = products.map(renderProductCard).join("");
  bindProductCards(container);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product, variant) {
  let variantId = product.variantId;
  if (product.category === "clothing" && product.variants?.length) {
    variantId = product.variants.find((v) => v.size === variant)?.id || variantId;
  }

  const cart = getCart();
  const existing = cart.find(
    (l) => l.id === product.id && l.variant === variant
  );
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      variantId,
      name: product.name,
      price: product.price,
      image: product.image,
      variant,
      qty: 1,
    });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart`);
  openCart();
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function cartSubtotal(cart) {
  return cart.reduce((sum, l) => sum + l.price * l.qty, 0);
}

function restoreCartFooter() {
  const footer = $("#cart-footer");
  if (!footer || footer.querySelector("#checkout-btn")) return;
  footer.innerHTML = `
    <div class="cart-total-row">
      <span>Estimated total</span>
      <strong id="cart-total">$0.00</strong>
    </div>
    <p class="cart-note">Taxes &amp; shipping calculated at checkout</p>
    <button type="button" class="btn btn-primary btn-block" id="checkout-btn">Check out</button>
    <button type="button" class="btn btn-ghost btn-block" id="cart-continue">Continue shopping</button>
  `;
  $("#checkout-btn")?.addEventListener("click", showCheckoutView);
  $("#cart-continue")?.addEventListener("click", closeCart);
}

function updateCartUI() {
  if (cartView === "checkout") return;
  restoreCartFooter();
  const cart = getCart();
  const count = cart.reduce((n, l) => n + l.qty, 0);

  if (count > 0) {
    cartCountEl.textContent = String(count);
    cartCountEl.hidden = false;
  } else {
    cartCountEl.hidden = true;
  }

  if (cart.length === 0) {
    cartBody.innerHTML =
      '<p class="cart-empty">Your cart is empty. <a href="#/shoes/8">Continue shopping</a></p>';
    cartFooter.hidden = true;
    return;
  }

  cartBody.innerHTML = cart
    .map(
      (line, i) => `
    <div class="cart-line">
      <img src="${line.image}" alt="" width="72" height="72" />
      <div>
        <h4>${line.name}</h4>
        <p class="cart-line-meta">${line.variant} · Qty ${line.qty}</p>
        <button type="button" class="cart-remove" data-index="${i}">Remove</button>
      </div>
      <span class="cart-line-price">${formatPrice(line.price * line.qty)}</span>
    </div>
  `
    )
    .join("");

  cartBody.querySelectorAll(".cart-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.getAttribute("data-index")));
    });
  });

  const totalEl = $("#cart-total");
  if (totalEl) totalEl.textContent = formatPrice(cartSubtotal(cart));
  cartFooter.hidden = false;
}

function openCart() {
  cartView = "cart";
  updateCartUI();
  cartDrawer.hidden = false;
  document.body.style.overflow = "hidden";
  $("#cart-title").textContent = "Your cart";
  $("#cart-close")?.focus();
}

function closeCart() {
  cartDrawer.hidden = true;
  document.body.style.overflow = "";
  cartView = "cart";
  updateCartUI();
}

function showCheckoutView() {
  const cart = getCart();
  if (!cart.length) return;

  cartView = "checkout";
  $("#cart-title").textContent = "Checkout";
  cartFooter.hidden = false;

  cartBody.innerHTML = `
    <form class="cart-checkout-form" id="checkout-form">
      <p class="cart-checkout-hint">
        ${
          getCatalogSource() === "crm"
            ? "Your order is sent to the Luhun admin CRM. You'll receive confirmation by email when SMTP is configured."
            : "Connect the CRM backend to sync orders. Set <code>meta name=\"luhun-api\"</code> to your API URL."
        }
      </p>
      <label for="checkout-email">Email</label>
      <input id="checkout-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email" />
      <label for="checkout-name">Full name</label>
      <input id="checkout-name" name="name" type="text" required placeholder="Your name" autocomplete="name" />
    </form>
  `;

  cartFooter.innerHTML = `
    <div class="cart-total-row">
      <span>Total</span>
      <strong>${formatPrice(cartSubtotal(cart))}</strong>
    </div>
    <button type="submit" form="checkout-form" class="btn btn-primary btn-block" id="place-order-btn">
      ${getCatalogSource() === "crm" ? "Place order" : "Place order (offline demo)"}
    </button>
    <button type="button" class="btn btn-ghost btn-block" id="checkout-back">
      Back to cart
    </button>
  `;

  $("#checkout-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    const name = new FormData(e.target).get("name");
    const total = cartSubtotal(cart);
    const btn = $("#place-order-btn");
    if (btn) btn.disabled = true;

    try {
      if (getCatalogSource() === "crm") {
        const items = cart
          .filter((l) => l.variantId)
          .map((l) => ({ variantId: l.variantId, quantity: l.qty }));
        if (!items.length) {
          throw new Error("Cart items missing CRM variant IDs — refresh and try again.");
        }
        const result = await submitCheckout({ email, name, items });
        sessionStorage.setItem("luhun_track_email", String(email));
        sessionStorage.setItem("luhun_last_order", result.orderNumber);
        saveCart([]);
        cartView = "cart";
        cartBody.innerHTML = `
          <div class="cart-checkout-success">
            <h3>Order placed</h3>
            <p class="cart-checkout-hint">Order <strong class="mono">${escHtml(result.orderNumber)}</strong><br/>Total: ${formatPrice(result.totalCents / 100)}</p>
            <a class="btn btn-primary" href="#/track/${encodeURIComponent(result.orderNumber)}" style="margin-top:1rem;display:inline-flex">Track your order</a>
          </div>
        `;
        cartFooter.hidden = true;
        $("#cart-title").textContent = "Thank you";
        showToast(`Order ${result.orderNumber} created in CRM`);
      } else {
        saveCart([]);
        cartView = "cart";
        cartBody.innerHTML = `
          <div class="cart-checkout-success">
            <h3>Demo order saved</h3>
            <p class="cart-checkout-hint">Offline mode — start the CRM backend and reload to sync orders.</p>
          </div>
        `;
        cartFooter.hidden = true;
        $("#cart-title").textContent = "Thank you";
        showToast("Demo order (CRM not connected)");
      }
    } catch (err) {
      showToast(err.message, "bad");
      if (btn) btn.disabled = false;
    }
  });

  $("#checkout-back")?.addEventListener("click", () => {
    cartView = "cart";
    restoreCartFooter();
    $("#cart-title").textContent = "Your cart";
    updateCartUI();
  });
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function filterAndSort(products) {
  const avail = $("#filter-availability")?.value ?? "all";
  const sort = $("#filter-sort")?.value ?? "featured";
  let list = [...products];

  if (avail === "in-stock") list = list.filter((p) => !p.soldOut);
  if (avail === "sale") list = list.filter((p) => p.badge === "sale" && !p.soldOut);

  switch (sort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }
  return list;
}

function hideAllViews() {
  viewHome.hidden = true;
  viewShoesSizes.hidden = true;
  viewCollection.hidden = true;
  if (viewTrack) viewTrack.hidden = true;
}

function formatOrderStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderTrackResult(order) {
  const timelineHtml = (order.timeline || [])
    .map((step) => {
      const cls =
        step.state === "done"
          ? "track-step track-step--done"
          : step.state === "current"
            ? "track-step track-step--current"
            : step.state === "skipped"
              ? "track-step track-step--skipped"
              : "track-step";
      const date = step.date
        ? new Date(step.date).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "";
      return `<li class="${cls}">
        <div class="track-step-dot" aria-hidden="true"></div>
        <div class="track-step-body">
          <strong>${escHtml(step.label)}</strong>
          <p>${escHtml(step.detail || "")}</p>
          ${date ? `<time>${escHtml(date)}</time>` : ""}
        </div>
      </li>`;
    })
    .join("");

  const itemsHtml = (order.items || [])
    .map(
      (it) => `<li>
        <span>${escHtml(it.title)}${it.variantTitle ? ` · ${escHtml(it.variantTitle)}` : ""} × ${it.quantity}</span>
        <span>${formatPrice(it.totalCents / 100)}</span>
      </li>`
    )
    .join("");

  return `
    <div class="track-card">
      <div class="track-card-head">
        <div>
          <p class="track-label">Order</p>
          <p class="track-order-num mono">${escHtml(order.orderNumber)}</p>
        </div>
        <span class="track-status-badge">${escHtml(formatOrderStatus(order.status))}</span>
      </div>
      <div class="track-meta">
        <span>Payment: ${escHtml(formatOrderStatus(order.paymentStatus))}</span>
        <span>Fulfillment: ${escHtml(formatOrderStatus(order.fulfillmentStatus))}</span>
        <span>Total: ${formatPrice(order.totalCents / 100)}</span>
      </div>
      ${
        order.trackingUrl
          ? `<a class="btn btn-outline track-tracking-btn" href="${escHtml(order.trackingUrl)}" target="_blank" rel="noopener noreferrer">Track shipment</a>`
          : order.trackingNumber
            ? `<p class="track-tracking">Tracking: <strong class="mono">${escHtml(order.trackingNumber)}</strong>${order.trackingCarrier ? ` · ${escHtml(order.trackingCarrier)}` : ""}</p>`
            : ""
      }
    </div>
    <div class="track-grid">
      <section class="track-panel">
        <h2>Order status</h2>
        <ol class="track-timeline">${timelineHtml}</ol>
      </section>
      <section class="track-panel">
        <h2>Items</h2>
        <ul class="track-items">${itemsHtml}</ul>
      </section>
    </div>`;
}

async function lookupOrder(orderNumber, email, { scroll = true } = {}) {
  const errEl = $("#track-error");
  const resultEl = $("#track-result");
  const submitBtn = $("#track-submit");
  if (errEl) errEl.hidden = true;
  if (resultEl) resultEl.hidden = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const order = await trackOrder({ orderNumber, email });
    sessionStorage.setItem("luhun_track_email", email);
    if (resultEl) {
      resultEl.innerHTML = renderTrackResult(order);
      resultEl.hidden = false;
    }
    if (scroll && resultEl) {
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function renderTrackPage() {
  const form = $("#track-form");
  const orderInput = $("#track-order-number");
  const emailInput = $("#track-email");
  const errEl = $("#track-error");
  const resultEl = $("#track-result");

  if (errEl) errEl.hidden = true;
  if (resultEl) {
    resultEl.hidden = true;
    resultEl.innerHTML = "";
  }

  const savedEmail = sessionStorage.getItem("luhun_track_email") || "";
  const lastOrder = sessionStorage.getItem("luhun_last_order") || "";
  if (emailInput && savedEmail) emailInput.value = savedEmail;
  if (orderInput) {
    orderInput.value = currentRoute.orderNumber || lastOrder || orderInput.value || "";
  }

  if (!form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      lookupOrder(String(fd.get("orderNumber")).trim(), String(fd.get("email")).trim());
    });
  }

  if (currentRoute.orderNumber && (emailInput?.value || savedEmail)) {
    lookupOrder(
      currentRoute.orderNumber,
      emailInput?.value || savedEmail,
      { scroll: false }
    );
  }
}

function renderCollection() {
  collectionProducts = getProductsByRoute(currentRoute);
  const title = getCollectionTitle(currentRoute);
  collectionTitle.textContent = title;
  renderShopCategoryNav(currentRoute);

  const subnav = $("#collection-subnav");
  if (currentRoute.view === "shoes" && currentRoute.sizeId) {
    subnav.hidden = false;
    subnav.innerHTML =
      '<p class="collection-subnav-label">Shoe size</p><div class="size-chips size-chips--subnav"></div>';
    renderShoeSizeChips($(".size-chips--subnav", subnav), currentRoute.sizeId);
  } else {
    subnav.hidden = true;
    subnav.innerHTML = "";
  }

  const crumbs = [
    `<a href="#/">Home</a>`,
    currentRoute.view === "shoes"
      ? `<span> / </span><a href="#/shoes">Shoes</a>`
      : `<span> / </span><span>Clothing</span>`,
    `<span> / </span><span>${title}</span>`,
  ];
  breadcrumbs.innerHTML = crumbs.join("");

  refreshCollectionGrid();
}

function refreshCollectionGrid() {
  const filtered = filterAndSort(collectionProducts);
  productCount.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  emptyState.hidden = filtered.length > 0;
  collectionGrid.hidden = filtered.length === 0;
  renderGrid(collectionGrid, filtered);
}

function navigate() {
  currentRoute = parseHash();
  closeMobileMenu();

  if (currentRoute.view === "home") {
    hideAllViews();
    viewHome.hidden = false;
    document.title = "Luhun Official — Shoes, Tees & Hoodies";
    renderFeatured();
    return;
  }

  if (currentRoute.view === "shoes-index") {
    hideAllViews();
    viewShoesSizes.hidden = false;
    document.title = "Shoes — Luhun Official";
    renderShopCategoryNav(currentRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (currentRoute.view === "track") {
    hideAllViews();
    if (viewTrack) viewTrack.hidden = false;
    document.title = "Track order — Luhun Official";
    renderTrackPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  hideAllViews();
  viewCollection.hidden = false;
  document.title = `${getCollectionTitle(currentRoute)} — Luhun Official`;
  renderCollection();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderFeatured() {
  renderGrid(featuredGrid, getFeaturedProducts());
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      toast.hidden = true;
    }, 400);
  }, 3200);
}

function closeMobileMenu() {
  const nav = $("#mobile-nav");
  const toggle = $("#menu-toggle");
  if (nav && !nav.hidden) {
    nav.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
  }
}

function initEvents() {
  window.addEventListener("hashchange", navigate);

  $("#menu-toggle")?.addEventListener("click", () => {
    const nav = $("#mobile-nav");
    const open = nav.hidden;
    nav.hidden = !open;
    $("#menu-toggle").setAttribute("aria-expanded", String(open));
  });

  $$("#mobile-nav a, [data-nav]").forEach((a) => {
    a.addEventListener("click", closeMobileMenu);
  });

  $("#filter-availability")?.addEventListener("change", refreshCollectionGrid);
  $("#filter-sort")?.addEventListener("change", refreshCollectionGrid);

  $("#cart-open")?.addEventListener("click", openCart);
  $("#cart-close")?.addEventListener("click", closeCart);
  $("#cart-backdrop")?.addEventListener("click", closeCart);
  $("#cart-continue")?.addEventListener("click", closeCart);

  $("#checkout-btn")?.addEventListener("click", showCheckoutView);

  $("#newsletter-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    showToast(`Thanks! We'll keep ${email} in the loop.`);
    e.target.reset();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cartDrawer.hidden) closeCart();
  });
}

function initStoreSlideshow() {
  const slides = $$(".store-slide");
  const dots = $$(".store-dot");
  const counter = $("#store-counter");
  const prev = $("#store-prev");
  const next = $("#store-next");
  if (!slides.length) return;

  let index = 0;
  let timer;

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, n) => {
      slide.classList.toggle("is-active", n === index);
      slide.setAttribute("aria-hidden", n === index ? "false" : "true");
    });
    dots.forEach((dot, n) => {
      dot.classList.toggle("is-active", n === index);
      dot.setAttribute("aria-selected", n === index ? "true" : "false");
    });
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 6000);
  }

  prev?.addEventListener("click", () => {
    goTo(index - 1);
    startAutoplay();
  });
  next?.addEventListener("click", () => {
    goTo(index + 1);
    startAutoplay();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.getAttribute("data-goto")));
      startAutoplay();
    });
  });

  slides.forEach((s, n) => s.setAttribute("aria-hidden", n === 0 ? "false" : "true"));
  goTo(0);
  startAutoplay();
}

buildNavMenus();
initEvents();
initStoreSlideshow();
updateCartUI();

function setCrmStatus(ok, message) {
  const el = $("#crm-status");
  if (!el) return;
  el.classList.remove("crm-status--hidden", "crm-status--ok", "crm-status--err");
  if (ok) {
    el.classList.add("crm-status--ok");
    el.innerHTML = message;
  } else {
    el.classList.add("crm-status--err");
    el.innerHTML = message;
  }
}

async function boot() {
  const ann = $("#announcement-text");
  if (ann) ann.textContent = "Loading catalog…";
  setCrmStatus(true, "Connecting to CRM…");

  try {
    await loadProducts();
    const source = getCatalogSource();
    if (ann) {
      ann.textContent =
        source === "crm"
          ? "Live inventory · synced with admin CRM"
          : "Free shipping on $99+ orders";
    }
    if (source === "crm") {
      setCrmStatus(true, "✓ Connected to CRM — orders sync to admin");
      setTimeout(() => $("#crm-status")?.classList.add("crm-status--hidden"), 4000);
    } else {
      setCrmStatus(
        false,
        'CRM offline — using local catalog. Open <a href="http://localhost:4000/store">localhost:4000/store</a> with backend running, or add <code>?api=YOUR_BACKEND_URL</code>'
      );
    }
    updateCartUI();
    navigate();
  } catch (err) {
    console.error(err);
    if (ann) ann.textContent = "Free shipping on $99+ orders";
    setCrmStatus(
      false,
      `Cannot reach CRM (${escHtml(err.message)}). Start backend: <code>node server.js</code> then open <a href="http://localhost:4000/store"><strong>localhost:4000/store</strong></a>`
    );
    navigate();
  }
}

boot();
