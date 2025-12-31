import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CoperniGeo - Monitoreo de Cultivos por Satélite",
  description: "Plataforma de monitoreo agrícola mediante imágenes satelitales",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

