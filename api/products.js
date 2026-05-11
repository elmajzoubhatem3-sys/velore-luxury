import { initDb, pool } from "./_lib/db.js";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  try {
    await initDb();

    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC(10,2)`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids INTEGER[]`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[]`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_popup BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS title_en TEXT`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS title_ar TEXT`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ar TEXT`);

    await pool.query(`
      UPDATE products
      SET sort_order = id
      WHERE sort_order IS NULL
    `);

    await pool.query(`
      UPDATE products
      SET title_en = COALESCE(title, name)
      WHERE title_en IS NULL OR title_en = ''
    `);

    await pool.query(`
      UPDATE products
      SET description_en = description
      WHERE (description_en IS NULL OR description_en = '') AND description IS NOT NULL
    `);

    if (req.method === "GET") {
      const { rows } = await pool.query(`
        SELECT
          p.id,
          COALESCE(p.title_en, p.title, p.name) AS title,
          p.title_en,
          p.title_ar,
          p.price,
          p.old_price,
          p.stock,
          p.image_url AS image,
          p.images,
          p.description,
          p.description_en,
          p.description_ar,
          p.show_popup,
          p.sort_order,
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
        ORDER BY p.sort_order ASC, p.id DESC
      `);

      const mapped = rows.map((row) => ({
        ...row,
        image: row.image || (Array.isArray(row.images) ? row.images[0] : null),
        images: Array.isArray(row.images) && row.images.length
          ? row.images
          : [row.image].filter(Boolean),
        category: Array.isArray(row.categories) && row.categories.length ? row.categories[0] : "",
        show_popup: !!row.show_popup
      }));

      return res.status(200).json(mapped);
    }

    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "POST") {
      const {
        title,
        title_en,
        title_ar,
        price,
        old_price,
        stock,
        categoryId,
        categoryIds,
        image,
        images,
        description,
        description_en,
        description_ar,
        show_popup
      } = req.body || {};

      const cleanTitleEn = String(title_en || title || "").trim();
      const cleanTitleAr = String(title_ar || "").trim();
      const cleanDescriptionEn = String(description_en || description || "").trim();
      const cleanDescriptionAr = String(description_ar || "").trim();

      const cleanCategoryIds = Array.isArray(categoryIds)
        ? categoryIds.map((x) => Number(x)).filter(Boolean)
        : [Number(categoryId)].filter(Boolean);

      const cleanImages = Array.isArray(images)
        ? images.map((x) => String(x || "").trim()).filter(Boolean)
        : [String(image || "").trim()].filter(Boolean);

      if (!cleanTitleEn || price === "" || price === null || price === undefined) {
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

      const maxOrder = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM products`);

      const { rows } = await pool.query(
        `
        INSERT INTO products (
          title,
          name,
          title_en,
          title_ar,
          price,
          old_price,
          stock,
          category_id,
          category_ids,
          image_url,
          images,
          description,
          description_en,
          description_ar,
          show_popup,
          sort_order
        )
        VALUES ($1, $1, $1, $2, $3, $4, $5, $6, $7::int[], $8, $9::text[], $10, $10, $11, $12, $13)
        RETURNING id
        `,
        [
          cleanTitleEn,
          cleanTitleAr,
          Number(price),
          old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
          Number(stock ?? 0),
          cleanCategoryIds[0],
          cleanCategoryIds,
          cleanImages[0],
          cleanImages,
          cleanDescriptionEn,
          cleanDescriptionAr,
          !!show_popup,
          Number(maxOrder.rows[0].next_order)
        ]
      );

      return res.status(200).json({ id: rows[0].id });
    }

    if (req.method === "PUT") {
      const { id, direction } = req.body || {};

      if (id && ["up", "down"].includes(direction)) {
        const currentRes = await pool.query(
          `SELECT id, sort_order FROM products WHERE id = $1`,
          [Number(id)]
        );

        if (!currentRes.rows.length) {
          return res.status(404).json({ error: "Product not found" });
        }

        const current = currentRes.rows[0];

        const neighborRes = await pool.query(
          direction === "up"
            ? `SELECT id, sort_order FROM products WHERE sort_order < $1 ORDER BY sort_order DESC LIMIT 1`
            : `SELECT id, sort_order FROM products WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1`,
          [current.sort_order]
        );

        if (!neighborRes.rows.length) {
          return res.status(200).json({ ok: true });
        }

        const neighbor = neighborRes.rows[0];

        await pool.query(`UPDATE products SET sort_order = $1 WHERE id = $2`, [
          neighbor.sort_order,
          current.id
        ]);

        await pool.query(`UPDATE products SET sort_order = $1 WHERE id = $2`, [
          current.sort_order,
          neighbor.id
        ]);

        return res.status(200).json({ ok: true });
      }

      const {
        title,
        title_en,
        title_ar,
        price,
        old_price,
        stock,
        categoryId,
        categoryIds,
        image,
        images,
        description,
        description_en,
        description_ar,
        show_popup
      } = req.body || {};

      const cleanTitleEn = String(title_en || title || "").trim();
      const cleanTitleAr = String(title_ar || "").trim();
      const cleanDescriptionEn = String(description_en || description || "").trim();
      const cleanDescriptionAr = String(description_ar || "").trim();

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
            title_en = $1,
            title_ar = $2,
            price = $3,
            old_price = $4,
            stock = $5,
            category_id = $6,
            category_ids = $7::int[],
            image_url = $8,
            images = $9::text[],
            description = $10,
            description_en = $10,
            description_ar = $11,
            show_popup = $12
        WHERE id = $13
        `,
        [
          cleanTitleEn,
          cleanTitleAr,
          Number(price),
          old_price === "" || old_price === null || old_price === undefined ? null : Number(old_price),
          Number(stock ?? 0),
          cleanCategoryIds[0] || null,
          cleanCategoryIds,
          cleanImages[0] || "",
          cleanImages,
          cleanDescriptionEn,
          cleanDescriptionAr,
          !!show_popup,
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