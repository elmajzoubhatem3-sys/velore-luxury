import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

async function sendOrderEmail(order) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.ADMIN_EMAIL_RECEIVER) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [process.env.ADMIN_EMAIL_RECEIVER],
      subject: `New Order #${order.id} - VELORÉ`,
      html: `
        <h2>New Order</h2>
        <p><b>Name:</b> ${order.name}</p>
        <p><b>Phone:</b> ${order.phone}</p>
        <p><b>Address:</b> ${order.address}</p>
        <p><b>Payment:</b> ${order.payment_method}</p>
        <p><b>Total:</b> ${order.total} $</p>
        <p><b>Items:</b></p>
        <pre>${JSON.stringify(order.items_json, null, 2)}</pre>
      `
    })
  });
}

export default async function handler(req, res) {
  await initDb();

  if (req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { rows } = await pool.query(
      `SELECT id, name, phone, address, payment_method, items_json, total, created_at
       FROM orders
       ORDER BY id DESC`
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { name, phone, address, payment_method, items } = req.body || {};
    if (!name || !phone || !address || !payment_method || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Missing order data" });
    }

    const ids = items.map((x) => Number(x.product_id)).filter(Boolean);
    const productsRes = await pool.query(
      `SELECT id, title, price FROM products WHERE id = ANY($1::int[])`,
      [ids]
    );
    const productMap = new Map(productsRes.rows.map((p) => [Number(p.id), p]));

    let total = 0;
    const normalizedItems = items.map((item) => {
      const product = productMap.get(Number(item.product_id));
      const qty = Math.max(1, Number(item.qty || 1));
      const title = product?.title || "Item";
      const price = Number(product?.price || 0);
      total += price * qty;

      return {
        product_id: Number(item.product_id),
        title,
        price,
        qty
      };
    });

    const insert = await pool.query(
      `
      INSERT INTO orders (name, phone, address, payment_method, items_json, total)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING id, name, phone, address, payment_method, items_json, total, created_at
      `,
      [name, phone, address, payment_method, JSON.stringify(normalizedItems), total.toFixed(2)]
    );

    const order = insert.rows[0];

    try {
      await sendOrderEmail(order);
    } catch {}

    const whatsappText = [
      "🛒 NEW ORDER",
      "",
      `#${order.id}`,
      `👤 ${order.name}`,
      `📞 ${order.phone}`,
      `📍 ${order.address}`,
      "",
      "Items:",
      ...order.items_json.map((x) => `- ${x.title} x${x.qty}`),
      "",
      `💰 Total: ${order.total}$`
    ].join("\n");

    const whatsappNumber = process.env.ADMIN_WHATSAPP_NUMBER || "";
    const whatsappLink = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`
      : null;

    return res.status(200).json({
      order_id: order.id,
      total: order.total,
      whatsappLink
    });
  }

  if (req.method === "DELETE") {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.body || {};
    if (id) {
      await pool.query(`DELETE FROM orders WHERE id = $1`, [Number(id)]);
    } else {
      await pool.query(`DELETE FROM orders`);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}