import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  try {
    await initDb();

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS old_price NUMERIC(10,2)
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS category_id INTEGER
    `);

    if (req.method === "GET") {
      const { q = "", category = "" } = req.query || {};

      const values = [];
      const where = [];

      if (q) {
        values.push(`%${q}%`);
        where.push(`p.title ILIKE $${values.length}`);
      }

      if (category) {
        values.push(category);
        where.push(`COALESCE(c.title, c.name) = $${values.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const { rows } = await pool.query(
        `
        SELECT
          p.id,
          p.title,
          p.price,
          p.old_price,
          p.stock,
          p.image_url AS image,
          p.description,
          COALESCE(c.title, c.name) AS category,
          p.category_id
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereSql}
        ORDER BY p.id DESC
        `,
        values
      );

      return res.status(200).json(rows);
    }

    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "POST") {
      const {
        title,
        price,
        old_price,
        stock,
        categoryId,
        image,
        description
      } = req.body || {};

      if (
        !title ||
        categoryId === undefined ||
        categoryId === null ||
        price === "" ||
        price === null ||
        price === undefined
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const categoryCheck = await pool.query(
        `SELECT id FROM categories WHERE id = $1 LIMIT 1`,
        [Number(categoryId)]
      );

      if (!categoryCheck.rows.length) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const { rows } = await pool.query(
        `
        INSERT INTO products (title, price, old_price, stock, category_id, image_url, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          String(title).trim(),
          Number(price),
          old_price === "" || old_price === null || old_price === undefined
            ? null
            : Number(old_price),
          Number(stock ?? 0),
          Number(categoryId),
          image || "",
          description || ""
        ]
      );

      return res.status(200).json({ id: rows[0].id });
    }

    if (req.method === "PUT") {
      const {
        id,
        title,
        price,
        old_price,
        stock,
        categoryId,
        image,
        description
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Missing product id" });
      }

      await pool.query(
        `
        UPDATE products
        SET title = $1,
            price = $2,
            old_price = $3,
            stock = $4,
            category_id = $5,
            image_url = $6,
            description = $7
        WHERE id = $8
        `,
        [
          String(title || "").trim(),
          Number(price),
          old_price === "" || old_price === null || old_price === undefined
            ? null
            : Number(old_price),
          Number(stock ?? 0),
          Number(categoryId),
          image || "",
          description || "",
          Number(id)
        ]
      );

      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Missing product id" });
      }

      await pool.query(`DELETE FROM products WHERE id = $1`, [Number(id)]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.log("PRODUCTS API ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err)
    });
  }
}