import type { Action } from "../agent/planner";
import type { ExecutorResult } from "../agent/executor";
import type { Evaluation } from "../agent/evaluator";

export interface AuditEntry {
  id: string; // crypto.randomUUID()
  runId: string;
  stepIndex: number;

  actionType: string;
  target?: string;
  value?: string;
  reasoning?: string;

  url?: string;
  screenshotBase64?: string; // Consumer should save this to disk and store path in DB

  success?: boolean;
  errorMessage?: string;
  durationMs?: number;

  timestamp: string; // ISO
}

export type LogHandler = (entry: AuditEntry) => Promise<void> | void;

export class AuditLogger {
  private runId: string;
  private onLog: LogHandler;

  constructor(runId: string, onLog: LogHandler) {
    this.runId = runId;
    this.onLog = onLog;
  }

  async logStep(
    stepIndex: number,
    action: Action,
    result: ExecutorResult,
    evaluation: Evaluation,
  ): Promise<void> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      runId: this.runId,
      stepIndex,

      actionType: action.type,
      target: this.extractTarget(action),
      value: this.extractValue(action),
      reasoning: action.reasoning,

      url: result.url,
      screenshotBase64: result.screenshotBase64,

      success: result.success && evaluation.success,
      errorMessage:
        result.error || (evaluation.success ? undefined : evaluation.reasoning),
      durationMs: result.durationMs,

      timestamp: new Date().toISOString(),
    };

    await this.onLog(entry);
  }

  private extractTarget(action: Action): string | undefined {
    switch (action.type) {
      case "navigate":
        return action.url;
      case "click":
      case "type":
      case "extract":
        return action.selector;
      case "evaluate":
        return action.script;
      case "scroll":
        return action.direction;
      default:
        return undefined;
    }
  }

  private extractValue(action: Action): string | undefined {
    if (action.type === "type") return action.value;
    if (action.type === "wait") return action.ms.toString();
    if (action.type === "extract" && (action as any).extractedValue) {
      return (action as any).extractedValue;
    }
    if (action.type === "done") return action.result;
    return undefined;
  }
}
