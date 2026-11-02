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
      // Cuentas — una por persona. Se crea primero porque las demás tablas
      // referencian su id.
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
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
      // Lista de deseos de TCG: cartas marcadas con estrella porque las estás
      // buscando.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS wish BOOLEAN NOT NULL DEFAULT false`;
      // Cuánto pagaste por cada copia de una carta TCG (en dólares; la app
      // convierte si lo cargás en pesos). NULL = no lo anotaste.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS cost NUMERIC(14,4)`;
      // Datos extra de una serie de manga (ver lib/manga.js): tomos que
      // tenés y cuáles leíste, edición (editorial, formato, idioma), estado,
      // tomos publicados, próximo tomo, autores, géneros y reseña.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb`;
      // Migración para proyectos creados antes de sumar cuentas: queda
      // opcional (NULL) para no romper filas viejas — la primera cuenta que
      // se registra "adopta" automáticamente todo lo que tenga user_id NULL.
      await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
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
      await sql`ALTER TABLE animes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
      // Carpetas TCG armadas a mano (no exportadas de una expansión real).
      // El nombre vive acá — así cambiarle el nombre no implica reescribir
      // las notas de cada carta que ya tiene adentro.
      await sql`CREATE TABLE IF NOT EXISTS tcg_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE tcg_folders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
      // A qué juego (One Piece, Pokémon, Magic…) pertenece la carpeta manual.
      // Las viejas quedan en NULL y se muestran dentro de "Otros TCG".
      await sql`ALTER TABLE tcg_folders ADD COLUMN IF NOT EXISTS game TEXT`;
      // Juegos que el usuario agregó a su sección TCG — así un juego recién
      // agregado aparece aunque todavía no tenga ninguna carpeta.
      await sql`CREATE TABLE IF NOT EXISTS tcg_games (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, game)
      )`;
      // Cuánto valía la colección TCG de cada usuario cada día, por juego —
      // para el gráfico de evolución del valor. Se guarda un valor por día
      // (el último del día pisa al anterior).
      await sql`CREATE TABLE IF NOT EXISTS tcg_value_history (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        game TEXT NOT NULL,
        value NUMERIC(12,2) NOT NULL,
        PRIMARY KEY (user_id, day, game)
      )`;
      // Compras de producto sellado (sobres, cajas, displays…) por juego,
      // para la ganancia/pérdida: lo invertido contra lo que vale lo que
      // tenés. Monto en dólares.
      await sql`CREATE TABLE IF NOT EXISTS tcg_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(14,4) NOT NULL,
        day DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // Link público de solo lectura a la colección de manga de un usuario
      // (uno por usuario; borrar la fila lo desactiva).
      await sql`CREATE TABLE IF NOT EXISTS share_links (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // Mazos armados por el usuario. cards = [{ number: "OP01-016", qty: 4 }]
      // (por número de carta, sin importar si la copia es normal o paralela).
      await sql`CREATE TABLE IF NOT EXISTS tcg_decks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game TEXT NOT NULL,
        name TEXT NOT NULL,
        cards JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    wish: !!r.wish,
    cost: r.cost == null ? null : Number(r.cost),
    meta: r.meta || {},
    createdAt: r.created_at
  };
}

export function rowToUser(r) {
  return { id: String(r.id), email: r.email, createdAt: r.created_at };
}

export function rowToTcgFolder(r) {
  return { id: r.id, name: r.name, game: r.game || "otros" };
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
