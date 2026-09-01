import type { AuditEntry } from "./trail";

export interface EvidenceItem {
  timestamp: string;
  type: "decision" | "action" | "error";
  description: string;
  screenshotBase64?: string;
}

export class EvidenceCollector {
  static extract(entries: AuditEntry[]): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    for (const entry of entries) {
      if (entry.errorMessage || !entry.success) {
        evidence.push({
          timestamp: entry.timestamp,
          type: "error",
          description: `Error during ${entry.actionType}: ${entry.errorMessage || "Validation failed"}`,
          screenshotBase64: entry.screenshotBase64,
        });
      } else if (entry.actionType === "done") {
        evidence.push({
          timestamp: entry.timestamp,
          type: "decision",
          description: `Task completed successfully: ${entry.value || ""}`,
          screenshotBase64: entry.screenshotBase64,
        });
      } else {
        evidence.push({
          timestamp: entry.timestamp,
          type: "action",
          description: `Performed ${entry.actionType} ${entry.target ? `on ${entry.target}` : ""}`,
          screenshotBase64: entry.screenshotBase64,
        });
      }
    }

    return evidence;
  }
}
