const ordersTableBody = document.getElementById("ordersTableBody");
const ordersMsg = document.getElementById("ordersMsg");
const clearOrdersBtn = document.getElementById("clearOrdersBtn");

const audio = new Audio("/sounds/new-order.mp3");
audio.preload = "auto";

function getOrders() {
  return JSON.parse(localStorage.getItem("velore_orders") || "[]");
}

function saveOrders(items) {
  localStorage.setItem("velore_orders", JSON.stringify(items));
}

let lastSeenCount = Number(localStorage.getItem("velore_last_seen_count") || 0);

document.addEventListener("click", () => {
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {});
}, { once: true });

function renderOrders() {
  const orders = getOrders();
  ordersMsg.textContent = `Total orders: ${orders.length}`;

  if (orders.length > lastSeenCount) {
    lastSeenCount = orders.length;
    localStorage.setItem("velore_last_seen_count", String(lastSeenCount));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  ordersTableBody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>
        <b>${order.name}</b><br>
        <span class="muted-text">${order.phone}</span><br>
        <span class="muted-text">${order.address}</span>
      </td>
      <td>${order.items}</td>
      <td>${order.total} $<br><span class="muted-text">${order.payment_method}</span></td>
      <td>${order.created_at}</td>
    </tr>
  `).join("");

  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="5">No orders yet.</td></tr>`;
  }
}

clearOrdersBtn.addEventListener("click", () => {
  if (!confirm("Clear all orders?")) return;
  saveOrders([]);
  localStorage.setItem("velore_last_seen_count", "0");
  lastSeenCount = 0;
  renderOrders();
});

setInterval(renderOrders, 5000);
renderOrders();