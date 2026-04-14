import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  try {
    await initDb();

    if (req.method === "GET") {
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const { rows } = await pool.query(`
        SELECT * FROM orders ORDER BY id DESC
      `);

      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { name, phone, email, address, payment_method, items } = req.body;

      if (!name || !phone || !address || !items?.length) {
        return res.status(400).json({ error: "Missing data" });
      }

      let total = 0;

      const normalizedItems = items.map((item) => {
        total += 10; // مؤقت
        return {
          product_id: item.product_id,
          title: "Item",
          qty: item.qty || 1,
          price: 10
        };
      });

      const insert = await pool.query(`
        INSERT INTO orders (name, phone, email, address, payment_method, items_json, total)
        VALUES (
          '${name}',
          '${phone}',
          '${email}',
          '${address}',
          '${payment_method}',
          '${JSON.stringify(normalizedItems)}',
          '${total}'
        )
        RETURNING *
      `);

      return res.status(200).json(insert.rows[0]);
    }

    if (req.method === "DELETE") {
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const { id } = req.body;

      if (id) {
        await pool.query(`DELETE FROM orders WHERE id=${id}`);
      } else {
        await pool.query(`DELETE FROM orders`);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.log("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
}