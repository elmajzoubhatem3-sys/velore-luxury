const ordersTableBody = document.getElementById("ordersTableBody");
const ordersMsg = document.getElementById("ordersMsg");
const clearOrdersBtn = document.getElementById("clearOrdersBtn");
const audio = new Audio("/sounds/new-order.mp3");
audio.preload = "auto";

function getToken() {
  return localStorage.getItem("velore_admin_token") || "";
}

let lastSeenMaxId = Number(localStorage.getItem("velore_last_seen_order_id") || 0);
let soundEnabled = false;

function enableSound() {
  audio.volume = 1;
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    soundEnabled = true;
  }).catch(() => {});
}

document.addEventListener("click", enableSound, { once: true });
document.addEventListener("touchstart", enableSound, { once: true });

async function loadOrders() {
  const token = getToken();
  if (!token) {
    ordersMsg.textContent = "Please login from admin first.";
    return;
  }

  const res = await fetch("/api/orders", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json().catch(() => []);
  if (!res.ok) {
    ordersMsg.textContent = "Failed to load orders.";
    return;
  }

  ordersMsg.textContent = `Total orders: ${data.length}`;

  const maxId = data.reduce((m, x) => Math.max(m, Number(x.id || 0)), 0);

  if (lastSeenMaxId && maxId > lastSeenMaxId && soundEnabled) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  lastSeenMaxId = maxId;
  localStorage.setItem("velore_last_seen_order_id", String(lastSeenMaxId));

  ordersTableBody.innerHTML = data.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>
        <b>${order.name}</b><br>
        <span class="muted-text">${order.phone}</span><br>
        <span class="muted-text">${order.email || ""}</span><br>
        <span class="muted-text">${order.address}</span>
      </td>
      <td>
        ${(Array.isArray(order.items_json) ? order.items_json : []).map((x) => `${x.title} x${x.qty}`).join("<br>")}
      </td>
      <td>${Number(order.total).toFixed(2)} $<br><span class="muted-text">${order.payment_method}</span></td>
      <td>${new Date(order.created_at).toLocaleString()}</td>
      <td>
        <button class="ghost-btn" onclick="cancelOrder(${order.id})">Cancel Order</button>
      </td>
    </tr>
  `).join("");

  if (!data.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6">No orders yet.</td></tr>`;
  }
}

window.cancelOrder = async function cancelOrder(id) {
  const token = getToken();
  if (!token) return;

  if (!confirm("Cancel this order?")) return;

  const res = await fetch("/api/orders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id, sendCancelEmail: true })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "Cancel failed");
    return;
  }

  loadOrders();
};

clearOrdersBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;

  if (!confirm("Clear all orders?")) return;

  await fetch("/api/orders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  lastSeenMaxId = 0;
  localStorage.setItem("velore_last_seen_order_id", "0");
  loadOrders();
});

setInterval(loadOrders, 20000);
loadOrders();