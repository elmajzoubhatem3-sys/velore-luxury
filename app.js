function getProducts() {
  return JSON.parse(localStorage.getItem("velore_products") || "[]");
}

function getCategories() {
  return JSON.parse(localStorage.getItem("velore_categories") || "[]");
}

function getBanners() {
  return JSON.parse(localStorage.getItem("velore_banners") || "[]");
}

function getOrders() {
  return JSON.parse(localStorage.getItem("velore_orders") || "[]");
}

function saveOrders(items) {
  localStorage.setItem("velore_orders", JSON.stringify(items));
}

let PRODUCTS = getProducts();
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

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

function filteredProducts() {
  PRODUCTS = getProducts();
  const q = (searchInput?.value || "").trim().toLowerCase();

  return PRODUCTS.filter((p) => {
    const categoryOk = !selectedCategory || p.category === selectedCategory;
    const searchOk = !q || String(p.title || "").toLowerCase().includes(q);
    return categoryOk && searchOk;
  });
}

function renderCategories() {
  const categories = getCategories();
  categoryGrid.innerHTML = "";

  if (!categories.length) {
    categoryGrid.innerHTML = `<div class="admin-card">${t("noCategories")}</div>`;
    return;
  }

  categoryGrid.innerHTML = categories.map((cat) => `
    <button class="category-pill" data-category="${cat}">${cat}</button>
  `).join("");

  categoryGrid.querySelectorAll(".category-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.category === selectedCategory ? null : btn.dataset.category;
      renderCategories();
      renderProducts();
    });

    if (btn.dataset.category === selectedCategory) {
      btn.classList.add("active-pill");
    }
  });
}

function renderProducts() {
  const items = filteredProducts();
  grid.innerHTML = "";

  if (!items.length) {
    grid.innerHTML = `<div class="admin-card">${t("noProducts")}</div>`;
    return;
  }

  grid.innerHTML = items.map((p) => `
    <div class="card">
      <img src="${p.image}" alt="${p.title}" data-product="${p.id}" onerror="this.style.display='none'">
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
      window.location.href = `/product/${img.dataset.product}`;
    });
  });
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

searchInput?.addEventListener("input", renderProducts);

document.getElementById("checkoutForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!cart.length) {
    alert(t("emptyCart"));
    return;
  }

  const fd = new FormData(e.target);
  const orders = getOrders();

  orders.unshift({
    id: Date.now(),
    name: fd.get("name"),
    phone: fd.get("phone"),
    address: fd.get("address"),
    payment_method: fd.get("payment"),
    items: cart.map((item) => {
      const p = PRODUCTS.find((x) => x.id === item.product_id);
      return `${p?.title || "Item"} x${item.qty}`;
    }).join(", "),
    total: cart.reduce((sum, item) => {
      const p = PRODUCTS.find((x) => x.id === item.product_id);
      return sum + ((Number(p?.price || 0)) * item.qty);
    }, 0).toFixed(2),
    created_at: new Date().toLocaleString()
  });

  saveOrders(orders);
  cart = [];
  updateCartCount();
  cartDialog.close();
  e.target.reset();
  alert(t("orderReceived"));
});

let slideIndex = 0;
let timer = null;

function renderBanners() {
  const banners = getBanners();
  heroSlider.innerHTML = "";
  sliderDots.innerHTML = "";

  if (!banners.length) {
    heroSlider.innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#8a8a8a;font-size:20px;">
        VELORÉ
      </div>
    `;
    return;
  }

  banners.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
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
    renderCategories();
    renderProducts();
  });
});

renderCategories();
renderProducts();
renderBanners();
renderLanguage();
updateCartCount();