// Server-side proxy a la Steam Web API para traer TODA la biblioteca de
// Steam de una — no confundir con el buscador público de la tienda que ya
// usa /api/search (ese no necesita key). Esto sí necesita una API key
// propia (gratis, instantánea, en https://steamcommunity.com/dev/apikey)
// cargada en Vercel como STEAM_API_KEY, y que el perfil de Steam del
// usuario tenga "Detalles del juego" en público.

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("id") || "").trim();
  const key = process.env.STEAM_API_KEY;

  if (!key) {
    return Response.json({
      error: "no_key",
      message:
        'Todavía falta configurar la clave de Steam. Conseguila gratis en steamcommunity.com/dev/apikey y cargala en Vercel como "STEAM_API_KEY".'
    });
  }
  if (!raw) return Response.json({ games: [] });

  try {
    const steamId = await resolveSteamId(raw, key);
    if (!steamId) {
      return Response.json({
        error: "not_found",
        message: "No encontramos ese perfil de Steam. Probá con tu link de perfil completo o tu SteamID64."
      });
    }

    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${encodeURIComponent(
      key
    )}&steamid=${encodeURIComponent(steamId)}&format=json&include_appinfo=true&include_played_free_games=true`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: "upstream_error", message: "Steam no respondió, probá de nuevo en un rato." });
    }
    const json = await res.json();
    const list = json?.response?.games;
    if (!Array.isArray(list)) {
      return Response.json({
        error: "private",
        message:
          'No pudimos ver la biblioteca de ese perfil. Tiene que tener "Detalles del juego" en público — en Steam: tu perfil → Editar perfil → Config. de privacidad.'
      });
    }
    const games = list
      .map((g) => ({
        appid: g.appid,
        title: g.name,
        cover: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        minutes: g.playtime_forever || 0
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
    return Response.json({ games });
  } catch (err) {
    return Response.json({ error: "fetch_failed", message: String(err?.message || err) });
  }
}

// Aceptamos: SteamID64 (17 dígitos), un link completo del perfil
// (steamcommunity.com/id/xxx o /profiles/xxx), o el nombre de usuario
// ("vanity") suelto.
async function resolveSteamId(raw, key) {
  let s = raw.trim();
  const m = s.match(/steamcommunity\.com\/(id|profiles)\/([^/\s?#]+)/i);
  if (m) s = m[2];
  if (/^\d{17}$/.test(s)) return s;
  try {
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(
      key
    )}&vanityurl=${encodeURIComponent(s)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.response?.success === 1) return json.response.steamid;
    return null;
  } catch {
    return null;
  }
}
