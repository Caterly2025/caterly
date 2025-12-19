import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import "leaflet/dist/leaflet.css";


export const metadata: Metadata = {
  title: "Caterly – Smart Catering Platform",
  description: "Order management for restaurants and customers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Allow both light and dark color schemes, following system by default */}
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
