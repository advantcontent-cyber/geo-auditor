import type { ActionItem, Issue, Positive } from "./types";

/**
 * Real AI-powered GEO analysis via OpenRouter (Claude Haiku by default, with
 * optional live web search). Returns null on any failure so the caller can fall
 * back to the heuristic engine. The API key is read from the environment and is
 * never logged or returned to the client.
 */

export interface LlmInputSignals {
  fetched: boolean;
  propertyName: string;
  location: string;
  hasMetaDescription: boolean;
  jsonLdCount: number;
  hasLodgingSchema: boolean;
  headingCount: number;
  textLength: number;
  hasPlaceholder: boolean;
  gptBotAllowed: boolean;
  textExcerpt: string;
}

export interface LlmAnalysis {
  propertyName: string;
  location: string;
  scores: {
    aiBot: number;
    freshness: number;
    structure: number;
    structured: number;
    ota: number;
    brand: number;
  };
  headline: string;
  summary: string;
  aiVisibility: {
    appears: boolean;
    text: string;
    currentlyAppearing: string;
  };
  issues: Issue[];
  positives: Positive[];
  actionPlan: ActionItem[];
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM = `You are a GEO (Generative Engine Optimization) analyst for hotels.
GEO is about whether a property is surfaced and cited by AI answer engines (ChatGPT,
Perplexity, Google AI Overviews, Claude, Gemini) in hotel-recommendation queries.

You assess a hotel website and produce a concise, specific, constructive report. Use the
page signals provided, plus web research where available, to ground every claim. Score six
dimensions from 0 to 100, honestly and specifically. Reward strong structured data, fresh
content, and editorial/brand authority; penalise placeholder content, thin markup, and
absence from AI-style "best hotels" recommendations.

Style: plain language, no em-dashes, be concrete and avoid generic filler.

Return ONLY a JSON object (no markdown, no commentary) with exactly this shape:
{
  "propertyName": string,
  "location": string,
  "scores": { "aiBot": number, "freshness": number, "structure": number, "structured": number, "ota": number, "brand": number },
  "headline": string,
  "summary": string,
  "aiVisibility": { "appears": boolean, "text": string, "currentlyAppearing": string },
  "issues": [ { "title": string, "detail": string, "impact": "HIGH"|"MEDIUM"|"LOW" } ],
  "positives": [ { "title": string, "detail": string } ],
  "actionPlan": [ { "title": string, "detail": string, "priority": "HIGH"|"MEDIUM"|"LOW" } ]
}
Provide 4 to 5 issues, 2 to 3 positives, and 6 to 7 action items ordered by priority.`;

function buildUserPrompt(url: string, domain: string, s: LlmInputSignals): string {
  return `Audit this hotel website for AI search visibility.

URL: ${url}
Domain: ${domain}

Page signals (measured from the live page):
- Reachable: ${s.fetched}
- Detected name: ${s.propertyName || "unknown"}
- Detected location: ${s.location || "unknown"}
- Meta description present: ${s.hasMetaDescription}
- JSON-LD structured data blocks: ${s.jsonLdCount}
- Hotel/LodgingBusiness schema present: ${s.hasLodgingSchema}
- Heading count (h1-h3): ${s.headingCount}
- Body text length (chars): ${s.textLength}
- Placeholder/Lorem-ipsum text found: ${s.hasPlaceholder}
- AI crawlers (GPTBot/PerplexityBot) allowed by robots.txt: ${s.gptBotAllowed}

Page text excerpt:
"""
${s.textExcerpt.slice(0, 5000)}
"""

Research the brand's presence in AI-style hotel recommendations and editorial coverage where
you can, then return the JSON report.`;
}

function isImpact(v: unknown): v is "HIGH" | "MEDIUM" | "LOW" {
  return v === "HIGH" || v === "MEDIUM" || v === "LOW";
}

function parseAnalysis(raw: string): LlmAnalysis | null {
  // Strip code fences and isolate the JSON object.
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  let data: any;
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const sc = data?.scores;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : NaN);
  const scores = {
    aiBot: num(sc?.aiBot),
    freshness: num(sc?.freshness),
    structure: num(sc?.structure),
    structured: num(sc?.structured),
    ota: num(sc?.ota),
    brand: num(sc?.brand),
  };
  if (Object.values(scores).some((n) => Number.isNaN(n))) return null;

  const issues: Issue[] = Array.isArray(data.issues)
    ? data.issues
        .filter((i: any) => i?.title && i?.detail && isImpact(i?.impact))
        .map((i: any) => ({ title: String(i.title), detail: String(i.detail), impact: i.impact }))
    : [];
  const positives: Positive[] = Array.isArray(data.positives)
    ? data.positives
        .filter((p: any) => p?.title && p?.detail)
        .map((p: any) => ({ title: String(p.title), detail: String(p.detail) }))
    : [];
  const actionPlan: ActionItem[] = Array.isArray(data.actionPlan)
    ? data.actionPlan
        .filter((a: any) => a?.title && a?.detail && isImpact(a?.priority))
        .map((a: any) => ({ title: String(a.title), detail: String(a.detail), priority: a.priority }))
    : [];

  const av = data.aiVisibility;
  if (
    !data.headline ||
    !data.summary ||
    !av ||
    typeof av.text !== "string" ||
    typeof av.currentlyAppearing !== "string" ||
    issues.length === 0 ||
    positives.length === 0 ||
    actionPlan.length === 0
  ) {
    return null;
  }

  return {
    propertyName: String(data.propertyName || ""),
    location: String(data.location || ""),
    scores,
    headline: String(data.headline),
    summary: String(data.summary),
    aiVisibility: {
      appears: Boolean(av.appears),
      text: av.text,
      currentlyAppearing: av.currentlyAppearing,
    },
    issues,
    positives,
    actionPlan,
  };
}

export async function analyzeWithLlm(
  url: string,
  domain: string,
  signals: LlmInputSignals,
): Promise<LlmAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
  const webSearch = (process.env.OPENROUTER_WEB_SEARCH ?? "true") !== "false";

  const body: Record<string, unknown> = {
    model,
    temperature: 0.4,
    max_tokens: 2200,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUserPrompt(url, domain, signals) },
    ],
  };
  if (webSearch) {
    body.plugins = [{ id: "web", max_results: 5 }];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "AMN GEO Auditor",
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) return null;

    return parseAnalysis(content);
  } catch {
    return null;
  }
}
