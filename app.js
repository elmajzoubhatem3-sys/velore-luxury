let PRODUCTS = [];
let CATEGORIES = [];
let BANNERS = [];
let cart = [];
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
    orderReceived: "Order received ✅"
  },
  ar: {
    shopByCategory: "تسوّق حسب الفئة",
    featured: "المنتجات",
    search: "ابحث عن المنتجات...",
    tagline: "فخامة هادئة ومريحة وأنيقة.",
    noCategories: "لا توجد فئات بعد.",
    noProducts: "لا توجد منتجات بعد.",
    emptyCart: "السلة فارغة.",
    orderReceived: "تم استلام الطلب ✅"
  },
  fr: {
    shopByCategory: "Acheter par catégorie",
    featured: "Produits",
    search: "Rechercher des produits...",
    tagline: "Un luxe doux, calme et intemporel.",
    noCategories: "Aucune catégorie pour le moment.",
    noProducts: "Aucun produit pour le moment.",
    emptyCart: "Le panier est vide.",
    orderReceived: "Commande reçue ✅"
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

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

async function loadCategories() {
  const res = await fetch("/api/categories");
  CATEGORIES = await res.json();
}

async function loadProducts() {
  const qs = new URLSearchParams();
  if (selectedCategory) qs.set("category", selectedCategory);
  const q = (searchInput?.value || "").trim();
  if (q) qs.set("q", q);

  const res = await fetch(`/api/products?${qs.toString()}`);
  PRODUCTS = await res.json();
}

async function loadBanners() {
  const res = await fetch("/api/banners");
  BANNERS = await res.json();
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
    btn.addEventListener("click", async () => {
      selectedCategory = btn.dataset.category === selectedCategory ? null : btn.dataset.category;
      await loadProducts();
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  grid.innerHTML = "";

  if (!PRODUCTS.length) {
    grid.innerHTML = `<div class="admin-card">${t("noProducts")}</div>`;
    return;
  }

  grid.innerHTML = PRODUCTS.map((p) => `
    <div class="card">
      <img src="${p.image || ""}" alt="${p.title}" data-product="${p.id}" onerror="this.style.display='none'">
      <div class="p">
        <b>${p.title}</b>
        <div class="muted-text">${p.category || ""}</div>
        <div class="price">${money(p.price)} $</div>
      </div>
      <button data-cart="${p.id}">Add to cart</button>
    </div>
  `).join("");

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
  const existing = cart.find((x) => x.product_id === id);
  if (existing) existing.qty += 1;
  else cart.push({ product_id: id, qty: 1 });
  updateCartCount();
}

function updateCartCount() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  let total = 0;

  cartItems.innerHTML = cart.map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.product_id);
    if (!product) return "";

    total += Number(product.price || 0) * item.qty;

    return `
      <div class="row">
        <div>
          <b>${product.title}</b>
          <div class="muted-text">${money(product.price)} $</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="ghost-btn" data-minus="${product.id}">-</button>
          <b>${item.qty}</b>
          <button class="ghost-btn" data-plus="${product.id}">+</button>
        </div>
      </div>
    `;
  }).join("");

  cartTotal.textContent = money(total);

  cartItems.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      const item = cart.find((x) => x.product_id === id);
      if (!item) return;
      item.qty = Math.max(1, item.qty - 1);
      renderCart();
      updateCartCount();
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.plus);
      const item = cart.find((x) => x.product_id === id);
      if (!item) return;
      item.qty += 1;
      renderCart();
      updateCartCount();
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

searchInput?.addEventListener("input", async () => {
  await loadProducts();
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

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Order failed");
    return;
  }

  if (data.whatsappLink) {
    window.open(data.whatsappLink, "_blank");
  }

  cart = [];
  updateCartCount();
  cartDialog.close();
  e.target.reset();
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

async function init() {
  await Promise.all([loadCategories(), loadProducts(), loadBanners()]);
  renderCategories();
  renderProducts();
  renderBanners();
  renderLanguage();
  updateCartCount();
}

init();