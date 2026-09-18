import { sql, ensureSchema, rowToUser } from "../../../../lib/db";
import { hashPassword, createSessionCookie } from "../../../../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "invalid_email", message: "Poné un mail válido." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json(
        { error: "invalid_password", message: "La contraseña tiene que tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length) {
      return Response.json({ error: "email_taken", message: "Ya existe una cuenta con ese mail." }, { status: 409 });
    }

    // La primera cuenta que se crea en toda la app "adopta" automáticamente
    // todo lo que ya estaba cargado antes de que existieran las cuentas
    // (user_id todavía NULL) — así no se pierde la colección de quien ya
    // venía usando la app.
    const { rows: anyUser } = await sql`SELECT id FROM users LIMIT 1`;
    const isFirstUser = anyUser.length === 0;

    const passwordHash = hashPassword(password);
    const { rows } = await sql`
      INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash}) RETURNING *`;
    const user = rows[0];

    if (isFirstUser) {
      await sql`UPDATE items SET user_id = ${user.id} WHERE user_id IS NULL`;
      await sql`UPDATE animes SET user_id = ${user.id} WHERE user_id IS NULL`;
      await sql`UPDATE tcg_folders SET user_id = ${user.id} WHERE user_id IS NULL`;
    }

    const cookie = createSessionCookie(user.id);
    return Response.json({ user: rowToUser(user) }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
