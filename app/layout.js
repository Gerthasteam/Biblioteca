import "./globals.css";

export const metadata = {
  title: "Mi Estante",
  description: "Tu colección de manga, anime y cartas TCG",
  // instalable en iPhone/iPad ("Agregar a pantalla de inicio")
  appleWebApp: { capable: true, title: "Mi Estante", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" }
};

// viewportFit "cover" + env(safe-area-inset-*) en globals.css para que en
// teléfonos con notch / barra de gestos la barra de abajo no quede tapada.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0D0A14"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
