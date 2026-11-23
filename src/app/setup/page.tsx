import type { Metadata } from "next";
import { missingSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Setup" };

// Shown instead of errors when .env.local is incomplete.
export default function SetupPage() {
  const missing = missingSupabaseEnv();
  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: "0 20px" }}>
      <p className="eyebrow">Setup required</p>
      <h1 style={{ margin: "8px 0 16px" }}>Add your settings to .env.local</h1>
      <p>The app needs these values before it can sign anyone in:</p>
      <ul style={{ margin: "16px 0", paddingLeft: 20, color: "var(--text-muted)" }}>
        {missing.map((name) => (
          <li key={name} style={{ fontFamily: "monospace", marginBottom: 6 }}>
            {name}
          </li>
        ))}
      </ul>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values from the Supabase dashboard
        (Project settings &gt; API Keys), then restart <code>npm run dev</code>. Steps are in{" "}
        <code>docs/dev-setup.md</code>.
      </p>
    </main>
  );
}
