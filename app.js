const DEFAULT_PRODUCTS = [
  {
    id: 1,
    title: "Velore Classic Heels",
    price: 39.99,
    category: "Shoes",
    image: "/image/products/shoe-1.jpg",
    description: "Elegant heels with a soft premium finish."
  },
  {
    id: 2,
    title: "Velore Signature Bag",
    price: 74.00,
    category: "Bags",
    image: "/image/products/bag-1.jpg",
    description: "Refined luxury bag for everyday elegance."
  },
  {
    id: 3,
    title: "Velore Soft Perfume",
    price: 29.50,
    category: "Perfume",
    image: "/image/products/perfume-1.jpg",
    description: "A calm, feminine scent with warm notes."
  }
];

const DEFAULT_CATEGORIES = [
  { title: "Shoes", image: "/image/category-shoes.jpg" },
  { title: "Bags", image: "/image/category-bags.jpg" },
  { title: "Perfume", image: "/image/category-perfume.jpg" }
];

const DEFAULT_BANNERS = [
  "/image/banner-1.jpg",
  "/image/banner-2.jpg"
];

function getProducts() {
  return JSON.parse(localStorage.getItem("velore_products") || "null") || DEFAULT_PRODUCTS;
}

function saveProducts(items) {
  localStorage.setItem("velore_products", JSON.stringify(items));
}

function getBanners() {
  return JSON.parse(localStorage.getItem("velore_banners") || "null") || DEFAULT_BANNERS;
}

function saveOrders(items) {
  localStorage.setItem("velore_orders", JSON.stringify(items));
}

function getOrders() {
  return JSON.parse(localStorage.getItem("velore_orders") || "[]");
}

let PRODUCTS = getProducts();
let cart = [];
let selectedCategory = null;

const grid = document.getElementById("productGrid");
const categoryGrid = document.getElementById("categoryGrid");
const cartDialog = document.getElementById("cartDialog");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");
const heroSlider = document.getElementById("heroSlider");
const sliderDots = document.getElementById("sliderDots");

function money(n) {
  return Number(n).toFixed(2);
}

function renderCategories() {
  categoryGrid.innerHTML = DEFAULT_CATEGORIES.map(cat => `
    <div class="category-card" data-category="${cat.title}">
      <img src="${cat.image}" alt="${cat.title}">
      <div class="overlay">${cat.title}</div>
    </div>
  `).join("");

  categoryGrid.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
      selectedCategory = card.dataset.category;
      renderProducts();
      window.scrollTo({ top: document.querySelector(".toolbar").offsetTop - 100, behavior: "smooth" });
    });
  });
}

function filteredProducts() {
  const q = (searchInput.value || "").trim().toLowerCase();
  return PRODUCTS.filter(p => {
    const categoryOk = !selectedCategory || p.category === selectedCategory;
    const searchOk = !q || p.title.toLowerCase().includes(q);
    return categoryOk && searchOk;
  });
}

function renderProducts() {
  PRODUCTS = getProducts();
  const items = filteredProducts();

  grid.innerHTML = items.map(p => `
    <div class="card">
      <img src="${p.image}" alt="${p.title}" data-product="${p.id}">
      <div class="p">
        <b>${p.title}</b>
        <div class="muted-text">${p.category}</div>
        <div class="price">${money(p.price)} $</div>
      </div>
      <button data-cart="${p.id}">Add to cart</button>
    </div>
  `).join("");

  grid.querySelectorAll("[data-cart]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.cart)));
  });

  grid.querySelectorAll("[data-product]").forEach(img => {
    img.addEventListener("click", () => {
      window.location.href = `/product/${img.dataset.product}`;
    });
  });
}

function addToCart(id) {
  const existing = cart.find(x => x.product_id === id);
  if (existing) existing.qty += 1;
  else cart.push({ product_id: id, qty: 1 });
  updateCartCount();
}

function updateCartCount() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  let total = 0;

  cartItems.innerHTML = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.product_id);
    if (!product) return "";

    total += product.price * item.qty;

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

  cartItems.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      const item = cart.find(x => x.product_id === id);
      if (!item) return;
      item.qty = Math.max(1, item.qty - 1);
      renderCart();
      updateCartCount();
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.plus);
      const item = cart.find(x => x.product_id === id);
      if (!item) return;
      item.qty += 1;
      renderCart();
      updateCartCount();
    });
  });
}

document.getElementById("openCartBtn").addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});

document.getElementById("closeCartBtn").addEventListener("click", () => {
  cartDialog.close();
});

searchInput.addEventListener("input", renderProducts);

document.getElementById("checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const fd = new FormData(e.target);
  const orders = getOrders();
  const newOrder = {
    id: Date.now(),
    name: fd.get("name"),
    phone: fd.get("phone"),
    address: fd.get("address"),
    payment_method: fd.get("payment"),
    items: cart.map(item => {
      const p = PRODUCTS.find(x => x.id === item.product_id);
      return `${p?.title || "Item"} x${item.qty}`;
    }).join(", "),
    total: cart.reduce((sum, item) => {
      const p = PRODUCTS.find(x => x.id === item.product_id);
      return sum + ((p?.price || 0) * item.qty);
    }, 0).toFixed(2),
    created_at: new Date().toLocaleString()
  };

  orders.unshift(newOrder);
  saveOrders(orders);

  cart = [];
  updateCartCount();
  cartDialog.close();
  e.target.reset();
  alert("Order received ✅");
});

let slideIndex = 0;
let timer = null;

function renderBanners() {
  const banners = getBanners();

  heroSlider.innerHTML = "";
  sliderDots.innerHTML = "";

  banners.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "slide" + (index === 0 ? " active" : "");
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

renderCategories();
renderProducts();
renderBanners();
updateCartCount();