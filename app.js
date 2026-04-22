let PRODUCTS = [];
let CATEGORIES = [];
let BANNERS = [];
let cart = JSON.parse(localStorage.getItem("velore_cart") || "[]");
let selectedCategory = null;
let currentLang = localStorage.getItem("velore_lang") || "en";

const translations = {
  en: {
    shopByCategory: "Shop by Category",
    featured: "Featured Products",
    search: "Search products...",
    tagline: "Luxury that feels calm, soft, and timeless.",
    noCategories: "No categories yet.",
    noProducts: "No products yet.",
    emptyCart: "Your cart is empty.",
    orderReceived: "Order received ✅",
    clearCart: "Clear cart",
    remove: "Remove",
    readMore: "Read more"
  },
  ar: {
    shopByCategory: "تسوّق حسب الفئة",
    featured: "المنتجات",
    search: "ابحث عن المنتجات...",
    tagline: "فخامة هادئة ومريحة وأنيقة.",
    noCategories: "لا توجد فئات بعد.",
    noProducts: "لا توجد منتجات بعد.",
    emptyCart: "السلة فارغة.",
    orderReceived: "تم استلام الطلب ✅",
    clearCart: "تفريغ السلة",
    remove: "حذف",
    readMore: "اقرأ المزيد"
  },
  fr: {
    shopByCategory: "Acheter par catégorie",
    featured: "Produits",
    search: "Rechercher des produits...",
    tagline: "Un luxe doux, calme et intemporel.",
    noCategories: "Aucune catégorie pour le moment.",
    noProducts: "Aucun produit pour le moment.",
    emptyCart: "Le panier est vide.",
    orderReceived: "Commande reçue ✅",
    clearCart: "Vider le panier",
    remove: "Supprimer",
    readMore: "Voir plus"
  }
};

const grid = document.getElementById("productGrid");
const categoryGrid = document.getElementById("categoryGrid");
const cartDialog = document.getElementById("cartDialog");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");
const heroSlider = document.getElementById("heroSlider");
const sliderDots = document.getElementById("sliderDots");

const globeBtn = document.getElementById("globeBtn");
const langMenu = document.getElementById("langMenu");
const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");

const offerPopup = document.getElementById("offerPopup");
const offerPopupContent = document.getElementById("offerPopupContent");
const closeOfferPopup = document.getElementById("closeOfferPopup");

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

function saveCart() {
  localStorage.setItem("velore_cart", JSON.stringify(cart));
}

async function loadCategories() {
  const res = await fetch("/api/categories");
  CATEGORIES = await res.json();
}

async function loadProducts() {
  const res = await fetch("/api/products");
  PRODUCTS = await res.json();
}

async function loadBanners() {
  const res = await fetch("/api/banners");
  BANNERS = await res.json();
}

function getFilteredProducts() {
  const q = (searchInput?.value || "").trim().toLowerCase();

  return PRODUCTS.filter((p) => {
    const productCategories = Array.isArray(p.categories) && p.categories.length
      ? p.categories
      : [p.category].filter(Boolean);

    const categoryOk = !selectedCategory || productCategories.includes(selectedCategory);
    const searchOk =
      !q ||
      String(p.title || "").toLowerCase().includes(q) ||
      String(p.description || "").toLowerCase().includes(q);

    return categoryOk && searchOk;
  });
}

function renderCategories() {
  categoryGrid.innerHTML = "";

  if (!CATEGORIES.length) {
    categoryGrid.innerHTML = `<div class="admin-card">${t("noCategories")}</div>`;
    return;
  }

  categoryGrid.innerHTML = CATEGORIES.map((cat) => `
    <button class="category-pill ${selectedCategory === cat.title ? "active-pill" : ""}" data-category="${cat.title}">
      ${cat.title}
    </button>
  `).join("");

  categoryGrid.querySelectorAll(".category-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.category === selectedCategory ? null : btn.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const items = getFilteredProducts();
  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = `<div class="admin-card">${t("noProducts")}</div>`;
    return;
  }

  grid.innerHTML = items.map((p) => {
    const productCategories = Array.isArray(p.categories) && p.categories.length
      ? p.categories.join(" • ")
      : (p.category || "");

    return `
      <div class="card">
        <img src="${p.image || ""}" alt="${p.title}" data-product="${p.id}" onerror="this.style.display='none'">
        <div class="p">
          <b>${p.title}</b>
          <div class="muted-text">${productCategories}</div>
          <div class="read-more-line">
            <a href="/product.html?id=${p.id}" class="read-more-link">${t("readMore")}</a>
          </div>
          <div class="price-row">
            ${p.old_price ? `<span class="old-price">${money(p.old_price)} $</span>` : ""}
            <div class="price">${money(p.price)} $</div>
          </div>
        </div>
        <button data-cart="${p.id}" ${Number(p.stock || 0) <= 0 ? "disabled" : ""}>
          ${Number(p.stock || 0) <= 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-cart]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.cart)));
  });

  grid.querySelectorAll("[data-product]").forEach((img) => {
    img.addEventListener("click", () => {
      window.location.href = `/product.html?id=${img.dataset.product}`;
    });
  });
}

function renderBanners() {
  heroSlider.innerHTML = "";
  sliderDots.innerHTML = "";

  if (!BANNERS.length) {
    heroSlider.innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#8a8a8a;font-size:20px;">
        VELORÉ
      </div>
    `;
    return;
  }

  BANNERS.forEach((banner, index) => {
    const img = document.createElement("img");
    img.src = banner.image;
    img.className = "slide" + (index === 0 ? " active" : "");
    img.onerror = () => { img.style.display = "none"; };
    heroSlider.appendChild(img);

    const dot = document.createElement("div");
    dot.className = "dot" + (index === 0 ? " active" : "");
    dot.addEventListener("click", () => goToSlide(index));
    sliderDots.appendChild(dot);
  });

  startSlider();
}

function addToCart(id) {
  const product = PRODUCTS.find((p) => Number(p.id) === Number(id));
  if (!product) return false;

  const existing = cart.find((x) => x.product_id === id);
  const currentQty = existing ? existing.qty : 0;

  if (currentQty + 1 > Number(product.stock || 0)) {
    alert(`Only ${product.stock} left in stock`);
    return false;
  }

  if (existing) existing.qty += 1;
  else cart.push({ product_id: id, qty: 1 });

  saveCart();
  updateCartCount();
  return true;
}

function removeFromCart(id) {
  cart = cart.filter((x) => x.product_id !== id);
  saveCart();
  renderCart();
  updateCartCount();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  updateCartCount();
}

function updateCartCount() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  let total = 0;

  if (!cart.length) {
    cartItems.innerHTML = `<div class="admin-card">${t("emptyCart")}</div>`;
    cartTotal.textContent = "0.00";
    return;
  }

  cartItems.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
      <button id="clearCartBtn" class="ghost-btn">${t("clearCart")}</button>
    </div>
    ${cart.map((item) => {
      const product = PRODUCTS.find((p) => p.id === item.product_id);
      if (!product) return "";

      total += Number(product.price || 0) * item.qty;

      return `
        <div class="row">
          <div>
            <b>${product.title}</b>
            <div class="muted-text">${money(product.price)} $</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button class="ghost-btn" data-minus="${product.id}">-</button>
            <b>${item.qty}</b>
            <button class="ghost-btn" data-plus="${product.id}">+</button>
            <button class="ghost-btn" data-remove="${product.id}">${t("remove")}</button>
          </div>
        </div>
      `;
    }).join("")}
  `;

  cartTotal.textContent = money(total);

  document.getElementById("clearCartBtn")?.addEventListener("click", clearCart);

  cartItems.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      const item = cart.find((x) => x.product_id === id);
      if (!item) return;
      item.qty = Math.max(1, item.qty - 1);
      saveCart();
      renderCart();
      updateCartCount();
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.plus);
      const item = cart.find((x) => x.product_id === id);
      const product = PRODUCTS.find((p) => p.id === id);
      if (!item || !product) return;

      if (item.qty + 1 > Number(product.stock || 0)) {
        alert(`Only ${product.stock} left in stock`);
        return;
      }

      item.qty += 1;
      saveCart();
      renderCart();
      updateCartCount();
    });
  });

  cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.remove));
    });
  });
}

document.getElementById("openCartBtn")?.addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});

document.getElementById("closeCartBtn")?.addEventListener("click", () => {
  cartDialog.close();
});

searchInput?.addEventListener("input", () => {
  renderProducts();
});

document.getElementById("checkoutForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!cart.length) {
    alert(t("emptyCart"));
    return;
  }

  const fd = new FormData(e.target);

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      address: fd.get("address"),
      payment_method: fd.get("payment"),
      items: cart
    })
  });

  const text = await res.text();
  let data = {};

  try {
    data = JSON.parse(text);
  } catch {
    alert(text || "Order failed");
    return;
  }

  if (!res.ok) {
    alert(data.error || data.details || "Order failed");
    return;
  }

  if (data.whatsappLink) {
    window.open(data.whatsappLink, "_blank");
  }

  cart = [];
  saveCart();
  updateCartCount();
  cartDialog.close();
  e.target.reset();
  await loadProducts();
  renderProducts();
  alert(t("orderReceived"));
});

let slideIndex = 0;
let timer = null;

function goToSlide(index) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  if (!slides.length) return;

  slides[slideIndex]?.classList.remove("active");
  dots[slideIndex]?.classList.remove("active");
  slideIndex = index;
  slides[slideIndex]?.classList.add("active");
  dots[slideIndex]?.classList.add("active");
}

function startSlider() {
  clearInterval(timer);
  const slides = document.querySelectorAll(".slide");
  if (slides.length <= 1) return;

  timer = setInterval(() => {
    goToSlide((slideIndex + 1) % slides.length);
  }, 4000);
}

function renderLanguage() {
  document.querySelector("[data-i18n='shopByCategory']").textContent = t("shopByCategory");
  document.querySelector("[data-i18n='featured']").textContent = t("featured");
  document.querySelector("[data-i18n='tagline']").textContent = t("tagline");
  if (searchInput) searchInput.placeholder = t("search");
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  renderProducts();
}

document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("velore_lang", currentLang);
    renderLanguage();
    closeMenus();
  });
});

function closeMenus() {
  langMenu?.classList.remove("open");
  moreMenu?.classList.remove("open");
}

globeBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  moreMenu?.classList.remove("open");
  langMenu?.classList.toggle("open");
});

moreBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  langMenu?.classList.remove("open");
  moreMenu?.classList.toggle("open");
});

document.addEventListener("click", () => {
  closeMenus();
});

function openOfferPopup() {
  const offerProduct = PRODUCTS.find((p) => p.show_popup === true);
  if (!offerProduct || !offerPopup || !offerPopupContent) return;

  const image = (Array.isArray(offerProduct.images) && offerProduct.images[0]) || offerProduct.image || "";

  offerPopupContent.innerHTML = `
    <img src="${image}" alt="${offerProduct.title}" class="offer-popup-image" onerror="this.style.display='none'">
    <div class="offer-popup-badge">Special Offer</div>
    <h3 class="offer-popup-title">${offerProduct.title}</h3>
    <div class="price-row" style="justify-content:center;">
      ${offerProduct.old_price ? `<span class="old-price">${money(offerProduct.old_price)} $</span>` : ""}
      <div class="price">${money(offerProduct.price)} $</div>
    </div>
    <div class="offer-popup-actions">
      <button id="offerPopupAdd" class="primary-btn" type="button">Add to cart</button>
      <button id="offerPopupGo" class="ghost-btn" type="button">${t("readMore")}</button>
    </div>
  `;

  offerPopup.style.display = "flex";

  document.getElementById("offerPopupGo")?.addEventListener("click", () => {
    window.location.href = `/product.html?id=${offerProduct.id}`;
  });

  document.getElementById("offerPopupAdd")?.addEventListener("click", () => {
    const ok = addToCart(Number(offerProduct.id));
    if (ok) {
      offerPopup.style.display = "none";
    }
  });
}

closeOfferPopup?.addEventListener("click", () => {
  offerPopup.style.display = "none";
});

async function init() {
  await Promise.all([loadCategories(), loadProducts(), loadBanners()]);
  renderCategories();
  renderProducts();
  renderBanners();
  renderLanguage();
  updateCartCount();

  setTimeout(() => {
    openOfferPopup();
  }, 900);
}

init();