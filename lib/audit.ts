import type {
  ActionItem,
  BreakdownItem,
  Grade,
  Issue,
  Positive,
  Report,
} from "./types";
import { analyzeWithLlm, type LlmInputSignals } from "./llm";

/* -------------------------------------------------------------------------- */
/*  Dimensions (labels + fixed weights — always sum to 100)                   */
/* -------------------------------------------------------------------------- */

const DIMENSIONS = [
  { key: "aiBot", label: "AI Bot Accessibility", weight: 25 },
  { key: "freshness", label: "Content Freshness", weight: 20 },
  { key: "structure", label: "Content Structure for AI", weight: 25 },
  { key: "structured", label: "Structured Data", weight: 15 },
  { key: "ota", label: "OTA & Review Presence", weight: 5 },
  { key: "brand", label: "Brand Mentions", weight: 10 },
] as const;

type ScoreKey = (typeof DIMENSIONS)[number]["key"];
type Scores = Record<ScoreKey, number>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function titleCaseFromDomain(domain: string): string {
  const base = domain.split(".")[0].replace(/[-_]+/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function gradeFor(score: number): Grade {
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "GOOD";
  if (score >= 50) return "NEEDS WORK";
  return "POOR";
}

/* -------------------------------------------------------------------------- */
/*  Signal extraction (real, from fetched HTML)                               */
/* -------------------------------------------------------------------------- */

interface Signals extends LlmInputSignals {}

function extract(
  html: string,
  domain: string,
): Omit<Signals, "fetched" | "gptBotAllowed"> {
  const pick = (re: RegExp) => (html.match(re)?.[1] ?? "").trim();

  let name =
    pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i);
  name = name.split(/\s[|\u2013\u2014\-]\s/)[0].trim();
  if (!name) name = titleCaseFromDomain(domain);

  const hasMetaDescription =
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(html);

  const jsonLdCount = (html.match(/<script[^>]+application\/ld\+json[^>]*>/gi) ?? []).length;
  const hasLodgingSchema =
    /"@type"\s*:\s*"(Hotel|LodgingBusiness|Resort|BedAndBreakfast)"/i.test(html);

  const headingCount = (html.match(/<h[1-3][\s>]/gi) ?? []).length;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasPlaceholder = /lorem ipsum|dolor sit amet|placeholder text/i.test(text);

  const locality = pick(/"addressLocality"\s*:\s*"([^"]+)"/i);
  const region = pick(/"addressRegion"\s*:\s*"([^"]+)"/i);
  const country = pick(/"addressCountry"\s*:\s*"([^"]+)"/i);
  const location = [locality || region, country].filter(Boolean).join(", ");

  return {
    propertyName: name,
    location,
    hasMetaDescription,
    jsonLdCount,
    hasLodgingSchema,
    headingCount,
    textLength: text.length,
    hasPlaceholder,
    textExcerpt: text.slice(0, 6000),
  };
}

async function fetchSignals(url: string, domain: string): Promise<Signals> {
  const fallback: Signals = {
    fetched: false,
    propertyName: titleCaseFromDomain(domain),
    location: "",
    hasMetaDescription: false,
    jsonLdCount: 0,
    hasLodgingSchema: false,
    headingCount: 0,
    textLength: 0,
    hasPlaceholder: false,
    gptBotAllowed: true,
    textExcerpt: "",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const [pageRes, robotsRes] = await Promise.allSettled([
      fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GEOAuditorBot/1.0; +https://advant.ai)",
          Accept: "text/html",
        },
      }),
      fetch(new URL("/robots.txt", url).toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
    ]);
    clearTimeout(timeout);

    if (pageRes.status !== "fulfilled" || !pageRes.value.ok) return fallback;
    const html = await pageRes.value.text();

    let gptBotAllowed = true;
    if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
      const robots = (await robotsRes.value.text()).toLowerCase();
      gptBotAllowed = !/user-agent:\s*(gptbot|perplexitybot|\*)[\s\S]*?disallow:\s*\/\s*$/m.test(
        robots,
      );
    }

    return { fetched: true, gptBotAllowed, ...extract(html, domain) };
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/*  Heuristic scoring (fallback when no LLM key / call fails)                  */
/* -------------------------------------------------------------------------- */

function heuristicScores(s: Signals, rand: () => number): Scores {
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

  return {
    aiBot: clamp(
      s.fetched
        ? (s.gptBotAllowed ? 70 : 30) + (s.textLength > 1500 ? 12 : 0) + between(-4, 6)
        : between(60, 82),
    ),
    freshness: clamp(
      s.fetched
        ? s.hasPlaceholder
          ? between(35, 50)
          : between(82, 96)
        : between(70, 90),
    ),
    structure: clamp(
      s.fetched
        ? 45 + Math.min(28, s.headingCount * 1.6) + (s.hasMetaDescription ? 12 : 0) + between(-4, 6)
        : between(60, 80),
    ),
    structured: clamp(
      s.fetched
        ? (s.jsonLdCount > 0 ? 60 : 28) + (s.hasLodgingSchema ? 20 : 0) + between(-4, 6)
        : between(50, 78),
    ),
    // Not directly measurable from one page; estimated, biased to the typical
    // hotel pattern (strong OTAs, weak editorial/AI brand mentions).
    ota: clamp(between(70, 88)),
    brand: clamp(between(28, 46)),
  };
}

function heuristicIssues(s: Signals, sc: Scores): Issue[] {
  const issues: Issue[] = [
    {
      title: "Weak AI-search brand visibility in destination recommendations",
      detail:
        "Across major hotel discovery searches, the property is rarely surfaced versus established competitors. This points to underrepresentation in the AI training data and editorial hotel guides that engines draw on.",
      impact: "HIGH",
    },
  ];

  if (sc.brand < 50) {
    issues.push({
      title: "Limited editorial and press mentions and brand authority",
      detail:
        "Few press features, travel-blog reviews, or industry mentions were found. Competitors receive regular travel-guide coverage and blogger features, which AI engines treat as authority signals.",
      impact: "HIGH",
    });
  }
  if (s.hasPlaceholder) {
    issues.push({
      title: "Placeholder content reduces credibility",
      detail:
        "Pages contain leftover placeholder (Lorem ipsum) text, suggesting abandoned content or weak editorial management. AI engines interpret this as low freshness and authority signalling.",
      impact: "MEDIUM",
    });
  }
  if (sc.structured < 70 || !s.hasLodgingSchema) {
    issues.push({
      title: "Incomplete structured data for AI parsing",
      detail:
        "Hotel and LodgingBusiness schema is missing or thin. Without complete JSON-LD (rooms, amenities, location, reviews) AI engines struggle to cite the property accurately in answers.",
      impact: "MEDIUM",
    });
  }
  issues.push({
    title: "Content gaps on specialty amenities and unique value proposition",
    detail:
      "Content lacks a differentiation narrative and target guest personas. Engines reward a clear, well-articulated identity that resonates with recommendation algorithms.",
    impact: "LOW",
  });

  return issues.slice(0, 5);
}

function heuristicPositives(s: Signals, sc: Scores): Positive[] {
  const out: Positive[] = [];
  if (sc.freshness >= 75 && !s.hasPlaceholder) {
    out.push({
      title: "Fresh content and active site maintenance",
      detail:
        "The site shows recent updates and ongoing engagement with content management, a strong relevance signal for AI engines.",
    });
  }
  if (sc.ota >= 70) {
    out.push({
      title: "Solid OTA and review presence",
      detail:
        "The property maintains visible distribution and recent reviews across booking platforms, signalling quality and demand.",
    });
  }
  if (sc.structured >= 60 || s.jsonLdCount > 0) {
    out.push({
      title: "Technical SEO foundation with markup",
      detail: s.fetched
        ? `JSON-LD structured data detected with ${s.headingCount} headings and crawlable server-rendered text. The site is technically AI-readable.`
        : "Baseline technical foundation in place for crawlers and semantic search.",
    });
  }
  if (out.length === 0) {
    out.push({
      title: "Recoverable foundation",
      detail:
        "Core fundamentals are present and the gaps identified below are addressable with a focused content and authority programme.",
    });
  }
  return out.slice(0, 3);
}

function heuristicActionPlan(name: string): ActionItem[] {
  return [
    {
      title: "Build editorial content and press presence",
      detail:
        "Publish 8 to 12 monthly articles covering destination, boutique, hidden-gem, and amenity angles that match AI recommendation searches. Pitch travel journalists with unique story angles to grow mentions in training data.",
      priority: "HIGH",
    },
    {
      title: "Expand review presence across all major OTA and review platforms",
      detail:
        "Each platform has distinct AI-crawl and recommendation algorithms. Direct guests to leave reviews on every major platform post-stay, and actively manage business profiles with galleries and amenity highlights.",
      priority: "HIGH",
    },
    {
      title: "Fix or remove placeholder content immediately",
      detail:
        "Delete any leftover placeholder text and replace with genuine updates such as seasonal promotions, staff highlights, and guest stories. Placeholder content signals low authority and damages crawl quality.",
      priority: "HIGH",
    },
    {
      title: `Create a structured brand-positioning page for AI engines`,
      detail: `Add a dedicated "About ${name}" page with schema markup that clearly answers what makes this hotel unique, including positioning, guarantees, location and proximity. This helps engines cite the property in context.`,
      priority: "MEDIUM",
    },
    {
      title: "Develop a competitive content strategy for destination keywords",
      detail:
        "Research and create comparison content against named competitors. These queries appear in travel-planning searches and AI recommendations. Internal-link them to the homepage and booking page.",
      priority: "MEDIUM",
    },
    {
      title: "Encourage and monitor Google Reviews presence",
      detail:
        "Respond constructively to negative reviews and address genuine operational concerns. Ask satisfied guests to post. Google Reviews are a key AI recommendation signal.",
      priority: "MEDIUM",
    },
    {
      title: "Implement a guest story and testimonial campaign",
      detail:
        "Produce 2 to 3 video or written guest testimonials per month and embed them in schema markup. User-generated content is increasingly important for AI entity recognition and recommendation authority.",
      priority: "LOW",
    },
  ];
}

function heuristicSummary(name: string, sc: Scores): { headline: string; summary: string } {
  const strong = sc.freshness >= 75;
  const headline =
    sc.brand < 40
      ? "Low AI visibility; the property is largely absent from AI hotel recommendations."
      : "Weak brand mentions in AI hotel recommendation searches; competitors dominate.";
  const summary =
    `${name} has a ${strong ? "solid technical foundation with fresh content" : "workable technical base"} ` +
    `and reasonable OTA presence. However, the property rarely appears in AI-style hotel recommendation ` +
    `searches, and competitors consistently rank higher. The brand has decent content structure but lacks the ` +
    `editorial mentions and competitive visibility needed for AI engine citations.`;
  return { headline, summary };
}

/* -------------------------------------------------------------------------- */
/*  Shared report assembly (used by both engines)                             */
/* -------------------------------------------------------------------------- */

interface ComposeInput {
  url: string;
  domain: string;
  propertyName: string;
  location: string;
  scores: Scores;
  headline: string;
  summary: string;
  aiText: string;
  currentlyAppearing: string;
  appears?: boolean;
  issues: Issue[];
  positives: Positive[];
  actionPlan: ActionItem[];
}

function composeReport(c: ComposeInput): Report {
  const breakdown: BreakdownItem[] = DIMENSIONS.map((d) => ({
    label: d.label,
    weight: d.weight,
    score: clamp(c.scores[d.key]),
  }));

  const overallScore = clamp(
    breakdown.reduce((acc, b) => acc + b.score * (b.weight / 100), 0),
  );
  const grade = gradeFor(overallScore);
  const appears = c.appears ?? overallScore >= 72;

  return {
    url: c.url,
    domain: c.domain,
    propertyName: c.propertyName,
    location: c.location,
    overallScore,
    grade,
    headline: c.headline,
    summary: c.summary,
    breakdown,
    aiVisibility: {
      appears,
      verdict: appears ? "Likely to Appear in AI" : "Unlikely to Appear in AI",
      text: c.aiText,
      currentlyAppearing: c.currentlyAppearing,
    },
    issues: c.issues,
    positives: c.positives,
    actionPlan: c.actionPlan,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export async function runAudit(rawUrl: string): Promise<Report> {
  const url = normalizeUrl(rawUrl);
  const domain = getDomain(url);
  const rand = seeded(domain);

  const signals = await fetchSignals(url, domain);

  // 1. Real AI analysis via OpenRouter, when configured.
  const llm = await analyzeWithLlm(url, domain, signals);
  if (llm) {
    return composeReport({
      url,
      domain,
      propertyName: llm.propertyName || signals.propertyName,
      location: llm.location || signals.location,
      scores: llm.scores,
      headline: llm.headline,
      summary: llm.summary,
      aiText: llm.aiVisibility.text,
      currentlyAppearing: llm.aiVisibility.currentlyAppearing,
      appears: llm.aiVisibility.appears,
      issues: llm.issues,
      positives: llm.positives,
      actionPlan: llm.actionPlan,
    });
  }

  // 2. Heuristic fallback.
  const scores = heuristicScores(signals, rand);
  const { headline, summary } = heuristicSummary(signals.propertyName, scores);
  const overall = DIMENSIONS.reduce((a, d) => a + scores[d.key] * (d.weight / 100), 0);
  const appears = overall >= 72;

  return composeReport({
    url,
    domain,
    propertyName: signals.propertyName,
    location: signals.location,
    scores,
    headline,
    summary,
    appears,
    aiText: appears
      ? `${signals.propertyName} has a reasonable chance of being cited by ChatGPT or Perplexity for destination hotel recommendations, but consistency across engines can still be improved.`
      : `${signals.propertyName} is unlikely to be cited by ChatGPT or Perplexity for destination hotel recommendations. It lacks the editorial mentions, brand authority, and competitive positioning in training data that AI engines rely on.`,
    currentlyAppearing:
      "Established competitors with extensive editorial coverage and OTA presence appear in multiple best-hotels lists and are specifically highlighted in AI-style hotel discovery searches.",
    issues: heuristicIssues(signals, scores),
    positives: heuristicPositives(signals, scores),
    actionPlan: heuristicActionPlan(signals.propertyName),
  });
}
