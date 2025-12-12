import type { Metadata } from "next";
import "./globals.css";

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
        {/* Enable automatic light/dark mode based on system settings */}
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        {/* Global wrapper so all pages share styling */}
        <div className="app-container">{children}</div>
      </body>
    </html>
  );
}
