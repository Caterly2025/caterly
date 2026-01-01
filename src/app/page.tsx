// app/page.tsx
"use client";
import AuthGate from "@/AuthGate";

export default function Page() {
  return <AuthGate />;
}
