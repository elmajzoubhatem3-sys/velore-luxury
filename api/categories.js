import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  try {
    await initDb();

    if (req.method === "GET") {
      const { rows } = await pool.query(
        `SELECT id, name AS title FROM categories ORDER BY name ASC`
      );
      return res.status(200).json(rows);
    }

    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "POST") {
      const { title } = req.body || {};
      const cleanTitle = String(title || "").trim();

      if (!cleanTitle) {
        return res.status(400).json({ error: "Category title required" });
      }

      const existing = await pool.query(
        `SELECT id, name AS title FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [cleanTitle]
      );

      if (existing.rows.length) {
        return res.status(200).json(existing.rows[0]);
      }

      const { rows } = await pool.query(
        `
        INSERT INTO categories (name)
        VALUES ($1)
        RETURNING id, name AS title
        `,
        [cleanTitle]
      );

      return res.status(200).json(rows[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Category id required" });
      }

      await pool.query(`DELETE FROM categories WHERE id = $1`, [Number(id)]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.log("CATEGORIES API ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err)
    });
  }
}