import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  await initDb();

  if (req.method === "GET") {
    const { rows } = await pool.query(
      `SELECT id, image_url AS image, sort_order
       FROM banners
       ORDER BY sort_order ASC, id ASC`
    );
    return res.status(200).json(rows);
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "POST") {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: "Image required" });

    const maxRes = await pool.query(`SELECT COALESCE(MAX(sort_order), -1) AS max FROM banners`);
    const nextSort = Number(maxRes.rows[0].max) + 1;

    const { rows } = await pool.query(
      `INSERT INTO banners (image_url, sort_order)
       VALUES ($1, $2)
       RETURNING id`,
      [image, nextSort]
    );

    return res.status(200).json({ id: rows[0].id });
  }

  if (req.method === "PUT") {
    const { id, direction } = req.body || {};
    if (!id || !direction) {
      return res.status(400).json({ error: "Missing banner move data" });
    }

    const { rows } = await pool.query(
      `SELECT id, sort_order FROM banners WHERE id = $1`,
      [Number(id)]
    );
    if (!rows.length) return res.status(404).json({ error: "Banner not found" });

    const current = rows[0];
    const targetSort = direction === "up" ? current.sort_order - 1 : current.sort_order + 1;

    const swap = await pool.query(
      `SELECT id, sort_order FROM banners WHERE sort_order = $1`,
      [targetSort]
    );

    if (!swap.rows.length) {
      return res.status(200).json({ ok: true });
    }

    await pool.query(`UPDATE banners SET sort_order = $1 WHERE id = $2`, [targetSort, current.id]);
    await pool.query(`UPDATE banners SET sort_order = $1 WHERE id = $2`, [current.sort_order, swap.rows[0].id]);

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing banner id" });

    await pool.query(`DELETE FROM banners WHERE id = $1`, [Number(id)]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}