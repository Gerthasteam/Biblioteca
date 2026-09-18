import { sql, ensureSchema, rowToUser } from "../../../../lib/db";
import { verifyPassword, createSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return Response.json({ error: "invalid", message: "Faltan mail y contraseña." }, { status: 400 });
    }

    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return Response.json(
        { error: "invalid_credentials", message: "Mail o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const cookie = createSessionCookie(user.id);
    return Response.json({ user: rowToUser(user) }, { headers: { "Set-Cookie": cookie } });
  } catch (err) {
    return Response.json({ error: "db_unavailable", message: String(err?.message || err) }, { status: 503 });
  }
}
