import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Caterly",
  description: "Catering app powered by Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          backgroundColor: "#f5f5f5",
        }}
      >
        <AppHeader />
        <main style={{ padding: "2rem" }}>{children}</main>
      </body>
    </html>
  );
}
