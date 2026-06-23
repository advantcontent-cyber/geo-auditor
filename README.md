# GEO Auditor — Advant

GEO (Generative Engine Optimization) visibility auditor for hospitality. Enter a hotel
website and get a live report on how likely it is to appear in AI search — ChatGPT,
Perplexity, and Google AI Overviews — with a scored breakdown and an action plan.

Built with **Next.js 14 (App Router)** + **TypeScript** + **Tailwind CSS**. Zero config,
zero secrets — deploys to Vercel as-is.

## How it works

- `/` — landing page with the URL input.
- `/audit?url=…` — animated "live research" progress screen, then the report.
- `/api/audit?url=…` — server route that fetches the target site, reads **real signals**
  (JSON-LD structured data, headings, meta description, placeholder text, `robots.txt`
  GPTBot accessibility), scores six weighted dimensions, and returns the report.

Scores are stable per-domain. Some dimensions that can't be measured from a single page
(OTA presence, brand mentions) are estimated from a domain seed and biased to reflect the
typical luxury-hotel pattern.

### Swapping in a real LLM analysis

The heuristic engine lives in `lib/audit.ts`. To run real web research instead, replace the
`runAudit()` body in `app/api/audit/route.ts` with a call to your model provider (e.g.
Anthropic with web search) and map the response onto the `Report` type in `lib/types.ts`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/geo-auditor.git
git branch -M main
git push -u origin main
```

(The repo is already initialised with a first commit.)

### 2. Connect to Vercel

1. Go to vercel.com → **Add New… → Project**.
2. Import the `geo-auditor` repo.
3. Framework preset auto-detects **Next.js** — no env vars needed.
4. **Deploy.**

## Project structure

```
app/
  layout.tsx          root layout + font
  page.tsx            landing / URL input
  ui.tsx              header + logo
  audit/
    page.tsx          Suspense wrapper
    AuditView.tsx     progress + fetch orchestration
    parts.tsx         ProgressScreen + ReportScreen
  api/audit/route.ts  audit endpoint
lib/
  audit.ts            fetch + signal extraction + scoring
  types.ts            Report types
```
