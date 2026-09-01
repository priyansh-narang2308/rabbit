import { MultiEnvOrchestrator } from "../agent/multi-env-orchestrator";
import { type LogHandler } from "../audit/trail";

export interface CompetitorSite {
  /** Display name of the competitor, e.g. "Competitor A". */
  name: string;
  /** Full URL of the pricing page, e.g. "https://competitor-a.com/pricing". */
  url: string;
  /** ISO country code for the geo-proxy to use when browsing this site. */
  proxyCountry: string;
}

export interface PricingResearchConfig {
  /** Product or market being researched, e.g. "cloud storage plans". */
  subject: string;
  /** The list of competitor sites to browse, each with its own geo-proxy. */
  competitors: CompetitorSite[];
  /**
   * Optional hint about the shape of the extracted data. When omitted, the
   * generated task instructs the agent to extract plan name / price / features.
   */
  fields?: string[];
  maxStepsPerPhase?: number;
}

export interface PricingResearchResult {
  plan: any;
  phaseResults: Array<{
    phase: number;
    environment: string;
    objective: string;
    result: string;
    durationMs: number;
  }>;
  finalResult: string;
}

const DEFAULT_FIELDS = [
  "plan name",
  "monthly price",
  "annual price",
  "key features",
];

function buildTask(config: PricingResearchConfig): string {
  const fields = config.fields?.length ? config.fields : DEFAULT_FIELDS;
  const siteList = config.competitors
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} at ${c.url} — browse using a proxy located in ${c.proxyCountry.toUpperCase()}`,
    )
    .join("\n");

  return [
    `Research competitor pricing for ${config.subject}.`,
    ``,
    `Browse the following competitor pricing pages, each from a different geographic region:`,
    ``,
    siteList,
    ``,
    `For each competitor, extract the following pricing data: ${fields.join(", ")}.`,
    ``,
    `After collecting data from all competitors, send it to a sandbox environment and generate a structured comparison table (markdown or JSON) covering every competitor. The final result must be the comparison table itself.`,
  ].join("\n");
}

export class PricingResearchDemo {
  private config: PricingResearchConfig;

  constructor(config: PricingResearchConfig) {
    if (!config.competitors.length) {
      throw new Error("PricingResearchDemo requires at least one competitor.");
    }
    this.config = config;
  }

  async run(options: {
    runId: string;
    onLog: LogHandler;
    stealth?: boolean;
    captcha?: boolean;
    recording?: boolean;
    maxStepsPerPhase?: number;
  }): Promise<PricingResearchResult> {
    // Build a per-phase proxy map keyed by phase index. The MultiEnvPlanner
    // typically emits one browser phase per competitor in order, followed by a
    // sandbox phase. We map proxies onto the browser phases by index.
    const perPhaseProxyCountry: Record<number, string> = {};
    let browserPhase = 0;
    for (let i = 0; i < this.config.competitors.length; i++) {
      perPhaseProxyCountry[i] = this.config.competitors[i].proxyCountry;
      browserPhase++;
    }

    const orchestrator = new MultiEnvOrchestrator({
      task: buildTask(this.config),
      runId: options.runId,
      maxStepsPerPhase: options.maxStepsPerPhase,
      onLog: options.onLog,
      browserLaunchOptions: {
        stealth: options.stealth ?? true,
        captcha: options.captcha ?? true,
        recording: options.recording ?? true,
      },
      perPhaseProxyCountry,
    });

    const result = await orchestrator.run();

    return {
      plan: result.plan,
      phaseResults: result.phaseResults,
      finalResult: result.finalResult,
    };
  }
}
