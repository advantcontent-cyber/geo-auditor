import Link from "next/link";
import type { Grade, Impact, Report } from "@/lib/types";
import { Header } from "../ui";

/* ----------------------------- shared helpers ----------------------------- */

function gradeText(grade: Grade): string {
  switch (grade) {
    case "EXCELLENT":
      return "text-good";
    case "GOOD":
      return "text-good";
    case "NEEDS WORK":
      return "text-warn";
    case "POOR":
      return "text-bad";
  }
}

function barColor(score: number): string {
  if (score < 50) return "bg-bad";
  if (score < 65) return "bg-warn";
  return "bg-good";
}

function scoreText(score: number): string {
  if (score < 50) return "text-bad";
  if (score < 65) return "text-warn";
  return "text-good";
}

const impactStyle: Record<Impact, string> = {
  HIGH: "bg-bad/15 text-bad",
  MEDIUM: "bg-warn/15 text-warn",
  LOW: "bg-good/15 text-good",
};

function Badge({ impact, label }: { impact: Impact; label: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${impactStyle[impact]}`}
    >
      {label}
    </span>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-bad" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-good" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  );
}

/* ------------------------------ progress view ----------------------------- */

const STEPS = [
  "Checking OTA presence & reviews",
  "Searching for brand mentions & press",
  "Analysing AI recommendation context",
  "Scoring your AI visibility signals",
  "Building your personalised report",
];

export function ProgressScreen({ url, step }: { url: string; step: number }) {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-24 text-center sm:pt-32">
        <div className="ring-spinner" aria-hidden />

        <h1 className="mt-12 max-w-2xl break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
          Auditing {url} …
        </h1>
        <p className="mt-3 text-muted">Running live web research — takes ~30 seconds</p>

        <div className="mt-12 w-full max-w-md text-left">
          <p className="eyebrow mb-5">Progress</p>
          <ul className="space-y-4">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors ${
                    active
                      ? "bg-brand/10 ring-1 ring-brand/40 text-ink"
                      : done
                        ? "text-muted"
                        : "text-muted/45"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      done ? "bg-good" : active ? "bg-brand animate-pulse" : "bg-muted/30"
                    }`}
                  />
                  {label} …
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </>
  );
}

/* ------------------------------- report view ------------------------------ */

function Panel({
  eyebrow,
  children,
  className = "",
}: {
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      {children}
    </section>
  );
}

export function ReportScreen({ report }: { report: Report }) {
  const r = report;
  const sub = [r.domain, r.location].filter(Boolean).join(" · ");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-report space-y-5 px-5 pb-24 pt-12">
        {/* heading */}
        <div className="animate-fade-up">
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {sub}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {r.propertyName} — GEO Report
          </h1>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            ← Audit another property
          </Link>
        </div>

        {/* score */}
        <Panel className="animate-fade-up text-center">
          <div className="flex items-end justify-center gap-1">
            <span className={`text-6xl font-extrabold leading-none ${gradeText(r.grade)}`}>
              {r.overallScore}
            </span>
            <span className="mb-1 text-lg text-muted">/100</span>
          </div>
          <p className={`mt-2 text-sm font-bold uppercase tracking-[0.16em] ${gradeText(r.grade)}`}>
            {r.grade}
          </p>
          <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${barColor(r.overallScore)}`}
              style={{ width: `${r.overallScore}%` }}
            />
          </div>
          <p className="mx-auto mt-5 max-w-md font-semibold text-ink">{r.headline}</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{r.summary}</p>
          <a
            href="https://theamn.network/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand mt-6"
          >
            Book a GEO Strategy Call
          </a>
          <p className="mt-3 text-xs text-muted">Free 30-min call · No obligation</p>
        </Panel>

        {/* breakdown */}
        <Panel eyebrow="How your score breaks down" className="animate-fade-up">
          <div className="space-y-3.5">
            {r.breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-muted">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${barColor(b.score)}`}
                    style={{ width: `${b.score}%` }}
                  />
                </div>
                <span className={`w-8 shrink-0 text-right font-bold ${scoreText(b.score)}`}>
                  {b.score}
                </span>
                <span className="w-9 shrink-0 text-right text-[11px] text-muted/70">
                  {b.weight}%
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* AI visibility */}
        <Panel className="animate-fade-up">
          <p className="eyebrow mb-4 text-brand">AI Search Visibility</p>
          <p className="text-sm leading-relaxed text-muted">{r.aiVisibility.text}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            <span className="text-ink">Currently appearing: </span>
            {r.aiVisibility.currentlyAppearing}
          </p>
          <span
            className={`mt-5 inline-block rounded-full border px-3 py-1.5 text-xs font-semibold ${
              r.aiVisibility.appears
                ? "border-good/40 text-good"
                : "border-warn/40 text-warn"
            }`}
          >
            {r.aiVisibility.appears ? "→ " : "← "}
            {r.aiVisibility.verdict}
          </span>
        </Panel>

        {/* hurting */}
        <Panel eyebrow="What's hurting your AI visibility" className="animate-fade-up">
          <div className="space-y-3">
            {r.issues.map((it) => (
              <div key={it.title} className="rounded-xl border border-bad/30 bg-bad/[0.05] p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5">
                    <XIcon />
                  </span>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {it.title}
                      <Badge impact={it.impact} label={`${it.impact} Impact`} />
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{it.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* working */}
        <Panel eyebrow="What's working in your favour" className="animate-fade-up">
          <div className="space-y-3">
            {r.positives.map((p) => (
              <div key={p.title} className="rounded-xl border border-good/30 bg-good/[0.05] p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5">
                    <CheckIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-good">{p.title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{p.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* action plan */}
        <Panel eyebrow="Your GEO action plan" className="animate-fade-up">
          <div className="space-y-3">
            {r.actionPlan.map((a, i) => (
              <div key={a.title} className="rounded-xl border border-line bg-panel2/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/15 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {a.title}
                      <Badge impact={a.priority} label={a.priority} />
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{a.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* final CTA */}
        <section
          id="book"
          className="card animate-fade-up scroll-mt-24 bg-brand/[0.06] p-8 text-center"
        >
          <h2 className="text-2xl font-extrabold tracking-tight">Ready to fix this?</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            We help hotels improve their AI visibility so they appear in ChatGPT, Perplexity,
            and Google AI Overviews — and win more direct bookings.
          </p>
          <a
            href="https://theamn.network/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand mt-6"
          >
            Book a GEO Strategy Call
          </a>
          <p className="mt-3 text-xs text-muted">
            Free 30-min call · Hospitality specialists · No obligation
          </p>
        </section>

        <footer className="pt-6 text-center text-xs text-muted/70">
          <span className="font-semibold text-ink">AMN</span> · GEO Visibility Intelligence for
          Hospitality
        </footer>
      </main>
    </>
  );
}
