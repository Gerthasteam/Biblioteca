// Cotizaciones del dólar en Argentina (dolarapi.com, gratis y sin key) para
// mostrar los precios de las cartas en pesos. Se usa el precio de venta.
// Se guarda en memoria 30 minutos mientras la función siga "tibia".
let cache = null;
let cacheAt = 0;

export async function GET() {
  try {
    if (!cache || Date.now() - cacheAt > 30 * 60 * 1000) {
      const res = await fetch("https://dolarapi.com/v1/dolares", { cache: "no-store" });
      if (!res.ok) throw new Error("upstream_error");
      const json = await res.json();
      const rates = {};
      let updated = null;
      for (const d of Array.isArray(json) ? json : []) {
        if (Number.isFinite(d.venta)) rates[d.casa] = d.venta;
        if (d.fechaActualizacion && (!updated || d.fechaActualizacion > updated)) updated = d.fechaActualizacion;
      }
      cache = { rates, updated };
      cacheAt = Date.now();
    }
    return Response.json(cache);
  } catch {
    return Response.json({ rates: {}, error: "fetch_failed" }, { status: 502 });
  }
}
