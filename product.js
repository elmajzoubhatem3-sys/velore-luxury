async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const page = document.getElementById("productPage");

  if (!id) {
    page.innerHTML = "<p>Product not found.</p>";
    return;
  }

  const res = await fetch("/api/products");
  const products = await res.json();
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    page.innerHTML = "<p>Product not found.</p>";
    return;
  }

  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image].filter(Boolean);

  const categoriesText = Array.isArray(product.categories) && product.categories.length
    ? product.categories.join(" • ")
    : (product.category || "");

  document.title = `${product.title} - VELORÉ`;

  page.innerHTML = `
    <div>
      <div class="product-image-zoom-wrap">
        <img id="mainProductImage" src="${images[0] || ""}" alt="${product.title}" class="product-main-image" onerror="this.style.display='none'">
      </div>

      ${
        images.length > 1
          ? `
            <div class="product-thumbs">
              ${images.map((src, i) => `
                <img
                  src="${src}"
                  data-src="${src}"
                  class="product-thumb ${i === 0 ? "active-thumb" : ""}"
                  alt="${product.title}"
                >
              `).join("")}
            </div>
          `
          : ""
      }
    </div>

    <div class="product-meta">
      <div class="product-category">${categoriesText}</div>
      <h1>${product.title}</h1>

      <div class="price-row">
        ${product.old_price ? `<span class="old-price">${Number(product.old_price).toFixed(2)} $</span>` : ""}
        <div class="product-price">${Number(product.price).toFixed(2)} $</div>
      </div>

      <div class="product-desc">${product.description || ""}</div>

      <div class="product-actions">
        <button id="shareBtn" class="primary-btn" type="button">Share Product</button>
        <a href="/" class="ghost-btn">Back to Store</a>
      </div>
    </div>
  `;

  const mainImage = document.getElementById("mainProductImage");
  document.querySelectorAll(".product-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      document.querySelectorAll(".product-thumb").forEach((t) => t.classList.remove("active-thumb"));
      thumb.classList.add("active-thumb");
      mainImage.src = thumb.dataset.src;
    });
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareData = {
      title: product.title,
      text: product.description || product.title,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Product link copied ✅");
    }
  });
}

loadProduct();