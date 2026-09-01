import { AgentOrchestrator } from "../agent/orchestrator";
import { BrowserManager } from "../solari/browser-manager";
import { type LogHandler } from "../audit/trail";

export interface FormField {
  /** CSS selector or label of the field. */
  selector: string;
  /** Human-readable label for this field (used in audit trail). */
  label: string;
  /** Value to fill into the field. */
  value: string;
}

export interface FormStep {
  /** A human-readable name for this step, e.g. "Personal Information". */
  name: string;
  /** The URL of the page (only needed for the first step or if the form navigates). */
  url?: string;
  /** Fields to fill in this step. */
  fields: FormField[];
  /** Optional selector for the "Next" / "Submit" button at the end of this step. */
  submitSelector?: string;
}

export interface FormAutofillConfig {
  /** Display name of the form, e.g. "Job Application Form". */
  formName: string;
  /** The starting URL of the form. */
  startUrl: string;
  /** Ordered list of form steps. Each step contains the fields to fill. */
  steps: FormStep[];
  /** Proxy country code for the browser session. */
  proxyCountry?: string;
  /** Maximum agent steps per form step. */
  maxStepsPerStep?: number;
}

export interface FormAutofillResult {
  /** The full audit-ready task description that was sent to the agent. */
  taskDescription: string;
  /** Result string returned by the orchestrator. */
  result: string;
  /** Duration in ms. */
  durationMs: number;
}

function buildTask(config: FormAutofillConfig): string {
  const stepDescriptions = config.steps
    .map((step, i) => {
      const fieldList = step.fields
        .map((f) => `  - "${f.label}" → "${f.value}"`)
        .join("\n");
      const submitNote = step.submitSelector
        ? `After filling all fields, click the submit/next button ("${step.submitSelector}").`
        : `After filling all fields, click the submit or next button.`;
      return [
        `Step ${i + 1}: ${step.name}`,
        step.url ? `Navigate to: ${step.url}` : "",
        `Fill the following fields:`,
        fieldList,
        submitNote,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `Fill and submit a web form: "${config.formName}"`,
    ``,
    `Navigate to ${config.startUrl} and complete the following multi-step form.`,
    `Handle any captchas that appear. Record every field value in the audit trail.`,
    ``,
    stepDescriptions,
    ``,
    `After the final submission, verify that the form was submitted successfully by looking for a confirmation message or page. Report the confirmation text as the final result.`,
  ].join("\n");
}

/**
 * FormAutofillDemo orchestrates a browser agent to navigate to a multi-step
 * web form, fill every field from a pre-defined spec, handle captchas, and
 * submit. The full audit trail records every field value and every click,
 * providing a complete evidence chain of what was entered.
 */
export class FormAutofillDemo {
  private config: FormAutofillConfig;

  constructor(config: FormAutofillConfig) {
    if (!config.steps.length) {
      throw new Error("FormAutofillDemo requires at least one form step.");
    }
    if (!config.startUrl) {
      throw new Error("FormAutofillDemo requires a startUrl.");
    }
    this.config = config;
  }

  /**
   * Build the natural-language task description that describes this form
   * fill scenario. Useful for the server to store in the tasks table.
   */
  getTaskDescription(): string {
    return buildTask(this.config);
  }

  async run(options: {
    runId: string;
    onLog: LogHandler;
    stealth?: boolean;
    captcha?: boolean;
    recording?: boolean;
    maxSteps?: number;
  }): Promise<FormAutofillResult> {
    const taskDescription = buildTask(this.config);
    const totalFields = this.config.steps.reduce(
      (acc, s) => acc + s.fields.length,
      0,
    );
    // Budget roughly 5 agent steps per form field + 10 for navigation/submission
    const defaultMaxSteps = Math.max(totalFields * 5 + 10, 30);

    const browserManager = new BrowserManager();

    const start = Date.now();
    try {
      const { browser, sessionId } = await browserManager.launchSession({
        proxyCountry: this.config.proxyCountry,
        stealth: options.stealth ?? true,
        captcha: options.captcha ?? true,
        recording: options.recording ?? true,
      });

      const page = await browser.newPage();

      const orchestrator = new AgentOrchestrator(page as any, {
        task: taskDescription,
        runId: options.runId,
        maxSteps: options.maxSteps ?? defaultMaxSteps,
        onLog: options.onLog,
      });

      const result = await orchestrator.run();
      const durationMs = Date.now() - start;

      return { taskDescription, result, durationMs };
    } finally {
      await browserManager.cleanup();
    }
  }
}
