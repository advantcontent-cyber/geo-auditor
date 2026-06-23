"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./ui";

const DIMENSIONS = [
  "AI Bot Accessibility",
  "Content Freshness",
  "Content Structure for AI",
  "Structured Data",
  "OTA & Review Presence",
  "Brand Mentions",
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (v.length < 3) return;
    router.push(`/audit?url=${encodeURIComponent(v)}`);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-20 text-center sm:pt-28">
        <p className="eyebrow">GEO Visibility Intelligence for Hospitality</p>

        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
          See if AI recommends
          <br className="hidden sm:block" /> your hotel.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          ChatGPT, Perplexity and Google AI Overviews are the new front desk. Run a free
          audit and see exactly where your property stands in AI search — in about 30 seconds.
        </p>

        <form
          onSubmit={submit}
          className="mx-auto mt-9 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="url" className="sr-only">
            Hotel website URL
          </label>
          <input
            id="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="yourhotel.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-[52px] flex-1 rounded-xl border border-line bg-panel px-4 py-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          />
          <button type="submit" className="btn-brand h-[52px] whitespace-nowrap px-6 py-3.5">
            Run free audit
          </button>
        </form>

        <p className="mt-3 text-xs text-muted">
          Free · No signup · Live web research
        </p>

        <div className="mx-auto mt-16 flex max-w-xl flex-wrap justify-center gap-2">
          {DIMENSIONS.map((d) => (
            <span
              key={d}
              className="rounded-full border border-line bg-panel/60 px-3 py-1.5 text-xs text-muted"
            >
              {d}
            </span>
          ))}
        </div>
      </main>
    </>
  );
}
