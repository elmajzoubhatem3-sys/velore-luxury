import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  await initDb();

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
      where.push(`c.title = $${values.length}`);
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
        c.title AS category,
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

    if (!title || !categoryId || price === "" || price === null || price === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO products (title, price, old_price, stock, category_id, image_url, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        title,
        Number(price),
        old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
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
        title,
        Number(price),
        old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
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
    if (!id) return res.status(400).json({ error: "Missing product id" });

    await pool.query(`DELETE FROM products WHERE id = $1`, [Number(id)]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}