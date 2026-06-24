"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Incorrect password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="card p-7">
        <img src="/amn-logo-black.png" alt="AMN" className="mx-auto h-8 w-auto" />
        <h1 className="mt-6 text-center text-xl font-extrabold tracking-tight">Admin access</h1>
        <p className="mt-1 text-center text-sm text-muted">Enter the admin password to continue.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-[46px] w-full rounded-xl border border-line bg-panel px-4 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          />
          {error && <p className="text-sm text-bad">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full disabled:opacity-60">
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
