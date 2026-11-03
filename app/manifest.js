// Manifest de la app instalable (PWA): con esto Chrome/Edge en Android y PC
// ofrecen "Instalar Mi Estante" y se abre como app, con su ícono, sin barra
// del navegador.
export default function manifest() {
  return {
    name: "Mi Estante",
    short_name: "Mi Estante",
    description: "Tu colección de manga, anime y cartas TCG",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#14101C",
    theme_color: "#0D0A14",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
