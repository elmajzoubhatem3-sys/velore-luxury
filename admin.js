const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");

const categoryForm = document.getElementById("categoryForm");
const adminCategoriesList = document.getElementById("adminCategoriesList");
const productCategoryChecks = document.getElementById("productCategoryChecks");

const productForm = document.getElementById("productForm");
const adminProductsList = document.getElementById("adminProductsList");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const bannerForm = document.getElementById("bannerForm");
const adminBannersList = document.getElementById("adminBannersList");

const productDropZone = document.getElementById("productDropZone");
const productImageInput = document.getElementById("productImageInput");
const productPreviewGrid = document.getElementById("productPreviewGrid");
const showPopupInput = document.getElementById("showPopupInput");

const bannerDropZone = document.getElementById("bannerDropZone");
const bannerImageInput = document.getElementById("bannerImageInput");
const bannerPreview = document.getElementById("bannerPreview");

let productFiles = [];
let bannerFile = null;
let editingProductId = null;
let currentProductImages = [];

function getToken() {
  return localStorage.getItem("velore_admin_token") || "";
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${getToken()}`
  };
}

function isLoggedIn() {
  return !!getToken();
}

function renderState() {
  adminPanel.style.display = isLoggedIn() ? "block" : "none";
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadCategories() {
  return apiJson("/api/categories");
}

async function loadProducts() {
  return apiJson("/api/products");
}

async function loadBanners() {
  return apiJson("/api/banners");
}

async function renderCategories() {
  const categories = await loadCategories();

  productCategoryChecks.innerHTML = categories.length
    ? categories.map((c) => `
        <label class="category-check-item">
          <input type="checkbox" name="categoryIds" value="${c.id}">
          <span>${c.title}</span>
        </label>
      `).join("")
    : `<div class="muted-text">No categories yet</div>`;

  adminCategoriesList.innerHTML = `
    <h3>Categories</h3>
    ${
      categories.length
        ? categories.map((c) => `
          <div class="admin-item">
            <div><b>${c.title}</b></div>
            <button class="ghost-btn" onclick="deleteCategory(${c.id})">Delete</button>
          </div>
        `).join("")
        : `<div class="admin-item"><div class="muted-text">No categories yet.</div></div>`
    }
  `;
}

async function renderProducts() {
  const products = await loadProducts();

  adminProductsList.innerHTML = `
    <h3>Products</h3>
    ${
      products.length
        ? products.map((p) => {
            const categoriesText = Array.isArray(p.categories) && p.categories.length
              ? p.categories.join(" • ")
              : (p.category || "-");
            const images = Array.isArray(p.images) && p.images.length
              ? p.images
              : [p.image].filter(Boolean);

            return `
              <div class="admin-item">
                <div style="display:flex;gap:12px;align-items:center;">
                  ${images[0] ? `<img src="${images[0]}" class="admin-thumb" alt="${p.title}" onerror="this.style.display='none'">` : ""}
                  <div>
                    <b>${p.title}</b>
                    <div class="muted-text">${categoriesText} • ${Number(p.price || 0).toFixed(2)} $</div>
                    <div class="muted-text">Old price: ${p.old_price ? Number(p.old_price).toFixed(2) + " $" : "-"}</div>
                    <div class="muted-text">Stock: ${Number(p.stock || 0)}</div>
                    <div class="muted-text">Images: ${images.length}</div>
                    <div class="muted-text">Popup: ${p.show_popup ? "Yes" : "No"}</div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="ghost-btn" onclick="editProduct(${p.id})">Edit</button>
                  <button class="ghost-btn" onclick="deleteProduct(${p.id})">Delete</button>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="admin-item"><div class="muted-text">No products yet.</div></div>`
    }
  `;
}

async function renderBanners() {
  const banners = await loadBanners();

  adminBannersList.innerHTML = `
    <h3>Banners</h3>
    ${
      banners.length
        ? banners.map((b) => `
          <div class="admin-item">
            <div style="display:flex;gap:12px;align-items:center;">
              <img src="${b.image}" class="admin-thumb" alt="Banner" onerror="this.style.display='none'">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ghost-btn" onclick="moveBanner(${b.id}, 'up')">Up</button>
              <button class="ghost-btn" onclick="moveBanner(${b.id}, 'down')">Down</button>
              <button class="ghost-btn" onclick="deleteBanner(${b.id})">Delete</button>
            </div>
          </div>
        `).join("")
        : `<div class="admin-item"><div class="muted-text">No banners yet.</div></div>`
    }
  `;
}

async function renderAll() {
  await Promise.all([renderCategories(), renderProducts(), renderBanners()]);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(loginForm);
    const data = await apiJson("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password")
      })
    });

    localStorage.setItem("velore_admin_token", data.token);
    loginMsg.textContent = "Login successful ✅";
    renderState();
    await renderAll();
  } catch (error) {
    loginMsg.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("velore_admin_token");
  renderState();
});

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(categoryForm);
    await apiJson("/api/categories", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title: String(fd.get("categoryTitle") || "").trim() })
    });

    categoryForm.reset();
    await renderAll();
  } catch (error) {
    alert(error.message);
  }
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

  const data = await apiJson(apiUrl, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      dataUrl
    })
  });

  return data.url;
}

function renderProductPreviews(images) {
  if (!images.length) {
    productPreviewGrid.innerHTML = "";
    productPreviewGrid.style.display = "none";
    return;
  }

  productPreviewGrid.innerHTML = images.map((src) => `
    <img src="${src}" class="multi-upload-thumb" alt="preview">
  `).join("");
  productPreviewGrid.style.display = "grid";
}

function setProductFiles(files) {
  productFiles = files;
  const localUrls = files.map((file) => URL.createObjectURL(file));
  renderProductPreviews(localUrls);
}

function bindMultiDropZone(dropZone, fileInput) {
  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;
    setProductFiles(files);
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
    const files = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setProductFiles(files);
  });
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

bindMultiDropZone(productDropZone, productImageInput);

bindDropZone(bannerDropZone, bannerImageInput, bannerPreview, (file) => {
  bannerFile = file;
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    let uploadedImages = [...currentProductImages];

    if (productFiles.length) {
      uploadedImages = [];
      for (const file of productFiles) {
        const url = await uploadImage(file, "/api/upload-product-image");
        uploadedImages.push(url);
      }
    }

    if (!editingProductId && !uploadedImages.length) {
      alert("Choose product images first.");
      return;
    }

    const fd = new FormData(productForm);
    const categoryIds = fd.getAll("categoryIds").map((x) => Number(x)).filter(Boolean);

    if (!categoryIds.length) {
      alert("Choose at least one category.");
      return;
    }

    const payload = {
      title: fd.get("title"),
      price: fd.get("price"),
      old_price: fd.get("old_price"),
      stock: fd.get("stock"),
      categoryId: categoryIds[0],
      categoryIds,
      description: fd.get("description"),
      image: uploadedImages[0] || "",
      images: uploadedImages,
      show_popup: showPopupInput.checked
    };

    if (editingProductId) {
      await apiJson("/api/products", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: editingProductId, ...payload })
      });
    } else {
      await apiJson("/api/products", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
    }

    editingProductId = null;
    currentProductImages = [];
    productFiles = [];
    productForm.reset();
    showPopupInput.checked = false;
    document.querySelectorAll('input[name="categoryIds"]').forEach((checkbox) => checkbox.checked = false);
    renderProductPreviews([]);
    cancelEditBtn.style.display = "none";
    await renderProducts();
    alert("Product saved ✅");
  } catch (error) {
    alert(error.message);
  }
});

cancelEditBtn.addEventListener("click", () => {
  editingProductId = null;
  currentProductImages = [];
  productFiles = [];
  productForm.reset();
  showPopupInput.checked = false;
  document.querySelectorAll('input[name="categoryIds"]').forEach((checkbox) => checkbox.checked = false);
  renderProductPreviews([]);
  cancelEditBtn.style.display = "none";
});

bannerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    if (!bannerFile) {
      alert("Choose a banner image first.");
      return;
    }

    const image = await uploadImage(bannerFile, "/api/upload-banner-image");

    await apiJson("/api/banners", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ image })
    });

    bannerFile = null;
    bannerPreview.style.display = "none";
    bannerForm.reset();
    await renderBanners();
    alert("Banner added ✅");
  } catch (error) {
    alert(error.message);
  }
});

window.deleteCategory = async function deleteCategory(id) {
  await apiJson("/api/categories", {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id })
  });
  await renderAll();
};

window.deleteProduct = async function deleteProduct(id) {
  await apiJson("/api/products", {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id })
  });
  await renderProducts();
};

window.editProduct = async function editProduct(id) {
  const products = await loadProducts();
  const product = products.find((p) => Number(p.id) === Number(id));
  if (!product) return;

  editingProductId = Number(id);
  currentProductImages = Array.isArray(product.images) ? product.images : [product.image].filter(Boolean);
  productFiles = [];

  productForm.elements.title.value = product.title || "";
  productForm.elements.price.value = product.price || "";
  productForm.elements.old_price.value = product.old_price || "";
  productForm.elements.stock.value = product.stock || 0;
  productForm.elements.description.value = product.description || "";
  showPopupInput.checked = !!product.show_popup;

  const selectedCategoryIds = Array.isArray(product.category_ids)
    ? product.category_ids.map(Number)
    : [Number(product.category_id)].filter(Boolean);

  document.querySelectorAll('input[name="categoryIds"]').forEach((checkbox) => {
    checkbox.checked = selectedCategoryIds.includes(Number(checkbox.value));
  });

  renderProductPreviews(currentProductImages);
  cancelEditBtn.style.display = "inline-flex";
};

window.deleteBanner = async function deleteBanner(id) {
  await apiJson("/api/banners", {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id })
  });
  await renderBanners();
};

window.moveBanner = async function moveBanner(id, direction) {
  await apiJson("/api/banners", {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id, direction })
  });
  await renderBanners();
};

renderState();
if (isLoggedIn()) {
  renderAll();
}