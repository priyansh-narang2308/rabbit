import { db } from "../db";
import { runs } from "../db/schema";
import { eq } from "drizzle-orm";

export class AuditReportGenerator {
  static async generateJson(runId: string) {
    const run = await db.query.runs.findFirst({
      where: eq(runs.id, runId),
      with: {
        task: true,
        auditEntries: {
          orderBy: (entries, { asc }) => [asc(entries.stepIndex)],
        },
      },
    });

    if (!run) throw new Error("Run not found");
    return run;
  }

  static async generateMarkdown(runId: string): Promise<string> {
    const run = await this.generateJson(runId);
    let md = `# Audit Report: Run ${run.id}\n\n`;
    md += `**Task**: ${run.task.description}\n`;
    md += `**Status**: ${run.status}\n`;
    md += `**Total Steps**: ${run.totalSteps}\n`;
    md += `**Duration**: ${run.durationMs}ms\n\n`;

    if (run.errorMessage) {
      md += `> **Error**: ${run.errorMessage}\n\n`;
    }

    md += `## Timeline\n\n`;

    for (const entry of run.auditEntries) {
      md += `### Step ${entry.stepIndex}: ${entry.actionType}\n`;
      if (entry.target) md += `- **Target**: \`${entry.target}\`\n`;
      if (entry.value) md += `- **Value**: \`${entry.value}\`\n`;
      
      const statusIcon = entry.success ? "✅" : "❌";
      md += `- **Success**: ${statusIcon}\n`;
      
      if (entry.errorMessage) {
        md += `- **Error**: ${entry.errorMessage}\n`;
      }
      
      if (entry.reasoning) {
        md += `- **Agent Reasoning**: *"${entry.reasoning}"*\n`;
      }

      if (entry.screenshotPath) {
        md += `\n![Screenshot Step ${entry.stepIndex}](${entry.screenshotPath})\n`;
      }
      md += `\n---\n\n`;
    }

    return md;
  }
}
