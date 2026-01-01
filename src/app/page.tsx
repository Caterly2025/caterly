// app/page.tsx
"use client";
import AuthGate from "../src/AuthGate"; // adjust import path

export default function Page() {
  return <AuthGate />;
}


export default function HomePage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1>Welcome to Caterly</h1>
      <p>
        This is a demo catering app using Supabase for{" "}
        <strong>Anderson Deli</strong>.
      </p>
      <ul>
        <li>
          <a href="/customer">Customer View</a> – Browse menu and place an order.
        </li>
        <li>
          <a href="/owner">Owner View</a> – View and manage orders for Anderson
          Deli.
        </li>
      </ul>
    </div>
  );
}
