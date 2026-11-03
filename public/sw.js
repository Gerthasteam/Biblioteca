// Service worker mínimo de Mi Estante: hace que la web sea instalable y,
// si no hay conexión al abrirla, muestra un aviso en vez de la pantalla de
// error del navegador. No guarda datos de la colección (siempre se piden en
// vivo), así nunca se ve una colección vieja.
const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi Estante</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14101C;color:#F5F1F8;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.c{max-width:320px;background:#241C30;border:1px solid #493D5C;border-radius:14px;padding:26px 22px}p{color:#B2A6C2;font-size:.9rem}button{font:inherit;font-weight:700;background:#523874;color:#fff;border:0;border-radius:8px;padding:11px 20px}</style></head>
<body><div class="c"><h1 style="font-size:1.15rem;margin:0 0 8px">Sin conexión</h1><p>Mi Estante necesita internet para traer tu colección.</p><button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // solo las navegaciones (abrir la app); todo lo demás va directo a la red
  if (req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
  );
});
