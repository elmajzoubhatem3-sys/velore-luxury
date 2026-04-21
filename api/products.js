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

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS category_ids INTEGER[]
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS images TEXT[]
    `);

    if (req.method === "GET") {
      const { rows } = await pool.query(`
        SELECT
          p.id,
          COALESCE(p.title, p.name) AS title,
          p.price,
          p.old_price,
          p.stock,
          p.image_url AS image,
          p.images,
          p.description,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(c.title, c.name)), NULL),
            '{}'
          ) AS categories,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.id), NULL),
            '{}'
          ) AS category_ids,
          p.category_id
        FROM products p
        LEFT JOIN categories c
          ON c.id = ANY(
            CASE
              WHEN p.category_ids IS NOT NULL AND array_length(p.category_ids, 1) > 0 THEN p.category_ids
              ELSE ARRAY[p.category_id]
            END
          )
        GROUP BY p.id
        ORDER BY p.id DESC
      `);

      const mapped = rows.map((row) => ({
        ...row,
        image: row.image || (Array.isArray(row.images) ? row.images[0] : null),
        images: Array.isArray(row.images) && row.images.length
          ? row.images
          : [row.image].filter(Boolean),
        category: Array.isArray(row.categories) && row.categories.length ? row.categories[0] : ""
      }));

      return res.status(200).json(mapped);
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
        categoryIds,
        image,
        images,
        description
      } = req.body || {};

      const cleanTitle = String(title || "").trim();
      const cleanCategoryIds = Array.isArray(categoryIds)
        ? categoryIds.map((x) => Number(x)).filter(Boolean)
        : [Number(categoryId)].filter(Boolean);
      const cleanImages = Array.isArray(images)
        ? images.map((x) => String(x || "").trim()).filter(Boolean)
        : [String(image || "").trim()].filter(Boolean);

      if (!cleanTitle || price === "" || price === null || price === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!cleanCategoryIds.length) {
        return res.status(400).json({ error: "Choose at least one category" });
      }

      if (!cleanImages.length) {
        return res.status(400).json({ error: "Add at least one image" });
      }

      const categoryCheck = await pool.query(
        `SELECT id FROM categories WHERE id = ANY($1::int[])`,
        [cleanCategoryIds]
      );

      if (!categoryCheck.rows.length) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const { rows } = await pool.query(
        `
        INSERT INTO products (
          title,
          name,
          price,
          old_price,
          stock,
          category_id,
          category_ids,
          image_url,
          images,
          description
        )
        VALUES ($1, $1, $2, $3, $4, $5, $6::int[], $7, $8::text[], $9)
        RETURNING id
        `,
        [
          cleanTitle,
          Number(price),
          old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
          Number(stock ?? 0),
          cleanCategoryIds[0],
          cleanCategoryIds,
          cleanImages[0],
          cleanImages,
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
        categoryIds,
        image,
        images,
        description
      } = req.body || {};

      const cleanTitle = String(title || "").trim();
      const cleanCategoryIds = Array.isArray(categoryIds)
        ? categoryIds.map((x) => Number(x)).filter(Boolean)
        : [Number(categoryId)].filter(Boolean);
      const cleanImages = Array.isArray(images)
        ? images.map((x) => String(x || "").trim()).filter(Boolean)
        : [String(image || "").trim()].filter(Boolean);

      if (!id) {
        return res.status(400).json({ error: "Missing product id" });
      }

      await pool.query(
        `
        UPDATE products
        SET title = $1,
            name = $1,
            price = $2,
            old_price = $3,
            stock = $4,
            category_id = $5,
            category_ids = $6::int[],
            image_url = $7,
            images = $8::text[],
            description = $9
        WHERE id = $10
        `,
        [
          cleanTitle,
          Number(price),
          old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
          Number(stock ?? 0),
          cleanCategoryIds[0] || null,
          cleanCategoryIds,
          cleanImages[0] || "",
          cleanImages,
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