import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, isAuthed, adminConfigured } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = { title: "Admin — AMN GEO Auditor" };

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md px-5 pt-32 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Admin not configured</h1>
        <p className="mt-3 text-muted">
          Set the <code className="rounded bg-panel2 px-1.5 py-0.5 text-ink">ADMIN_PASSWORD</code>{" "}
          environment variable to enable the dashboard.
        </p>
        <Link href="/" className="btn-brand mt-6">
          Back to auditor
        </Link>
      </main>
    );
  }

  const store = await cookies();
  const authed = isAuthed(store.get(ADMIN_COOKIE)?.value);

  return authed ? <Dashboard /> : <LoginForm />;
}
