const grid = document.getElementById("productGrid");
const categoryGrid = document.getElementById("categoryGrid");
const cartDialog = document.getElementById("cartDialog");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");

let PRODUCTS = JSON.parse(localStorage.getItem("velore_products") || "[]");
let cart = [];

// ================= PRODUCTS =================

function renderProducts() {
  grid.innerHTML = PRODUCTS.map(p => `
    <div class="card">
      <img src="${p.image}" />
      <div class="p">
        <b>${p.title}</b>
        <div>${p.category}</div>
        <div class="price">${p.price}$</div>
      </div>
      <button onclick="addToCart(${p.id})">Add to cart</button>
    </div>
  `).join("");
}

// ================= CART =================

function addToCart(id) {
  const item = cart.find(x => x.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  updateCartCount();
}

function updateCartCount() {
  cartCount.textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function renderCart() {
  let total = 0;

  cartItems.innerHTML = cart.map(c => {
    const p = PRODUCTS.find(x => x.id === c.id);
    total += p.price * c.qty;

    return `
      <div class="row">
        <div>
          <b>${p.title}</b>
          <div>${p.price}$</div>
        </div>
        <div>${c.qty}</div>
      </div>
    `;
  }).join("");

  cartTotal.textContent = total.toFixed(2);
}

// ================= CHECKOUT =================

document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);

  const order = {
    name: fd.get("name"),
    phone: fd.get("phone"),
    address: fd.get("address"),
    items: cart.map(c => {
      const p = PRODUCTS.find(x => x.id === c.id);
      return `${p.title} x${c.qty}`;
    }).join("\n"),
    total: cart.reduce((sum, c) => {
      const p = PRODUCTS.find(x => x.id === c.id);
      return sum + p.price * c.qty;
    }, 0)
  };

  // ================= WHATSAPP =================

  const msg = `
🛒 NEW ORDER

👤 ${order.name}
📞 ${order.phone}
📍 ${order.address}

📦 Items:
${order.items}

💰 Total: ${order.total}$
`;

  const phone = "961XXXXXXXX"; // 🔥 حط رقمك هون

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );

  // ================= EMAIL =================

  await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  });

  // ================= RESET =================

  cart = [];
  updateCartCount();
  cartDialog.close();
  alert("Order sent ✅");
});

// ================= INIT =================

renderProducts();
updateCartCount();