export type Impact = "HIGH" | "MEDIUM" | "LOW";
export type Grade = "EXCELLENT" | "GOOD" | "NEEDS WORK" | "POOR";

export interface BreakdownItem {
  label: string;
  score: number; // 0-100
  weight: number; // percentage contribution to overall
}

export interface Issue {
  title: string;
  detail: string;
  impact: Impact;
}

export interface Positive {
  title: string;
  detail: string;
}

export interface ActionItem {
  title: string;
  detail: string;
  priority: Impact;
}

export interface Report {
  url: string;
  domain: string;
  propertyName: string;
  location: string;
  overallScore: number;
  grade: Grade;
  headline: string;
  summary: string;
  breakdown: BreakdownItem[];
  aiVisibility: {
    appears: boolean;
    verdict: string; // badge text
    text: string;
    currentlyAppearing: string;
  };
  issues: Issue[];
  positives: Positive[];
  actionPlan: ActionItem[];
}
