const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");
const productForm = document.getElementById("productForm");
const bannerForm = document.getElementById("bannerForm");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const adminProductsList = document.getElementById("adminProductsList");
const adminBannersList = document.getElementById("adminBannersList");

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

function saveBanners(items) {
  localStorage.setItem("velore_banners", JSON.stringify(items));
}

function isLoggedIn() {
  return localStorage.getItem("velore_admin") === "yes";
}

function renderState() {
  adminPanel.style.display = isLoggedIn() ? "block" : "none";
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  const email = fd.get("email");
  const password = fd.get("password");

  if (email === "admin@velore.com" && password === "123456") {
    localStorage.setItem("velore_admin", "yes");
    loginMsg.textContent = "Login successful ✅";
    renderState();
    renderAdminData();
  } else {
    loginMsg.textContent = "Wrong login info ❌";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("velore_admin");
  renderState();
});

productForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(productForm);
  const items = getProducts();

  const newItem = {
    id: Date.now(),
    title: fd.get("title"),
    price: Number(fd.get("price")),
    category: fd.get("category"),
    image: fd.get("image"),
    description: fd.get("description")
  };

  items.unshift(newItem);
  saveProducts(items);
  productForm.reset();
  renderAdminData();
  alert("Product added ✅");
});

bannerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(bannerForm);
  const banners = getBanners();

  banners.unshift(fd.get("bannerUrl"));
  saveBanners(banners);
  bannerForm.reset();
  renderAdminData();
  alert("Banner added ✅");
});

function deleteProduct(id) {
  const items = getProducts().filter(x => x.id !== id);
  saveProducts(items);
  renderAdminData();
}

function deleteBanner(index) {
  const banners = getBanners();
  banners.splice(index, 1);
  saveBanners(banners);
  renderAdminData();
}

function renderAdminData() {
  const products = getProducts();
  const banners = getBanners();

  adminProductsList.innerHTML = `
    <h3>Products</h3>
    ${products.map(p => `
      <div class="admin-item">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${p.image}" class="admin-thumb" alt="${p.title}">
          <div>
            <b>${p.title}</b>
            <div class="muted-text">${p.category} • ${Number(p.price).toFixed(2)} $</div>
          </div>
        </div>
        <button class="ghost-btn" onclick="deleteProduct(${p.id})">Delete</button>
      </div>
    `).join("")}
  `;

  adminBannersList.innerHTML = `
    <h3 style="margin-top:18px;">Banners</h3>
    ${banners.map((b, i) => `
      <div class="admin-item">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${b}" class="admin-thumb" alt="Banner">
          <div class="muted-text">${b}</div>
        </div>
        <button class="ghost-btn" onclick="deleteBanner(${i})">Delete</button>
      </div>
    `).join("")}
  `;
}

refreshAdminBtn.addEventListener("click", renderAdminData);

window.deleteProduct = deleteProduct;
window.deleteBanner = deleteBanner;

renderState();
renderAdminData();