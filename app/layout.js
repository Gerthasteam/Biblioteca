import "./globals.css";

export const metadata = {
  title: "Mi Estante",
  description: "Tu colección de manga, TCG, videojuegos y anime"
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
