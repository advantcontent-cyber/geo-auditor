"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Stats {
  total: number;
  unique_sites: number;
  this_week: number;
  avg_score: number;
  ai_count: number;
  heuristic_count: number;
  daily: { day: string; count: number }[];
}
interface Recent {
  domain: string;
  url: string;
  score: number;
  grade: string;
  engine: string;
  web_search: boolean;
  appears: boolean;
  created_at: string;
}
interface Payload {
  configured: boolean;
  stats?: Stats;
  recent?: Recent[];
  error?: string;
}

function relativeTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function last14(daily: { day: string; count: number }[]) {
  const map = new Map(daily.map((d) => [d.day, d.count]));
  const out: { day: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: map.get(key) ?? 0 });
  }
  return out;
}

function scorePill(score: number) {
  const cls =
    score >= 65 ? "bg-good/15 text-good" : score >= 50 ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{score}</span>
  );
}

function enginePill(engine: string, web: boolean) {
  if (engine === "ai") {
    return (
      <span className="rounded px-2 py-0.5 text-xs font-medium bg-brand/15 text-brand">
        {web ? "AI + web" : "AI"}
      </span>
    );
  }
  return (
    <span className="rounded px-2 py-0.5 text-xs font-medium bg-line text-muted">Heuristic</span>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-panel2 p-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-ink">
        {value} {sub}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load.");
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const days = data?.stats ? last14(data.stats.daily) : [];
  const peak = Math.max(1, ...days.map((d) => d.count));

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/amn-logo-black.png" alt="AMN" className="h-7 w-auto" />
          <span className="text-muted">·</span>
          <span className="text-sm text-muted">GEO Auditor admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Auditor
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Audit dashboard</h1>

      {error && (
        <div className="card mt-6 p-5 text-sm text-bad">{error}</div>
      )}

      {!error && data && !data.configured && (
        <div className="card mt-6 p-5">
          <p className="font-semibold text-ink">Supabase not connected yet</p>
          <p className="mt-1.5 text-sm text-muted">
            Set <code className="rounded bg-panel2 px-1.5 py-0.5">SUPABASE_URL</code> and{" "}
            <code className="rounded bg-panel2 px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code>, run
            the setup SQL, and audits will start appearing here.
          </p>
        </div>
      )}

      {!error && !data && (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      )}

      {!error && data?.configured && data.stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total audits" value={data.stats.total.toLocaleString()} />
            <Metric label="Unique sites" value={data.stats.unique_sites.toLocaleString()} />
            <Metric label="This week" value={data.stats.this_week.toLocaleString()} />
            <Metric label="Avg score" value={String(data.stats.avg_score)} />
          </div>

          <section className="card mt-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Audits · last 14 days</p>
              <p className="text-xs text-muted">
                {data.stats.ai_count.toLocaleString()} AI · {data.stats.heuristic_count.toLocaleString()} heuristic
              </p>
            </div>
            <div className="mt-5 flex h-36 items-end gap-1.5">
              {days.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 rounded-t bg-brand transition-all"
                  style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }}
                  title={`${d.label}: ${d.count}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted/70">
              <span>{days[0]?.label}</span>
              <span>{days[days.length - 1]?.label}</span>
            </div>
          </section>

          <section className="card mt-5 p-5 sm:p-6">
            <p className="eyebrow mb-4">Recent audits</p>
            {data.recent && data.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[12px] text-muted/70">
                      <th className="pb-3 font-medium">Site</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Verdict</th>
                      <th className="pb-3 font-medium">Engine</th>
                      <th className="pb-3 text-right font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="max-w-[200px] truncate py-3 text-ink">{r.domain}</td>
                        <td className="py-3">{scorePill(r.score)}</td>
                        <td className={`py-3 ${r.appears ? "text-good" : "text-muted"}`}>
                          {r.appears ? "Likely" : "Unlikely"}
                        </td>
                        <td className="py-3">{enginePill(r.engine, r.web_search)}</td>
                        <td className="py-3 text-right text-muted">{relativeTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No audits logged yet.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
