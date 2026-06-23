"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Report } from "@/lib/types";
import { ProgressScreen, ReportScreen } from "./parts";
import { Header } from "../ui";

const STEP_COUNT = 5;

// When each step becomes active (ms). Spread so the research phases pace out
// over the real wait. The final step then holds (spinner running) until the
// report actually arrives.
const SCHEDULE = [0, 2600, 6200, 11000, 17000];

// Hard client-side ceiling so the screen can never hang forever.
const CLIENT_TIMEOUT_MS = 65000;

export default function AuditView() {
  const params = useSearchParams();
  const url = params.get("url") ?? "";

  const [step, setStep] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const reportArrived = useRef(false);

  // Fetch + staged progress.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    SCHEDULE.forEach((delay, i) => {
      timers.push(
        setTimeout(() => {
          if (!cancelled && !reportArrived.current) setStep(i);
        }, delay),
      );
    });

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    timers.push(abortTimer);

    (async () => {
      try {
        const res = await fetch(`/api/audit?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (cancelled) return;
        clearTimeout(abortTimer);
        if (!res.ok) {
          setError(data?.error || "We couldn't complete that audit.");
          return;
        }
        reportArrived.current = true;
        setReport(data as Report);
      } catch {
        if (!cancelled) {
          setError("This audit took too long or the connection dropped. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      controller.abort();
    };
  }, [url]);

  // Once the report is in, walk any remaining steps to completion, then reveal.
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    let s = Math.max(step, 0);

    const advance = () => {
      if (cancelled) return;
      if (s < STEP_COUNT - 1) {
        s += 1;
        setStep(s);
        window.setTimeout(advance, 280);
      } else {
        setStep(STEP_COUNT);
        window.setTimeout(() => {
          if (!cancelled) setRevealed(true);
        }, 280);
      }
    };

    const id = window.setTimeout(advance, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // Run once when the report arrives; `step` is read as its value at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  if (!url) {
    return <Notice title="No URL provided" body="Head back and enter a hotel website to audit." />;
  }

  if (error) {
    return <Notice title="Audit failed" body={error} />;
  }

  if (report && revealed) {
    return <ReportScreen report={report} />;
  }

  return <ProgressScreen url={url} step={Math.min(step, STEP_COUNT - 1)} />;
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-5 pt-32 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        <Link href="/" className="btn-brand mt-6">
          Audit a property
        </Link>
      </main>
    </>
  );
}
