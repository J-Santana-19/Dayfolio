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
  title: "Dayfolio — Agenda, notas y calendario",
  description: "Planifica tu día, escribe tus ideas y conserva tu historia en una agenda digital clásica, privada y local-first.",
  metadataBase: new URL("https://lumina-espacio-personal.abelzit0.chatgpt.site"),
  openGraph: {
    title: "Dayfolio — Agenda, notas y calendario",
    description: "Planifica tu día. Captura tu historia.",
    images: [{ url: "/dayfolio-brand.png", width: 1254, height: 1254, alt: "Logo de Dayfolio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dayfolio — Agenda, notas y calendario",
    description: "Planifica tu día. Captura tu historia.",
    images: ["/dayfolio-brand.png"],
  },
  icons: {
    icon: "/dayfolio-icon.png",
    shortcut: "/dayfolio-icon.png",
    apple: "/dayfolio-icon.png",
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
