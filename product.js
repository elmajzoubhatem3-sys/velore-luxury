async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("productPage").innerHTML = "<p>Product not found.</p>";
    return;
  }

  const res = await fetch("/api/products");
  const products = await res.json();
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    document.getElementById("productPage").innerHTML = "<p>Product not found.</p>";
    return;
  }

  document.title = `${product.title} - VELORÉ`;

  document.getElementById("productPage").innerHTML = `
    <div>
      <img src="${product.image || ""}" alt="${product.title}" class="product-main-image" onerror="this.style.display='none'">
    </div>

    <div class="product-meta">
      <div class="product-category">${product.category || ""}</div>
      <h1>${product.title}</h1>
      <div class="product-price">${Number(product.price).toFixed(2)} $</div>
      <div class="product-desc">${product.description || ""}</div>

      <div class="product-actions">
        <button id="shareBtn" class="primary-btn" type="button">Share Product</button>
        <a href="/" class="ghost-btn">Back to Store</a>
      </div>
    </div>
  `;

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