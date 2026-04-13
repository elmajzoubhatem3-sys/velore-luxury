const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");

const categoryForm = document.getElementById("categoryForm");
const adminCategoriesList = document.getElementById("adminCategoriesList");
const productCategorySelect = document.getElementById("productCategorySelect");

const productForm = document.getElementById("productForm");
const adminProductsList = document.getElementById("adminProductsList");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const bannerForm = document.getElementById("bannerForm");
const adminBannersList = document.getElementById("adminBannersList");

const productDropZone = document.getElementById("productDropZone");
const productImageInput = document.getElementById("productImageInput");
const productPreview = document.getElementById("productPreview");

const bannerDropZone = document.getElementById("bannerDropZone");
const bannerImageInput = document.getElementById("bannerImageInput");
const bannerPreview = document.getElementById("bannerPreview");

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
    price: 74.0,
    category: "Bags",
    image: "/image/products/bag-1.jpg",
    description: "Refined luxury bag for everyday elegance."
  },
  {
    id: 3,
    title: "Velore Soft Perfume",
    price: 29.5,
    category: "Perfume",
    image: "/image/products/perfume-1.jpg",
    description: "A calm, feminine scent with warm notes."
  }
];

const DEFAULT_CATEGORIES = ["Shoes", "Bags", "Perfume"];
const DEFAULT_BANNERS = ["/image/banner-1.jpg", "/image/banner-2.jpg"];

let productFile = null;
let bannerFile = null;
let editingProductId = null;

function getProducts() {
  return JSON.parse(localStorage.getItem("velore_products") || "null") || DEFAULT_PRODUCTS;
}

function saveProducts(items) {
  localStorage.setItem("velore_products", JSON.stringify(items));
}

function getCategories() {
  return JSON.parse(localStorage.getItem("velore_categories") || "null") || DEFAULT_CATEGORIES;
}

function saveCategories(items) {
  localStorage.setItem("velore_categories", JSON.stringify(items));
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

function fillCategorySelect() {
  const categories = getCategories();
  productCategorySelect.innerHTML = categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
}

function renderCategories() {
  const categories = getCategories();

  adminCategoriesList.innerHTML = `
    <h3>Categories</h3>
    ${categories.map((c, i) => `
      <div class="admin-item">
        <div><b>${c}</b></div>
        <button class="ghost-btn" onclick="deleteCategory(${i})">Delete</button>
      </div>
    `).join("")}
  `;
}

function renderProducts() {
  const products = getProducts();

  adminProductsList.innerHTML = `
    <h3>Products</h3>
    ${products.map((p) => `
      <div class="admin-item">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${p.image}" class="admin-thumb" alt="${p.title}">
          <div>
            <b>${p.title}</b>
            <div class="muted-text">${p.category} • ${Number(p.price).toFixed(2)} $</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="ghost-btn" onclick="editProduct(${p.id})">Edit</button>
          <button class="ghost-btn" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
      </div>
    `).join("")}
  `;
}

function renderBanners() {
  const banners = getBanners();

  adminBannersList.innerHTML = `
    <h3>Banners</h3>
    ${banners.map((b, i) => `
      <div class="admin-item">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${b}" class="admin-thumb" alt="Banner">
          <div class="muted-text">${b}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="ghost-btn" onclick="moveBannerUp(${i})">Up</button>
          <button class="ghost-btn" onclick="moveBannerDown(${i})">Down</button>
          <button class="ghost-btn" onclick="deleteBanner(${i})">Delete</button>
        </div>
      </div>
    `).join("")}
  `;
}

function renderAll() {
  fillCategorySelect();
  renderCategories();
  renderProducts();
  renderBanners();
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
    renderAll();
  } else {
    loginMsg.textContent = "Wrong login info ❌";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("velore_admin");
  renderState();
});

categoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(categoryForm);
  const title = String(fd.get("categoryTitle") || "").trim();
  if (!title) return;

  const categories = getCategories();
  if (!categories.includes(title)) {
    categories.push(title);
    saveCategories(categories);
  }

  categoryForm.reset();
  renderAll();
});

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file, apiUrl) {
  const dataUrl = await fileToDataUrl(file);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      dataUrl
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

function bindDropZone(dropZone, fileInput, previewEl, setter) {
  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    setter(file);
    previewEl.src = URL.createObjectURL(file);
    previewEl.style.display = "block";
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setter(file);
    previewEl.src = URL.createObjectURL(file);
    previewEl.style.display = "block";
  });
}

bindDropZone(productDropZone, productImageInput, productPreview, (file) => {
  productFile = file;
});

bindDropZone(bannerDropZone, bannerImageInput, bannerPreview, (file) => {
  bannerFile = file;
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const fd = new FormData(productForm);
    const products = getProducts();

    let imageUrl = null;

    if (productFile) {
      imageUrl = await uploadImage(productFile, "/api/upload-product-image");
    }

    if (!editingProductId && !imageUrl) {
      alert("Choose a product image first.");
      return;
    }

    if (editingProductId) {
      const index = products.findIndex((p) => p.id === editingProductId);
      if (index !== -1) {
        products[index] = {
          ...products[index],
          title: fd.get("title"),
          price: Number(fd.get("price")),
          category: fd.get("category"),
          description: fd.get("description"),
          image: imageUrl || products[index].image
        };
      }
    } else {
      products.unshift({
        id: Date.now(),
        title: fd.get("title"),
        price: Number(fd.get("price")),
        category: fd.get("category"),
        description: fd.get("description"),
        image: imageUrl
      });
    }

    saveProducts(products);

    productForm.reset();
    productFile = null;
    editingProductId = null;
    productPreview.style.display = "none";
    cancelEditBtn.style.display = "none";

    renderAll();
    alert("Product saved ✅");
  } catch (error) {
    alert(error.message || "Something went wrong");
  }
});

cancelEditBtn.addEventListener("click", () => {
  editingProductId = null;
  productForm.reset();
  productFile = null;
  productPreview.style.display = "none";
  cancelEditBtn.style.display = "none";
});

bannerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    if (!bannerFile) {
      alert("Choose a banner image first.");
      return;
    }

    const banners = getBanners();
    const url = await uploadImage(bannerFile, "/api/upload-banner-image");
    banners.push(url);
    saveBanners(banners);

    bannerForm.reset();
    bannerFile = null;
    bannerPreview.style.display = "none";

    renderBanners();
    alert("Banner added ✅");
  } catch (error) {
    alert(error.message || "Banner upload failed");
  }
});

function deleteCategory(index) {
  const categories = getCategories();
  categories.splice(index, 1);
  saveCategories(categories);
  renderAll();
}

function deleteProduct(id) {
  const products = getProducts().filter((x) => x.id !== id);
  saveProducts(products);
  renderProducts();
}

function editProduct(id) {
  const products = getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingProductId = id;
  productForm.elements.title.value = product.title;
  productForm.elements.price.value = product.price;
  productForm.elements.category.value = product.category;
  productForm.elements.description.value = product.description;

  productPreview.src = product.image;
  productPreview.style.display = "block";
  cancelEditBtn.style.display = "inline-flex";
}

function deleteBanner(index) {
  const banners = getBanners();
  banners.splice(index, 1);
  saveBanners(banners);
  renderBanners();
}

function moveBannerUp(index) {
  if (index <= 0) return;
  const banners = getBanners();
  [banners[index - 1], banners[index]] = [banners[index], banners[index - 1]];
  saveBanners(banners);
  renderBanners();
}

function moveBannerDown(index) {
  const banners = getBanners();
  if (index >= banners.length - 1) return;
  [banners[index + 1], banners[index]] = [banners[index], banners[index + 1]];
  saveBanners(banners);
  renderBanners();
}

window.deleteCategory = deleteCategory;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.deleteBanner = deleteBanner;
window.moveBannerUp = moveBannerUp;
window.moveBannerDown = moveBannerDown;

renderState();
renderAll();