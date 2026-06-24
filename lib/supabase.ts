/**
 * Minimal Supabase access via the REST (PostgREST) API — no SDK dependency.
 * Uses the SERVICE ROLE key, so this module must only ever run server-side.
 * If the env vars are absent, logging silently no-ops and the dashboard shows
 * a "not configured" state instead of crashing.
 */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: KEY as string,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export interface AuditLogRow {
  url: string;
  domain: string;
  property_name: string;
  score: number;
  grade: string;
  engine: "ai" | "heuristic";
  web_search: boolean;
  appears: boolean;
  worst_dimensions: { label: string; score: number }[];
}

export async function logAudit(row: AuditLogRow): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    await fetch(`${URL}/rest/v1/audits`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
    });
  } catch {
    // Logging must never break the audit response.
  }
}

export interface AuditStats {
  total: number;
  unique_sites: number;
  this_week: number;
  avg_score: number;
  ai_count: number;
  heuristic_count: number;
  daily: { day: string; count: number }[];
}

export async function getStats(): Promise<AuditStats> {
  const res = await fetch(`${URL}/rest/v1/rpc/admin_audit_stats`, {
    method: "POST",
    headers: headers(),
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`stats failed: ${res.status}`);
  return res.json();
}

export interface RecentAudit {
  domain: string;
  url: string;
  score: number;
  grade: string;
  engine: string;
  web_search: boolean;
  appears: boolean;
  created_at: string;
}

export async function getRecent(limit = 12): Promise<RecentAudit[]> {
  const cols = "domain,url,score,grade,engine,web_search,appears,created_at";
  const res = await fetch(
    `${URL}/rest/v1/audits?select=${cols}&order=created_at.desc&limit=${limit}`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`recent failed: ${res.status}`);
  return res.json();
}
