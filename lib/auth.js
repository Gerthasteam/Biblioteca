import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";

const SESSION_COOKIE = "estante_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

// No sumamos una variable de entorno nueva para esto — la clave con la que
// se firman las sesiones sale de la misma cadena de conexión a la base (que
// Vercel ya guarda como secreta) más una frase fija. Si algún día cambia esa
// cadena, todas las sesiones activas se cierran solas, lo cual está bien.
function getSecret() {
  const base =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    "mi-estante-dev-secret";
  return base + "::mi-estante-web-sessions";
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hashHex] = stored.split(":");
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function sign(payload) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Ojo: la cookie NO lleva el flag "Secure" a propósito — Vercel sirve todo
// por HTTPS igual, pero así la sesión también funciona probando en
// localhost por HTTP sin tener que distinguir entornos.
export function createSessionCookie(userId) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${expires}`;
  const token = `${payload}.${sign(payload)}`;
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers.get("cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export function getUserIdFromRequest(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdRaw, expiresRaw, sig] = parts;
  const payload = `${userIdRaw}.${expiresRaw}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (Number(expiresRaw) < Math.floor(Date.now() / 1000)) return null;
  const userId = Number(userIdRaw);
  return Number.isFinite(userId) ? userId : null;
}

// Para usar al principio de cada ruta que guarda/lee datos de un usuario:
// const { userId, response } = requireUser(req);
// if (response) return response;
export function requireUser(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return {
      userId: null,
      response: Response.json(
        { error: "unauthorized", message: "Iniciá sesión para continuar." },
        { status: 401 }
      )
    };
  }
  return { userId, response: null };
}
