import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  max: 3
});

let initialized = false;

export async function initDb() {
  if (initialized) return;

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        title TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL DEFAULT 0,
        old_price NUMERIC(10,2),
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        image_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        items_json JSONB NOT NULL,
        total NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS old_price NUMERIC(10,2)
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS email TEXT
    `);

    initialized = true;
  } finally {
    client.release();
  }
}