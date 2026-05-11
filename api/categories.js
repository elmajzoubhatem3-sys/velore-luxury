import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  try {
    await initDb();

    await pool.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS sort_order INTEGER
    `);

    await pool.query(`
      UPDATE categories
      SET sort_order = id
      WHERE sort_order IS NULL
    `);

    if (req.method === "GET") {
      const { rows } = await pool.query(
        `SELECT id, COALESCE(title, name) AS title, sort_order
         FROM categories
         ORDER BY sort_order ASC, id ASC`
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
        `SELECT id, COALESCE(title, name) AS title
         FROM categories
         WHERE LOWER(COALESCE(title, name)) = LOWER($1)
         LIMIT 1`,
        [cleanTitle]
      );

      if (existing.rows.length) {
        return res.status(200).json(existing.rows[0]);
      }

      const maxOrder = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM categories`);

      const { rows } = await pool.query(
        `
        INSERT INTO categories (title, name, sort_order)
        VALUES ($1, $1, $2)
        RETURNING id, COALESCE(title, name) AS title, sort_order
        `,
        [cleanTitle, Number(maxOrder.rows[0].next_order)]
      );

      return res.status(200).json(rows[0]);
    }

    if (req.method === "PUT") {
      const { id, direction } = req.body || {};

      if (!id || !["up", "down"].includes(direction)) {
        return res.status(400).json({ error: "Invalid sort request" });
      }

      const currentRes = await pool.query(
        `SELECT id, sort_order FROM categories WHERE id = $1`,
        [Number(id)]
      );

      if (!currentRes.rows.length) {
        return res.status(404).json({ error: "Category not found" });
      }

      const current = currentRes.rows[0];

      const neighborRes = await pool.query(
        direction === "up"
          ? `SELECT id, sort_order FROM categories WHERE sort_order < $1 ORDER BY sort_order DESC LIMIT 1`
          : `SELECT id, sort_order FROM categories WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1`,
        [current.sort_order]
      );

      if (!neighborRes.rows.length) {
        return res.status(200).json({ ok: true });
      }

      const neighbor = neighborRes.rows[0];

      await pool.query(`UPDATE categories SET sort_order = $1 WHERE id = $2`, [
        neighbor.sort_order,
        current.id
      ]);

      await pool.query(`UPDATE categories SET sort_order = $1 WHERE id = $2`, [
        current.sort_order,
        neighbor.id
      ]);

      return res.status(200).json({ ok: true });
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