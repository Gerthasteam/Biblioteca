import { neon } from "@neondatabase/serverless";

// Vercel's Postgres (Neon) marketplace integration injects the connection
// string under one of these names depending on how it was connected.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

export const dbConfigured = Boolean(connectionString);

export const sql = connectionString
  ? neon(connectionString, { fullResults: true })
  : () => {
      throw new Error(
        "No hay base de datos conectada todavía. Agregá el storage de Postgres desde el dashboard de Vercel y volvé a desplegar."
      );
    };

let ready = null;

export function ensureSchema() {
  if (!connectionString) {
    throw new Error(
      "No hay base de datos conectada todavía. Agregá el storage de Postgres desde el dashboard de Vercel y volvé a desplegar."
    );
  }
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'manga',
        status TEXT NOT NULL DEFAULT 'pendiente',
        unit TEXT,
        current INT NOT NULL DEFAULT 0,
        total INT,
        rating INT NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        cover_url TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // Migración para proyectos creados antes de sumar el reordenamiento
      // y la sinopsis breve de manga.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`;
      await sql`CREATE TABLE IF NOT EXISTS animes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente',
        current INT NOT NULL DEFAULT 0,
        total INT,
        rating INT NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        cover_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // Carpetas TCG armadas a mano (no exportadas de una expansión real).
      // El nombre vive acá — así cambiarle el nombre no implica reescribir
      // las notas de cada carta que ya tiene adentro.
      await sql`CREATE TABLE IF NOT EXISTS tcg_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })();
  }
  return ready;
}

export function rowToItem(r) {
  return {
    id: String(r.id),
    title: r.title,
    category: r.category,
    status: r.status,
    unit: r.unit || "",
    current: r.current,
    total: r.total,
    rating: r.rating,
    notes: r.notes || "",
    coverUrl: r.cover_url || null,
    sortOrder: r.sort_order,
    description: r.description || "",
    createdAt: r.created_at
  };
}

export function rowToTcgFolder(r) {
  return { id: r.id, name: r.name };
}

export function rowToAnime(r) {
  return {
    id: String(r.id),
    title: r.title,
    status: r.status,
    current: r.current,
    total: r.total,
    rating: r.rating,
    notes: r.notes || "",
    coverUrl: r.cover_url || null,
    createdAt: r.created_at
  };
}
