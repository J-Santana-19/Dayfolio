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
  title: "Lúmina — Tu espacio para pensar",
  description: "Documenta, dibuja, organiza y convierte ideas en flujos dentro de un espacio personal local-first.",
  metadataBase: new URL("https://lumina-workspace.sites.openai.com"),
  openGraph: {
    title: "Lúmina — Tu espacio para pensar",
    description: "Documenta, dibuja y organiza ideas en un espacio personal local-first.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vista del espacio personal Lúmina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lúmina — Tu espacio para pensar",
    description: "Documenta, dibuja y organiza ideas en un espacio personal local-first.",
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
