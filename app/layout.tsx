import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mi Diario — Notas y calendario",
  description: "Escribe, organiza tus días y conserva tus recuerdos en una agenda digital clásica, privada y local-first.",
  metadataBase: new URL("https://lumina-espacio-personal.abelzit0.chatgpt.site"),
  openGraph: {
    title: "Mi Diario — Notas y calendario",
    description: "Tu historia importa. Escríbela cada día.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vista de Mi Diario" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mi Diario — Notas y calendario",
    description: "Tu historia importa. Escríbela cada día.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
